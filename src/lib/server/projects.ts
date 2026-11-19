import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { PLATFORMS, PROJECT_PHASES, type ProjectInput } from '../schemas/project.ts';
import { auditClient } from './clients.ts';
import type { Db } from './db/index.ts';
import { auditLog, clients, projects, users, type Project, type Role } from './db/schema.ts';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type DbOrTx = Db | Tx;

/** Business, dev and admin all manage projects; only admin deletes and restores. */
export const canEditProjects = (role: Role) =>
	role === 'admin' || role === 'dev' || role === 'business';
export const canDeleteProjects = (role: Role) => role === 'admin';

export async function loadProjectOptions(db: Db) {
	const [allClients, allUsers] = await Promise.all([
		db
			.select({ id: clients.id, name: clients.name, isPartner: clients.isPartner })
			.from(clients)
			.orderBy(asc(clients.name)),
		db
			.select({ id: users.id, email: users.email, name: users.name })
			.from(users)
			.orderBy(asc(users.email))
	]);
	return {
		clients: allClients.filter((c) => !c.isPartner).map(({ id, name }) => ({ id, name })),
		partners: allClients.filter((c) => c.isPartner).map(({ id, name }) => ({ id, name })),
		users: allUsers,
		phases: PROJECT_PHASES,
		platforms: PLATFORMS
	};
}

export function slugify(title: string): string {
	const base = title
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '') // TÈRRO -> TERRO
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return base || 'project';
}

/** A slug not used by any project yet: `terro`, then `terro-2`, `terro-3`, ... */
export async function uniqueSlug(db: DbOrTx, title: string): Promise<string> {
	const base = slugify(title);
	const taken = new Set(
		(
			await db
				.select({ slug: projects.slug })
				.from(projects)
				.where(or(eq(projects.slug, base), like(projects.slug, `${base}-%`)))
		).map((r) => r.slug)
	);
	if (!taken.has(base)) return base;
	for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/**
 * The client (or partner) for a project: a typed new name wins over the dropdown and reuses an
 * existing client with the same name. Returns null when neither is given. A client created here
 * is audited like one created on the clients page.
 */
export async function resolveClient(
	db: DbOrTx,
	actor: string,
	selectedId: number | null,
	newName: string | null,
	isPartner: boolean
): Promise<number | null> {
	if (newName) {
		const [existing] = await db
			.select({ id: clients.id })
			.from(clients)
			.where(and(sql`lower(${clients.name}) = lower(${newName})`, eq(clients.isPartner, isPartner)))
			.limit(1);
		if (existing) return existing.id;
		const [created] = await db
			.insert(clients)
			.values({ name: newName, isPartner })
			.returning({ id: clients.id });
		await auditClient(db, actor, 'client.created', created.id, {
			name: newName,
			isPartner,
			via: 'project form'
		});
		return created.id;
	}
	if (selectedId === null) return null;
	const [found] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(and(eq(clients.id, selectedId), eq(clients.isPartner, isPartner)))
		.limit(1);
	if (!found) throw new UnknownReferenceError(isPartner ? 'partnerId' : 'clientId');
	return found.id;
}

export async function assertUser(db: DbOrTx, userId: number | null): Promise<void> {
	if (userId === null) return;
	const [found] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	if (!found) throw new UnknownReferenceError('accountManagerId');
}

export class UnknownReferenceError extends Error {
	constructor(readonly field: 'clientId' | 'partnerId' | 'accountManagerId') {
		super(`unknown ${field}`);
	}
}

/** The columns a person can set through the form. */
export function projectValues(
	input: ProjectInput,
	clientId: number | null,
	partnerId: number | null
) {
	return {
		title: input.title,
		clientId,
		partnerId,
		accountManagerId: input.accountManagerId,
		phase: input.phase,
		platform: input.platform,
		platformDetail: input.platformDetail,
		productType: input.productType,
		siteUrl: input.siteUrl,
		stagingUrl: input.stagingUrl,
		productionUrl: input.productionUrl,
		repoUrl: input.repoUrl,
		domainRegistrar: input.domainRegistrar,
		tools: input.tools,
		notes: input.notes
	};
}
export type ProjectValues = ReturnType<typeof projectValues>;

/** Fields that changed, as { field: { from, to } }, for the audit log. */
export function diffProject(before: Project, after: ProjectValues) {
	const changes: Record<string, { from: unknown; to: unknown }> = {};
	for (const key of Object.keys(after) as (keyof ProjectValues)[]) {
		const a = before[key];
		const b = after[key];
		if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null))
			changes[key] = { from: a ?? null, to: b ?? null };
	}
	return changes;
}

export async function auditProject(
	db: DbOrTx,
	actor: string,
	action: 'project.created' | 'project.updated' | 'project.deleted' | 'project.restored',
	projectId: number,
	diff: Record<string, unknown> | null
) {
	await db
		.insert(auditLog)
		.values({ actor, action, entity: 'project', entityId: String(projectId), diff });
}
