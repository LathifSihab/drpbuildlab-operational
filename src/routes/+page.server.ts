import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { requireRole } from '#lib/server/auth/users.ts';
import { auditLog, clients, projects } from '#lib/server/db/schema.ts';
import { triggerTask } from '#lib/server/trigger.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [projectRows, taskRuns] = await Promise.all([
		locals.db
			.select({
				id: projects.id,
				title: projects.title,
				phase: projects.phase,
				platform: projects.platform,
				client: clients.name,
				updatedAt: projects.updatedAt
			})
			.from(projects)
			.leftJoin(clients, eq(projects.clientId, clients.id))
			.orderBy(desc(projects.updatedAt))
			.limit(200),
		locals.db
			.select({ id: auditLog.id, at: auditLog.at, actor: auditLog.actor, diff: auditLog.diff })
			.from(auditLog)
			.where(eq(auditLog.action, 'hello_world'))
			.orderBy(desc(auditLog.at))
			.limit(5)
	]);
	return {
		projects: projectRows,
		taskRuns,
		canRunTasks: locals.user.role === 'admin' || locals.user.role === 'dev'
	};
};

export const actions: Actions = {
	helloWorld: async ({ locals }) => {
		const user = requireRole(locals.user, ['admin', 'dev']);
		try {
			const run = await triggerTask('hello-world', { requestedBy: user.email });
			return { triggeredRunId: run.id };
		} catch (e) {
			console.error('trigger hello-world failed:', (e as Error).message);
			return fail(502, {
				error: 'Could not start the task. Check TRIGGER_SECRET_KEY and the Trigger.dev project.'
			});
		}
	}
};
