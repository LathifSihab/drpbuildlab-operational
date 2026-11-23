// Client zone rows -> DRP Operational rows, for scripts/import-clientzone.ts. Pure: no database.
// The client zone schema is in ../drp-buildlab-clientzone/db/schema.sql.
import { DRP_DOMAINS, SHARED_MAIL_DOMAINS, type Contact } from '../../src/lib/schemas/client.ts';
import type { PROJECT_PHASES } from '../../src/lib/schemas/project.ts';

type ProjectPhase = (typeof PROJECT_PHASES)[number];

export type CzPartner = {
	id: string;
	code: string | null;
	name: string;
	email: string;
	status: string;
};

export type CzQuote = {
	id: string;
	reference: string;
	client_name: string;
	client_email: string | null;
	client_type: 'private' | 'business' | null;
	client_company_number: string | null;
	title: string | null;
	lines: { name?: string; detail?: string; amount?: number }[] | null;
	total_due: number | null;
	status: string;
	label: string | null;
	billing: string;
	issued_at: Date | string | null;
	paid_at: Date | string | null;
	partner_id: string | null;
	partner_code: string | null;
	// From the quote's lead, when it has one.
	lead_first_name: string | null;
	lead_last_name: string | null;
	lead_phone: string | null;
};

/** The `importedFrom` value an imported row's audit entry carries; a re-run skips it. */
export const partnerRef = (p: CzPartner) => `clientzone:partner:${p.id}`;
export const quoteRef = (q: CzQuote) => `clientzone:quote:${q.reference}`;

const tidy = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/**
 * Why a quote is not imported, or null to import it. Cancelled quotes and quotes labelled
 * "outdated" (the client zone's mark for test data) are skipped, and so is anything named a test.
 */
export function skipReason(q: CzQuote, skipRefs: ReadonlySet<string> = new Set()): string | null {
	if (skipRefs.has(q.reference.toUpperCase())) return 'skipped with --skip';
	if (q.status === 'cancelled') return 'cancelled';
	if (q.status === 'draft') return 'draft';
	if (q.label === 'outdated') return 'labelled outdated (test data)';
	if (/\btest\b/i.test(`${q.client_name} ${q.title ?? ''}`)) return 'named as a test';
	return null;
}

/** The project phase a quote's status stands for. */
export function phaseFor(q: Pick<CzQuote, 'status'>): ProjectPhase {
	switch (q.status) {
		case 'paid':
		case 'accepted':
			return 'build';
		case 'ended':
			return 'closed';
		case 'expired':
		case 'cancelled':
			return 'lost';
		default:
			return 'proposal';
	}
}

/** Only active partners are imported; pending, rejected and suspended ones are not partners yet. */
export const isImportablePartner = (p: CzPartner) => p.status === 'active';

export function partnerClient(p: CzPartner) {
	const name = tidy(p.name);
	return {
		name,
		isPartner: true,
		contacts: [{ name, email: p.email.trim().toLowerCase(), role: 'Partner' }] as Contact[],
		emailDomains: [] as string[],
		notes: `Client zone partner${p.code ? `, code ${p.code}` : ''}.`
	};
}

export const clientName = (q: Pick<CzQuote, 'client_name'>) => tidy(q.client_name);

/** The domain of a business client's email, unless anyone can sign up for it (gmail.com, ...). */
export function businessDomain(q: Pick<CzQuote, 'client_type' | 'client_email'>): string | null {
	if (q.client_type !== 'business' || !q.client_email) return null;
	const domain = q.client_email.trim().toLowerCase().split('@')[1];
	if (!domain || SHARED_MAIL_DOMAINS.has(domain) || DRP_DOMAINS.has(domain)) return null;
	return domain;
}

/**
 * One Ops client from all the importable quotes of that client (same name, ignoring case):
 * contacts merged by email, the business email domain for intake, company number in the notes.
 */
export function quoteClient(quotes: readonly CzQuote[]) {
	const name = clientName(quotes[0]);
	const contacts: Contact[] = [];
	const domains = new Set<string>();
	const companyNumbers = new Set<string>();
	for (const q of quotes) {
		const email = q.client_email?.trim().toLowerCase() || undefined;
		const person = tidy(`${q.lead_first_name ?? ''} ${q.lead_last_name ?? ''}`) || name;
		const phone = tidy(q.lead_phone) || undefined;
		const same = contacts.find((c) => (email ? c.email === email : c.name === person));
		if (same) same.phone ??= phone;
		else if (email || phone) contacts.push({ name: person, email, phone });
		const domain = businessDomain(q);
		if (domain) domains.add(domain);
		if (tidy(q.client_company_number)) companyNumbers.add(tidy(q.client_company_number));
	}
	const kind = quotes.some((q) => q.client_type === 'business')
		? 'Business'
		: quotes.some((q) => q.client_type === 'private')
			? 'Private client'
			: null;
	const notes = [
		'Imported from the client zone.',
		kind,
		companyNumbers.size ? `Company number: ${[...companyNumbers].join(', ')}.` : null
	]
		.filter(Boolean)
		.join(' ');
	return { name, isPartner: false, contacts, emailDomains: [...domains], notes };
}

const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
/** Integer cents -> "€1,234.56". The client zone invoices in EUR only. */
export const formatEur = (cents: number) => euro.format(cents / 100);

const day = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });
const formatDay = (d: Date | string) => day.format(new Date(d));

/**
 * Project titles: "Client · Quote title". When two imported quotes would get the same title, both
 * get their quote reference appended, so the project list tells them apart.
 */
export function projectTitles(quotes: readonly CzQuote[]): Map<string, string> {
	const base = (q: CzQuote) => {
		const title = tidy(q.title);
		return (title ? `${clientName(q)} · ${title}` : clientName(q)).slice(0, 180);
	};
	const count = new Map<string, number>();
	for (const q of quotes) {
		const key = base(q).toLowerCase();
		count.set(key, (count.get(key) ?? 0) + 1);
	}
	return new Map(
		quotes.map((q) => {
			const t = base(q);
			return [q.reference, (count.get(t.toLowerCase()) ?? 0) > 1 ? `${t} (${q.reference})` : t];
		})
	);
}

/** The project columns for one quote; client and partner ids are filled in by the importer. */
export function quoteProject(q: CzQuote, title: string) {
	const status =
		q.status === 'paid' && q.paid_at ? `paid ${formatDay(q.paid_at)}` : q.status.replace('_', ' ');
	const lines = (q.lines ?? [])
		.filter((l) => tidy(l.name))
		.map(
			(l) =>
				`- ${tidy(l.name)}${tidy(l.detail) ? ` (${tidy(l.detail)})` : ''}${
					typeof l.amount === 'number' ? `: ${formatEur(l.amount)}` : ''
				}`
		);
	const notes = [
		`Imported from the client zone: quote ${q.reference} (${status}).`,
		[
			q.issued_at ? `Issued ${formatDay(q.issued_at)}.` : null,
			typeof q.total_due === 'number' ? `Total due ${formatEur(q.total_due)} incl. VAT.` : null,
			q.billing === 'monthly' ? 'Monthly retainer.' : null,
			q.partner_code ? `Referred by partner code ${q.partner_code}.` : null
		]
			.filter(Boolean)
			.join(' '),
		lines.length ? `Quote lines:\n${lines.join('\n')}` : null
	]
		.filter(Boolean)
		.join('\n');
	return {
		title,
		phase: phaseFor(q),
		productType: tidy(q.title).slice(0, 200) || null,
		notes
	};
}
