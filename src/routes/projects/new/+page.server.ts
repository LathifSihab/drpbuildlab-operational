import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '#lib/server/auth/users.ts';
import { projects } from '#lib/server/db/schema.ts';
import {
	assertUser,
	auditProject,
	canAddTools,
	canEditProjects,
	ensureTools,
	loadProjectOptions,
	projectValues,
	resolveClient,
	ToolNotAllowedError,
	uniqueSlug,
	UnknownReferenceError
} from '#lib/server/projects.ts';
import { ProjectInput, readProjectForm } from '#lib/schemas/project.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!canEditProjects(locals.user.role)) error(403, 'You cannot create projects');
	return { options: await loadProjectOptions(locals.db, locals.user.role), canEdit: true };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = requireRole(locals.user, ['admin', 'dev', 'business']);
		const values = readProjectForm(await request.formData());
		const parsed = ProjectInput.safeParse(values);
		if (!parsed.success) {
			return fail(400, { errors: z.flattenError(parsed.error).fieldErrors, values });
		}
		const input = parsed.data;

		let id: number;
		try {
			id = await locals.db.transaction(async (tx) => {
				const clientId = await resolveClient(
					tx,
					user.email,
					input.clientId,
					input.newClient,
					false
				);
				const partnerId = await resolveClient(
					tx,
					user.email,
					input.partnerId,
					input.newPartner,
					true
				);
				await assertUser(tx, input.accountManagerId, 'accountManagerId');
				await assertUser(tx, input.picId, 'picId');
				const toolNames = await ensureTools(tx, input.tools, { allowNew: canAddTools(user.role) });
				const row = projectValues(input, { clientId, partnerId, tools: toolNames });
				const [created] = await tx
					.insert(projects)
					.values({ ...row, slug: await uniqueSlug(tx, input.title) })
					.returning({ id: projects.id });
				await auditProject(tx, user.email, 'project.created', created.id, row);
				return created.id;
			});
		} catch (e) {
			if (e instanceof UnknownReferenceError) {
				return fail(400, { errors: { [e.field]: ['No longer exists; pick another'] }, values });
			}
			if (e instanceof ToolNotAllowedError) {
				const msg = `Only an admin can add new tools (${e.names.join(', ')}). Pick from the list, or ask an admin.`;
				return fail(400, { errors: { tools: [msg] }, values });
			}
			throw e;
		}
		redirect(303, `/projects/${id}`);
	}
};
