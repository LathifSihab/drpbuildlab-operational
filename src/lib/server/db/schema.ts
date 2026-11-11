// Shared by the SvelteKit app and the Trigger.dev tasks. Plain Postgres only (docs/ARCHITECTURE.md).
// Phase 1 tables; later phases add requests, source_messages, summaries, etc. per ARCHITECTURE.md.
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['admin', 'business', 'dev']);

export const projectPhase = pgEnum('project_phase', [
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
]);

export const platform = pgEnum('platform', [
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
]);

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
};

export const users = pgTable('users', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	email: text('email').notNull().unique(), // stored lowercase
	name: text('name'),
	role: userRole('role').notNull().default('business'),
	lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
	...timestamps
});

export const clients = pgTable('clients', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	name: text('name').notNull(),
	isPartner: boolean('is_partner').notNull().default(false),
	contacts: jsonb('contacts')
		.$type<{ name: string; email?: string; phone?: string; role?: string }[]>()
		.notNull()
		.default([]),
	emailDomains: text('email_domains').array().notNull().default([]),
	notes: text('notes'),
	...timestamps
});

export const projects = pgTable(
	'projects',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		clientId: integer('client_id').references(() => clients.id),
		partnerId: integer('partner_id').references(() => clients.id),
		accountManagerId: integer('account_manager_id').references(() => users.id),
		phase: projectPhase('phase').notNull().default('lead'),
		productType: text('product_type'),
		platform: platform('platform').notNull().default('unknown'),
		platformDetail: text('platform_detail'),
		siteUrl: text('site_url'),
		techStack: jsonb('tech_stack').$type<Record<string, unknown>>(),
		repoUrl: text('repo_url'),
		stagingUrl: text('staging_url'),
		productionUrl: text('production_url'),
		domainRegistrar: text('domain_registrar'),
		tools: jsonb('tools').$type<string[]>().notNull().default([]),
		...timestamps
	},
	(t) => [index('projects_client_idx').on(t.clientId), index('projects_phase_idx').on(t.phase)]
);

export const auditLog = pgTable(
	'audit_log',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		actor: text('actor').notNull(), // user email, or "system:<task id>"
		action: text('action').notNull(),
		entity: text('entity').notNull(),
		entityId: text('entity_id'),
		at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
		diff: jsonb('diff').$type<Record<string, unknown>>()
	},
	(t) => [
		index('audit_log_entity_idx').on(t.entity, t.entityId),
		index('audit_log_at_idx').on(t.at)
	]
);

export type User = typeof users.$inferSelect;
export type Role = User['role'];
