import { and, arrayOverlaps, eq, ne, or, sql } from 'drizzle-orm';
import type { ClientInput, Contact } from '../schemas/client.ts';
import type { Db } from './db/index.ts';
import { auditLog, clients, projects, type Client, type Role } from './db/schema.ts';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type DbOrTx = Db | Tx;

/** Same as projects: everyone manages clients; only admin deletes. */
export const canEditClients = (role: Role) =>
	role === 'admin' || role === 'dev' || role === 'business';
export const canDeleteClients = (role: Role) => role === 'admin';
/** Contacts and notes are personal data: admin and dev only (ARCHITECTURE.md, data model). */
export const canSeeClientPersonalData = (role: Role) => role === 'admin' || role === 'dev';

export const PERSONAL_FIELDS = ['contacts', 'notes'] as const;
export const HIDDEN = '(hidden)';

/** Contacts with a fixed key order and no empty keys, so stored and new lists compare equal. */
export function normalizeContacts(list: readonly Contact[]): Contact[] {
	return list.map((c) => ({
		name: c.name,
		...(c.email ? { email: c.email } : {}),
		...(c.phone ? { phone: c.phone } : {}),
		...(c.role ? { role: c.role } : {})
	}));
}

/**
 * The columns a person can set through the form. Without access to personal data the contacts
 * and notes are left out entirely, so a save by a business user never overwrites them.
 */
export function clientValues(input: ClientInput, includePersonal: boolean) {
	const base = {
		name: input.name,
		isPartner: input.kind === 'partner',
		emailDomains: input.emailDomains
	};
	return includePersonal
		? { ...base, contacts: normalizeContacts(input.contacts), notes: input.notes }
		: base;
}
export type ClientValues = ReturnType<typeof clientValues>;

/** Fields that changed, as { field: { from, to } }, for the audit log. */
export function diffClient(before: Client, after: ClientValues) {
	const changes: Record<string, { from: unknown; to: unknown }> = {};
	// Only the keys `after` has: without personal-data access, contacts and notes are absent.
	const next: Partial<Record<keyof Client, unknown>> = after;
	for (const key of Object.keys(after) as (keyof Client)[]) {
		const a = key === 'contacts' ? normalizeContacts(before.contacts) : before[key];
		const b = next[key];
		if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null))
			changes[key] = { from: a ?? null, to: b ?? null };
	}
	return changes;
}

/** An audit diff with contacts and notes masked, for people without access to personal data. */
export function hidePersonalData(diff: Record<string, unknown> | null) {
	if (!diff) return diff;
	const out = { ...diff };
	for (const key of PERSONAL_FIELDS) {
		if (!(key in out)) continue;
		const v = out[key];
		out[key] =
			v !== null && typeof v === 'object' && 'from' in v && 'to' in v
				? { from: HIDDEN, to: HIDDEN }
				: HIDDEN;
	}
	return out;
}

/**
 * Checks that need the database: no other client of the same kind with this name, and no email
 * domain shared with another client (intake must match a sender to one client only).
 * Returns form errors, empty when all is well.
 */
export async function clientConflicts(
	db: DbOrTx,
	values: ClientValues,
	excludeId: number | null
): Promise<Record<string, string[]>> {
	const notSelf = excludeId === null ? undefined : ne(clients.id, excludeId);
	const [sameName, sharedDomains] = await Promise.all([
		db
			.select({ id: clients.id })
			.from(clients)
			.where(
				and(
					sql`lower(${clients.name}) = lower(${values.name})`,
					eq(clients.isPartner, values.isPartner),
					notSelf
				)
			)
			.limit(1),
		values.emailDomains.length
			? db
					.select({ name: clients.name, emailDomains: clients.emailDomains })
					.from(clients)
					.where(and(arrayOverlaps(clients.emailDomains, values.emailDomains), notSelf))
			: Promise.resolve([])
	]);

	const errors: Record<string, string[]> = {};
	if (sameName.length) {
		errors.name = [`A ${values.isPartner ? 'partner' : 'client'} with this name already exists`];
	}
	const domainErrors = sharedDomains.flatMap((other) =>
		other.emailDomains
			.filter((d) => values.emailDomains.includes(d))
			.map((d) => `“${d}” already belongs to ${other.name}`)
	);
	if (domainErrors.length) errors.emailDomains = domainErrors;
	return errors;
}

/** How many projects (deleted ones included) use this client, as end client and as partner. */
export async function clientUsage(db: DbOrTx, id: number) {
	const [row] = await db
		.select({
			asClient: sql<number>`count(*) filter (where ${projects.clientId} = ${id})::int`,
			asPartner: sql<number>`count(*) filter (where ${projects.partnerId} = ${id})::int`
		})
		.from(projects)
		.where(or(eq(projects.clientId, id), eq(projects.partnerId, id)));
	return { asClient: row?.asClient ?? 0, asPartner: row?.asPartner ?? 0 };
}

export async function auditClient(
	db: DbOrTx,
	actor: string,
	action: 'client.created' | 'client.updated' | 'client.deleted',
	clientId: number,
	diff: Record<string, unknown> | null
) {
	await db
		.insert(auditLog)
		.values({ actor, action, entity: 'client', entityId: String(clientId), diff });
}
