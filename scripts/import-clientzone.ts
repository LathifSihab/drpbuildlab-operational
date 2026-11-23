// Imports the client zone's partners and quotes into DRP Operational as clients and projects.
//
//   npm run import:clientzone                          dry run against DATABASE_URL (dev)
//   npm run import:clientzone -- --apply               write to DATABASE_URL (dev)
//   npm run import:clientzone -- --target production   dry run against DATABASE_URL_PRODUCTION
//   ... --skip Q-2026-AAAAAA,Q-2026-BBBBBB             leave these quotes out
//
// Reads CLIENTZONE_DATABASE_URL in a read-only transaction; nothing in the client zone changes.
// A dry run does every write in a transaction and rolls it back, so it checks the real database.
// Safe to run again: each imported row's audit entry carries `importedFrom`, and a source row
// already imported is skipped, even if it was edited or deleted in Ops since. Edits made in Ops
// are never overwritten. Mapping rules: scripts/clientzone/map.ts; docs/SETUP.md, Client zone import.
import { and, arrayOverlaps, eq, isNotNull, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema.ts';
import { auditLog, clients, projects } from '../src/lib/server/db/schema.ts';
import { uniqueSlug } from '../src/lib/server/projects.ts';
import {
	clientName,
	isImportablePartner,
	partnerClient,
	partnerRef,
	projectTitles,
	quoteClient,
	quoteProject,
	quoteRef,
	skipReason,
	type CzPartner,
	type CzQuote
} from './clientzone/map.ts';

const ACTOR = 'system:clientzone-import';
const VIA = 'client zone import';

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(name);
	return i === -1 ? undefined : process.argv[i + 1];
}
const apply = process.argv.includes('--apply');
const target = arg('--target') ?? 'dev';
if (target !== 'dev' && target !== 'production') throw new Error('--target is dev or production');
const skipRefs = new Set(
	(arg('--skip') ?? '')
		.split(',')
		.map((r) => r.trim().toUpperCase())
		.filter(Boolean)
);

const sourceUrl = process.env.CLIENTZONE_DATABASE_URL;
const targetUrl =
	target === 'production' ? process.env.DATABASE_URL_PRODUCTION : process.env.DATABASE_URL;
if (!sourceUrl) throw new Error('Set CLIENTZONE_DATABASE_URL (the client zone database)');
if (!targetUrl) {
	throw new Error(`Set ${target === 'production' ? 'DATABASE_URL_PRODUCTION' : 'DATABASE_URL'}`);
}

class DryRun extends Error {}

const source = postgres(sourceUrl, { max: 1 });
const targetClient = postgres(targetUrl, { max: 1 });
const db = drizzle(targetClient, { schema });
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function readClientZone() {
	return source.begin('read only', async (sql) => {
		const partners = await sql<CzPartner[]>`
			select id, code, name, email, status from partner order by created_at`;
		const quotes = await sql<CzQuote[]>`
			select q.id, q.reference, q.client_name, q.client_email, q.client_type,
			       q.client_company_number, q.title, q.lines, q.total_due, q.status, q.label,
			       q.billing, q.issued_at, q.paid_at, q.partner_id, q.partner_code,
			       l.voornaam as lead_first_name, l.achternaam as lead_last_name,
			       l.telefoon as lead_phone
			from quote q left join lead l on l.id = q.lead_id
			order by q.created_at`;
		return { partners, quotes };
	});
}

/** importedFrom -> Ops entity id, from earlier runs' audit entries. */
async function importedSoFar(tx: Tx): Promise<Map<string, number>> {
	const rows = await tx
		.select({ ref: sql<string>`${auditLog.diff}->>'importedFrom'`, entityId: auditLog.entityId })
		.from(auditLog)
		.where(
			and(
				or(eq(auditLog.action, 'client.created'), eq(auditLog.action, 'project.created')),
				isNotNull(sql`${auditLog.diff}->>'importedFrom'`)
			)
		);
	return new Map(rows.map((r) => [r.ref, Number(r.entityId)]));
}

async function findClient(tx: Tx, name: string, isPartner: boolean) {
	const [row] = await tx
		.select({ id: clients.id })
		.from(clients)
		.where(and(sql`lower(${clients.name}) = lower(${name})`, eq(clients.isPartner, isPartner)))
		.limit(1);
	return row?.id ?? null;
}

/** Drops domains another client already has: intake matches a sender's domain to one client. */
async function freeDomains(tx: Tx, domains: string[]): Promise<string[]> {
	if (domains.length === 0) return [];
	const taken = await tx
		.select({ emailDomains: clients.emailDomains })
		.from(clients)
		.where(arrayOverlaps(clients.emailDomains, domains));
	const used = new Set(taken.flatMap((r) => r.emailDomains));
	return domains.filter((d) => !used.has(d));
}

async function createClient(tx: Tx, values: ReturnType<typeof partnerClient>, ref?: string) {
	const row = { ...values, emailDomains: await freeDomains(tx, values.emailDomains) };
	const [created] = await tx.insert(clients).values(row).returning({ id: clients.id });
	await tx.insert(auditLog).values({
		actor: ACTOR,
		action: 'client.created',
		entity: 'client',
		entityId: String(created.id),
		diff: { ...row, via: VIA, ...(ref && { importedFrom: ref }) }
	});
	return created.id;
}

type Report = { section: string; ref: string; name: string; result: string }[];

async function run(tx: Tx, partners: CzPartner[], quotes: CzQuote[]): Promise<Report> {
	const report: Report = [];
	const done = await importedSoFar(tx);
	// Client zone partner id -> Ops client id, for the projects' partner.
	const partnerIds = new Map<string, number>();

	for (const p of partners) {
		const ref = partnerRef(p);
		const name = partnerClient(p).name;
		const known = done.get(ref);
		if (known !== undefined) {
			// Deleted in Ops since (e.g. a test partner): stays deleted, and its quotes get no partner.
			const [still] = await tx
				.select({ id: clients.id })
				.from(clients)
				.where(eq(clients.id, known))
				.limit(1);
			if (still) partnerIds.set(p.id, known);
			const result = still ? 'already imported' : 'already imported, deleted in Ops since';
			report.push({ section: 'partner', ref, name, result });
			continue;
		}
		if (!isImportablePartner(p)) {
			report.push({ section: 'partner', ref, name, result: `skipped: ${p.status}` });
			continue;
		}
		const existing = await findClient(tx, name, true);
		if (existing !== null) {
			partnerIds.set(p.id, existing);
			report.push({ section: 'partner', ref, name, result: `uses existing partner #${existing}` });
			continue;
		}
		const id = await createClient(tx, partnerClient(p), ref);
		partnerIds.set(p.id, id);
		report.push({ section: 'partner', ref, name, result: `created partner #${id}` });
	}

	const toImport: CzQuote[] = [];
	for (const q of quotes) {
		const ref = quoteRef(q);
		const reason = done.has(ref) ? 'already imported' : skipReason(q, skipRefs);
		if (reason) report.push({ section: 'quote', ref, name: clientName(q), result: reason });
		else toImport.push(q);
	}

	const titles = projectTitles(toImport);
	// Ops client id per client name (lowercase), so one client gets all its quotes.
	const clientIds = new Map<string, number>();
	for (const q of toImport) {
		const key = clientName(q).toLowerCase();
		let clientId = clientIds.get(key);
		let clientNote = '';
		if (clientId === undefined) {
			const existing = await findClient(tx, clientName(q), false);
			if (existing !== null) {
				clientId = existing;
				clientNote = `existing client #${existing}`;
			} else {
				const all = toImport.filter((o) => clientName(o).toLowerCase() === key);
				clientId = await createClient(tx, quoteClient(all));
				clientNote = `new client #${clientId}`;
			}
			clientIds.set(key, clientId);
		}

		const values = quoteProject(q, titles.get(q.reference) ?? clientName(q));
		const row = {
			...values,
			clientId,
			partnerId: q.partner_id ? (partnerIds.get(q.partner_id) ?? null) : null
		};
		const [created] = await tx
			.insert(projects)
			.values({ ...row, slug: await uniqueSlug(tx, row.title) })
			.returning({ id: projects.id });
		await tx.insert(auditLog).values({
			actor: ACTOR,
			action: 'project.created',
			entity: 'project',
			entityId: String(created.id),
			diff: { ...row, via: VIA, importedFrom: quoteRef(q) }
		});
		report.push({
			section: 'quote',
			ref: quoteRef(q),
			name: row.title,
			result: `project #${created.id}, ${row.phase}${clientNote ? `, ${clientNote}` : ''}${
				row.partnerId ? `, partner #${row.partnerId}` : ''
			}`
		});
	}
	return report;
}

try {
	const { partners, quotes } = await readClientZone();
	let report: Report = [];
	try {
		await db.transaction(async (tx) => {
			report = await run(tx, partners, quotes);
			if (!apply) throw new DryRun();
		});
	} catch (e) {
		if (!(e instanceof DryRun)) throw e;
	}
	console.log(`${apply ? 'IMPORTED' : 'DRY RUN (nothing written)'} into ${target}\n`);
	for (const r of report)
		console.log(
			`${r.section.padEnd(8)} ${r.ref.padEnd(44)} ${r.name}\n${' '.repeat(9)}-> ${r.result}`
		);
	const count = (re: RegExp) => report.filter((r) => re.test(r.result)).length;
	console.log(
		`\n${apply ? 'Created' : 'Would create'}: ${count(/created partner/)} partner(s), ` +
			`${count(/new client/)} client(s), ${count(/^project #/)} project(s).`
	);
	if (!apply) console.log('Run again with --apply to write them.');
} finally {
	await Promise.all([source.end({ timeout: 5 }), targetClient.end({ timeout: 5 })]);
}
