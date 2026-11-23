import { error, fail, redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { requireRole } from '#lib/server/auth/users.ts';
import type { Db } from '#lib/server/db/index.ts';
import { auditLog, clients, projects, tasks, users } from '#lib/server/db/schema.ts';
import {
	assertUser,
	auditProject,
	canDeleteProjects,
	canAddTools,
	canEditProjects,
	ensureTools,
	diffProject,
	loadProjectOptions,
	projectValues,
	resolveClient,
	ToolNotAllowedError,
	UnknownReferenceError
} from '#lib/server/projects.ts';
import { ProjectInput, readProjectForm } from '#lib/schemas/project.ts';
import {
	canEditTasks,
	createTaskAction,
	deleteTaskAction,
	listTasks,
	projectHistoryWhere,
	setTaskStatusAction,
	TASK_EDITORS,
	updateTaskAction
} from '#lib/server/tasks.ts';
import { todayUtc } from '#lib/tasks.ts';
import type { Actions, PageServerLoad } from './$types';

function projectId(raw: string): number {
	const id = Number(raw);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Project not found');
	return id;
}

async function findProject(db: Db, id: number) {
	const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
	return row;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = projectId(params.id);
	const partner = alias(clients, 'partner');
	const pic = alias(users, 'pic');
	const [row] = await locals.db
		.select({
			project: projects,
			clientName: clients.name,
			partnerName: partner.name,
			accountManagerEmail: users.email,
			picEmail: pic.email
		})
		.from(projects)
		.leftJoin(clients, eq(projects.clientId, clients.id))
		.leftJoin(partner, eq(projects.partnerId, partner.id))
		.leftJoin(users, eq(projects.accountManagerId, users.id))
		.leftJoin(pic, eq(projects.picId, pic.id))
		.where(eq(projects.id, id))
		.limit(1);

	const canDelete = canDeleteProjects(locals.user.role);
	// Deleted projects are only visible to admins, who can restore them.
	if (!row || (row.project.deletedAt && !canDelete)) error(404, 'Project not found');

	const [options, history, taskRows] = await Promise.all([
		loadProjectOptions(locals.db, locals.user.role),
		locals.db
			.select({
				id: auditLog.id,
				at: auditLog.at,
				actor: auditLog.actor,
				action: auditLog.action,
				diff: auditLog.diff
			})
			.from(auditLog)
			// The project's own changes and its tasks' changes.
			.where(projectHistoryWhere(id))
			.orderBy(desc(auditLog.at))
			.limit(100),
		listTasks(locals.db, eq(tasks.projectId, id), { includeDeletedProjects: true })
	]);

	const { techStack: _techStack, ...project } = row.project; // not editable here yet
	return {
		project: {
			...project,
			clientName: row.clientName,
			partnerName: row.partnerName,
			accountManagerEmail: row.accountManagerEmail,
			picEmail: row.picEmail
		},
		options,
		history,
		tasks: taskRows,
		today: todayUtc(),
		canEdit: canEditProjects(locals.user.role) && !row.project.deletedAt,
		canEditTasks: canEditTasks(locals.user.role) && !row.project.deletedAt,
		canDelete
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const user = requireRole(locals.user, ['admin', 'dev', 'business']);
		const id = projectId(params.id);
		const values = readProjectForm(await request.formData());
		const parsed = ProjectInput.safeParse(values);
		if (!parsed.success) {
			return fail(400, { errors: z.flattenError(parsed.error).fieldErrors, values });
		}
		const input = parsed.data;

		try {
			await locals.db.transaction(async (tx) => {
				const [before] = await tx.select().from(projects).where(eq(projects.id, id)).for('update');
				if (!before) error(404, 'Project not found');
				if (before.deletedAt) error(409, 'This project is deleted; restore it first');
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
				const toolNames = await ensureTools(tx, input.tools, {
					allowNew: canAddTools(user.role),
					alreadyOnProject: before.tools
				});
				const after = projectValues(input, { clientId, partnerId, tools: toolNames });
				const changes = diffProject(before, after);
				if (Object.keys(changes).length === 0) return;
				await tx.update(projects).set(after).where(eq(projects.id, id));
				await auditProject(tx, user.email, 'project.updated', id, changes);
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
	},

	delete: async ({ params, locals }) => {
		const user = requireRole(locals.user, ['admin']);
		const id = projectId(params.id);
		const project = await findProject(locals.db, id);
		if (!project) error(404, 'Project not found');
		if (!project.deletedAt) {
			await locals.db.transaction(async (tx) => {
				await tx.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, id));
				await auditProject(tx, user.email, 'project.deleted', id, { title: project.title });
			});
		}
		redirect(303, '/');
	},

	restore: async ({ params, locals }) => {
		const user = requireRole(locals.user, ['admin']);
		const id = projectId(params.id);
		const project = await findProject(locals.db, id);
		if (!project) error(404, 'Project not found');
		if (project.deletedAt) {
			await locals.db.transaction(async (tx) => {
				await tx.update(projects).set({ deletedAt: null }).where(eq(projects.id, id));
				await auditProject(tx, user.email, 'project.restored', id, { title: project.title });
			});
		}
		redirect(303, `/projects/${id}`);
	},

	// Tasks (PLAN.md Phase 1d). Each returns nothing on success, or `{ taskForm }` on a bad form.
	addTask: async ({ params, request, locals }) => {
		const user = requireRole(locals.user, TASK_EDITORS);
		return createTaskAction(locals.db, user, projectId(params.id), await request.formData());
	},

	updateTask: async ({ params, request, locals }) => {
		const user = requireRole(locals.user, TASK_EDITORS);
		return updateTaskAction(locals.db, user, projectId(params.id), await request.formData());
	},

	setTaskStatus: async ({ params, request, locals }) => {
		const user = requireRole(locals.user, TASK_EDITORS);
		await setTaskStatusAction(locals.db, user, projectId(params.id), await request.formData());
	},

	deleteTask: async ({ params, request, locals }) => {
		const user = requireRole(locals.user, TASK_EDITORS);
		await deleteTaskAction(locals.db, user, projectId(params.id), await request.formData());
	}
};
