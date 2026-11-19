import { z } from 'zod';

export const CLIENT_KINDS = ['client', 'partner'] as const;
export type ClientKind = (typeof CLIENT_KINDS)[number];

/**
 * Mail providers anyone can sign up with. As a client's domain they would make intake match
 * unrelated senders to that client (ARCHITECTURE.md, Intake rules).
 */
export const SHARED_MAIL_DOMAINS: ReadonlySet<string> = new Set([
	'gmail.com',
	'googlemail.com',
	'outlook.com',
	'outlook.be',
	'outlook.nl',
	'hotmail.com',
	'hotmail.be',
	'hotmail.nl',
	'live.com',
	'live.be',
	'live.nl',
	'msn.com',
	'yahoo.com',
	'icloud.com',
	'me.com',
	'mac.com',
	'proton.me',
	'protonmail.com',
	'telenet.be',
	'skynet.be',
	'proximus.be',
	'ziggo.nl',
	'kpnmail.nl'
]);

/** DRP's own domains mark internal notes at intake, so they can never belong to a client. */
export const DRP_DOMAINS: ReadonlySet<string> = new Set(['drpbuildlab.com', 'drpbuildlab.dev']);

const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Splits "@Terro.be, terro.nl" into ["terro.be", "terro.nl"]: lowercase, no "@", no duplicates. */
export function splitDomains(raw: string): string[] {
	return [
		...new Set(
			raw
				.split(/[\s,;]+/)
				.map((d) => d.trim().toLowerCase().replace(/^@/, ''))
				.filter(Boolean)
		)
	];
}

const emailDomains = z
	.string()
	.transform(splitDomains)
	.pipe(
		z
			.array(z.string())
			.max(20, 'At most 20 domains')
			.superRefine((domains, ctx) => {
				for (const d of domains) {
					let message: string | null = null;
					if (!DOMAIN_RE.test(d)) message = `“${d}” is not a domain like example.com`;
					else if (SHARED_MAIL_DOMAINS.has(d))
						message = `“${d}” is a shared mail provider; add the person as a contact instead`;
					else if (DRP_DOMAINS.has(d)) message = `“${d}” is DRP's own domain`;
					if (message) ctx.addIssue({ code: 'custom', message });
				}
			})
	);

const text = (max: number) =>
	z
		.string()
		.trim()
		.max(max, `At most ${max} characters`)
		.transform((v) => v || null);

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max, `At most ${max} characters`)
		.transform((v) => v || undefined);

export const CONTACT_FIELDS = ['name', 'email', 'phone', 'role'] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

export const ContactInput = z.object({
	name: z.string().trim().min(1, 'Name is required').max(200, 'At most 200 characters'),
	email: z
		.string()
		.trim()
		.max(320, 'At most 320 characters')
		.transform((v) => v || undefined)
		.pipe(z.email('Not a valid email address').optional()),
	phone: optionalText(50),
	role: optionalText(100)
});
export type Contact = { name: string; email?: string; phone?: string; role?: string };

export const ClientInput = z.object({
	name: z.string().trim().min(1, 'Name is required').max(200, 'At most 200 characters'),
	kind: z.enum(CLIENT_KINDS, 'Pick client or partner'),
	emailDomains,
	notes: text(10_000),
	contacts: z.array(ContactInput).max(50, 'At most 50 contacts')
});
export type ClientInput = z.infer<typeof ClientInput>;

/** What the client form sends, also echoed back after a failed save. */
export type ClientFormValues = {
	name: string;
	kind: string;
	emailDomains: string;
	notes: string;
	contacts: Record<ContactField, string>[];
};

/**
 * Reads the client form. Contacts arrive as parallel `contactName` / `contactEmail` / ... lists;
 * rows left completely empty are dropped.
 */
export function readClientForm(data: FormData): ClientFormValues {
	const str = (key: string) => {
		const v = data.get(key);
		return typeof v === 'string' ? v : '';
	};
	const list = (key: string) => data.getAll(key).map((v) => (typeof v === 'string' ? v : ''));
	const names = list('contactName');
	const emails = list('contactEmail');
	const phones = list('contactPhone');
	const roles = list('contactRole');
	const rows = Math.min(Math.max(names.length, emails.length, phones.length, roles.length), 200);
	const contacts: Record<ContactField, string>[] = [];
	for (let i = 0; i < rows; i++) {
		const row = {
			name: names[i] ?? '',
			email: emails[i] ?? '',
			phone: phones[i] ?? '',
			role: roles[i] ?? ''
		};
		if (Object.values(row).some((v) => v.trim())) contacts.push(row);
	}
	return {
		name: str('name'),
		kind: str('kind'),
		emailDomains: str('emailDomains'),
		notes: str('notes'),
		contacts
	};
}

/**
 * Validation errors keyed by field: `name`, `emailDomains`, ... and `contacts.<row>.<field>` for a
 * contact, so the form can show each message under its own input.
 */
export function clientFormErrors(error: z.ZodError): Record<string, string[]> {
	const errors: Record<string, string[]> = {};
	for (const issue of error.issues) {
		const key = issue.path.length ? issue.path.map(String).join('.') : 'form';
		(errors[key] ??= []).push(issue.message);
	}
	return errors;
}
