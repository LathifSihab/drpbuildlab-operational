// Shared by the SvelteKit app and the Trigger.dev tasks. Plain Postgres only (docs/ARCHITECTURE.md).
// Phase 1 tables; later phases add requests, source_messages, summaries, etc. per ARCHITECTURE.md.
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { PLATFORMS, PROJECT_PHASES } from '../../schemas/project.ts';
import { TASK_STATUSES, TASK_TYPES } from '../../schemas/task.ts';

export const userRole = pgEnum('user_role', ['admin', 'business', 'dev']);

export const projectPhase = pgEnum('project_phase', PROJECT_PHASES);

export const platform = pgEnum('platform', PLATFORMS);

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

export type Client = typeof clients.$inferSelect;

export const projects = pgTable(
	'projects',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		clientId: integer('client_id').references(() => clients.id),
		partnerId: integer('partner_id').references(() => clients.id),
		accountManagerId: integer('account_manager_id').references(() => users.id),
		// PIC: the person in charge of the work at DRP (the account manager owns the client side).
		picId: integer('pic_id').references(() => users.id),
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
		// Tool names; each one is also in the `tools` table, which feeds the form's dropdown.
		tools: jsonb('tools').$type<string[]>().notNull().default([]),
		notes: text('notes'),
		// Soft delete: deleted projects are hidden but kept, so their history and audit trail survive.
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
		...timestamps
	},
	(t) => [index('projects_client_idx').on(t.clientId), index('projects_phase_idx').on(t.phase)]
);

export type Project = typeof projects.$inferSelect;

export const taskType = pgEnum('task_type', TASK_TYPES);

export const taskStatus = pgEnum('task_status', TASK_STATUSES);

/** A piece of work on a project: an enhancement, a revision, a fix, ... (docs/ARCHITECTURE.md). */
export const tasks = pgTable(
	'tasks',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		projectId: integer('project_id')
			.notNull()
			.references(() => projects.id),
		title: text('title').notNull(),
		type: taskType('type').notNull(),
		status: taskStatus('status').notNull().default('todo'),
		description: text('description'),
		assigneeId: integer('assignee_id').references(() => users.id),
		dueDate: date('due_date', { mode: 'string' }),
		// The request this task came from. Filled by generate-brief in Phase 4; the foreign key is
		// added with the `requests` table in Phase 2.
		requestId: integer('request_id'),
		...timestamps
	},
	(t) => [
		index('tasks_project_idx').on(t.projectId),
		index('tasks_assignee_status_idx').on(t.assigneeId, t.status)
	]
);

export type Task = typeof tasks.$inferSelect;

/** The shared list of tools offered on the project form. Names are unique ignoring case. */
export const tools = pgTable(
	'tools',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		name: text('name').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('tools_name_lower_idx').on(sql`lower(${t.name})`)]
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
