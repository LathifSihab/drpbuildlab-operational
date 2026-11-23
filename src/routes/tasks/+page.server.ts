import { and, asc, eq, gte, isNull, ne, or, sql } from 'drizzle-orm';
import { requireRole } from '#lib/server/auth/users.ts';
import { projects, tasks, users } from '#lib/server/db/schema.ts';
import {
	canEditTasks,
	createTaskAction,
	listTasks,
	setTaskStatusAction,
	TASK_EDITORS
} from '#lib/server/tasks.ts';
import { todayUtc } from '#lib/tasks.ts';
import type { Actions, PageServerLoad } from './$types';

/** Done tasks stay on this page for two weeks, so a finished task can still be reopened. */
const DONE_DAYS = 14;

export const load: PageServerLoad = async ({ locals, url }) => {
	const everyone = url.searchParams.get('who') === 'all';
	const doneSince = new Date(Date.now() - DONE_DAYS * 24 * 60 * 60 * 1000);
	const canEdit = canEditTasks(locals.user.role);
	const [rows, projectList, userList] = await Promise.all([
		listTasks(
			locals.db,
			and(
				everyone ? undefined : eq(tasks.assigneeId, locals.user.id),
				or(ne(tasks.status, 'done'), gte(tasks.updatedAt, doneSince))
			)
		),
		// For the add form's project picker: open projects only.
		canEdit
			? locals.db
					.select({ id: projects.id, title: projects.title })
					.from(projects)
					.where(isNull(projects.deletedAt))
					.orderBy(asc(sql`lower(${projects.title})`))
			: [],
		canEdit
			? locals.db
					.select({ id: users.id, email: users.email, name: users.name })
					.from(users)
					.orderBy(asc(users.email))
			: []
	]);
	return {
		tasks: rows,
		everyone,
		doneDays: DONE_DAYS,
		today: todayUtc(),
		canChangeStatus: canEdit,
		canAdd: canEdit,
		projects: projectList,
		users: userList,
		me: locals.user.id
	};
};

export const actions: Actions = {
	// Returns nothing on success, or `{ taskForm }` on a bad form.
	addTask: async ({ request, locals }) => {
		const user = requireRole(locals.user, TASK_EDITORS);
		return createTaskAction(locals.db, user, null, await request.formData());
	},

	setTaskStatus: async ({ request, locals }) => {
		const user = requireRole(locals.user, TASK_EDITORS);
		await setTaskStatusAction(locals.db, user, null, await request.formData());
	}
};
