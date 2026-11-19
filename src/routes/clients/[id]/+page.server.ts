import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, desc, eq, isNull, or } from 'drizzle-orm';
import { requireRole } from '#lib/server/auth/users.ts';
import {
	auditClient,
	canDeleteClients,
	canEditClients,
	canSeeClientPersonalData,
	clientConflicts,
	clientUsage,
	clientValues,
	diffClient,
	hidePersonalData
} from '#lib/server/clients.ts';
import { auditLog, clients, projects } from '#lib/server/db/schema.ts';
import { ClientInput, clientFormErrors, readClientForm } from '#lib/schemas/client.ts';
import type { Actions, PageServerLoad } from './$types';

function clientId(raw: string): number {
	const id = Number(raw);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Client not found');
	return id;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = clientId(params.id);
	const role = locals.user.role;
	const canSeePersonal = canSeeClientPersonalData(role);
	const canDelete = canDeleteClients(role);

	const [row] = await locals.db.select().from(clients).where(eq(clients.id, id)).limit(1);
	if (!row) error(404, 'Client not found');

	const [projectRows, history, usage] = await Promise.all([
		locals.db
			.select({
				id: projects.id,
				title: projects.title,
				phase: projects.phase,
				platform: projects.platform,
				clientId: projects.clientId,
				deletedAt: projects.deletedAt
			})
			.from(projects)
			.where(
				and(
					or(eq(projects.clientId, id), eq(projects.partnerId, id)),
					// Deleted projects are only visible to admins (as on the project list).
					canDelete ? undefined : isNull(projects.deletedAt)
				)
			)
			.orderBy(asc(projects.title)),
		locals.db
			.select({
				id: auditLog.id,
				at: auditLog.at,
				actor: auditLog.actor,
				action: auditLog.action,
				diff: auditLog.diff
			})
			.from(auditLog)
			.where(and(eq(auditLog.entity, 'client'), eq(auditLog.entityId, String(id))))
			.orderBy(desc(auditLog.at))
			.limit(50),
		clientUsage(locals.db, id)
	]);

	const { contacts, notes, ...client } = row;
	return {
		client: canSeePersonal ? { ...client, contacts, notes } : client,
		projects: projectRows.map(({ clientId: cid, ...p }) => ({
			...p,
			as: cid === id ? ('client' as const) : ('partner' as const)
		})),
		history: canSeePersonal
			? history
			: history.map((h) => ({ ...h, diff: hidePersonalData(h.diff) })),
		usage,
		canSeePersonal,
		canEdit: canEditClients(role),
		canDelete
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const user = requireRole(locals.user, ['admin', 'dev', 'business']);
		const id = clientId(params.id);
		const values = readClientForm(await request.formData());
		const parsed = ClientInput.safeParse(values);
		if (!parsed.success) return fail(400, { errors: clientFormErrors(parsed.error), values });

		const after = clientValues(parsed.data, canSeeClientPersonalData(user.role));
		const errors = await locals.db.transaction(async (tx) => {
			const [before] = await tx.select().from(clients).where(eq(clients.id, id)).for('update');
			if (!before) error(404, 'Client not found');

			const conflicts = await clientConflicts(tx, after, id);
			// Projects check the type of their client and partner, so it can't change under them.
			if (before.isPartner !== after.isPartner) {
				const usage = await clientUsage(tx, id);
				const used = before.isPartner ? usage.asPartner : usage.asClient;
				if (used > 0) {
					conflicts.kind = [
						`Used as ${before.isPartner ? 'partner' : 'client'} on ${used} project${used === 1 ? '' : 's'}; change those projects first`
					];
				}
			}
			if (Object.keys(conflicts).length) return conflicts;

			const changes = diffClient(before, after);
			if (Object.keys(changes).length === 0) return null;
			await tx.update(clients).set(after).where(eq(clients.id, id));
			await auditClient(tx, user.email, 'client.updated', id, changes);
			return null;
		});
		if (errors) return fail(400, { errors, values });
		redirect(303, `/clients/${id}`);
	},

	delete: async ({ params, locals }) => {
		const user = requireRole(locals.user, ['admin']);
		const id = clientId(params.id);
		const deleteError = await locals.db.transaction(async (tx) => {
			const [client] = await tx.select().from(clients).where(eq(clients.id, id)).for('update');
			if (!client) error(404, 'Client not found');
			const usage = await clientUsage(tx, id);
			if (usage.asClient + usage.asPartner > 0) {
				return 'This client is still used by projects (deleted ones included). Move those projects to another client first.';
			}
			await tx.delete(clients).where(eq(clients.id, id));
			// Contacts and notes are personal data: not copied into the audit trail on delete.
			await auditClient(tx, user.email, 'client.deleted', id, {
				name: client.name,
				isPartner: client.isPartner,
				emailDomains: client.emailDomains
			});
			return null;
		});
		if (deleteError) return fail(409, { deleteError });
		redirect(303, '/clients');
	}
};
