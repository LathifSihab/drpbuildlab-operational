import { and, eq, gte, ne, or } from 'drizzle-orm';
import { requireRole } from '#lib/server/auth/users.ts';
import { tasks } from '#lib/server/db/schema.ts';
import { canEditTasks, listTasks, setTaskStatusAction, TASK_EDITORS } from '#lib/server/tasks.ts';
import { todayUtc } from '#lib/tasks.ts';
import type { Actions, PageServerLoad } from './$types';

/** Done tasks stay on this page for two weeks, so a finished task can still be reopened. */
const DONE_DAYS = 14;

export const load: PageServerLoad = async ({ locals, url }) => {
	const everyone = url.searchParams.get('who') === 'all';
	const doneSince = new Date(Date.now() - DONE_DAYS * 24 * 60 * 60 * 1000);
	const rows = await listTasks(
		locals.db,
		and(
			everyone ? undefined : eq(tasks.assigneeId, locals.user.id),
			or(ne(tasks.status, 'done'), gte(tasks.updatedAt, doneSince))
		)
	);
	return {
		tasks: rows,
		everyone,
		doneDays: DONE_DAYS,
		today: todayUtc(),
		canChangeStatus: canEditTasks(locals.user.role)
	};
};

export const actions: Actions = {
	setTaskStatus: async ({ request, locals }) => {
		const user = requireRole(locals.user, TASK_EDITORS);
		await setTaskStatusAction(locals.db, user, null, await request.formData());
	}
};
