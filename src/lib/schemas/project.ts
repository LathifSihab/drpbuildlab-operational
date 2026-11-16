import { z } from 'zod';

/** Single source for these lists: the database enums (db/schema.ts) are built from them. */
export const PROJECT_PHASES = [
	'lead',
	'proposal',
	'discovery',
	'design',
	'build',
	'uat',
	'deployed',
	'maintenance',
	'closed',
	'lost'
] as const;

export const PLATFORMS = [
	'shopify',
	'wix',
	'wordpress',
	'webflow',
	'squarespace',
	'storyblok',
	'drp_custom',
	'other',
	'none',
	'unknown'
] as const;

/** Names of the fields the project form sends. */
export const PROJECT_FIELDS = [
	'title',
	'clientId',
	'newClient',
	'partnerId',
	'newPartner',
	'accountManagerId',
	'phase',
	'platform',
	'platformDetail',
	'productType',
	'siteUrl',
	'stagingUrl',
	'productionUrl',
	'repoUrl',
	'domainRegistrar',
	'tools',
	'notes'
] as const;
export type ProjectField = (typeof PROJECT_FIELDS)[number];

const text = (max: number) =>
	z
		.string()
		.trim()
		.max(max, `At most ${max} characters`)
		.transform((v) => v || null);

// Only http(s) links: anything else (javascript:, data:) would be dangerous when rendered as a link.
const url = z
	.string()
	.trim()
	.max(2000)
	.transform((v) => v || null)
	.pipe(
		z.url({ protocol: /^https?$/, error: 'Enter a full http:// or https:// address' }).nullable()
	);

const id = z
	.string()
	.trim()
	.transform((v) => (v ? Number(v) : null))
	.pipe(z.number().int().positive().nullable());

const tools = z
	.string()
	.transform((v) => [
		...new Set(
			v
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean)
		)
	])
	.pipe(
		z.array(z.string().max(100, 'Each tool at most 100 characters')).max(50, 'At most 50 tools')
	);

export const ProjectInput = z.object({
	title: z.string().trim().min(1, 'Title is required').max(200, 'At most 200 characters'),
	clientId: id,
	newClient: text(200),
	partnerId: id,
	newPartner: text(200),
	accountManagerId: id,
	phase: z.enum(PROJECT_PHASES),
	platform: z.enum(PLATFORMS),
	platformDetail: text(500),
	productType: text(200),
	siteUrl: url,
	stagingUrl: url,
	productionUrl: url,
	repoUrl: url,
	domainRegistrar: text(200),
	tools,
	notes: text(10_000)
});
export type ProjectInput = z.infer<typeof ProjectInput>;

/** Reads the project form. Missing fields count as empty strings. */
export function readProjectForm(data: FormData): Record<ProjectField, string> {
	return Object.fromEntries(
		PROJECT_FIELDS.map((f) => {
			const v = data.get(f);
			return [f, typeof v === 'string' ? v : ''];
		})
	) as Record<ProjectField, string>;
}
