import { error, fail } from '@sveltejs/kit';
import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import {
	readTaskForm,
	TaskId,
	TaskInput,
	TaskStatusInput,
	type TaskField
} from '../schemas/task.ts';
import type { Db } from './db/index.ts';
import { auditLog, projects, tasks, users, type Role, type Task, type User } from './db/schema.ts';
import { assertUser, UnknownReferenceError } from './projects.ts';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type DbOrTx = Db | Tx;

/** Everyone who manages projects also manages their tasks, deleting included (it is audited). */
export const TASK_EDITORS = ['admin', 'dev', 'business'] as const satisfies readonly Role[];
export const canEditTasks = (role: Role) => (TASK_EDITORS as readonly Role[]).includes(role);

/** A failed task form, kept apart from the project form's `errors` on the project page. */
export type TaskFormResult = {
	taskForm: {
		/** null for the "add task" form. */
		taskId: number | null;
		errors: Partial<Record<TaskField, string[]>>;
		values: Record<TaskField, string>;
	};
};

/**
 * Tasks with their project and assignee, for lists. Deleted projects' tasks are left out, except
 * on that project's own page (only admins can open it).
 */
export function listTasks(db: Db, where?: SQL, { includeDeletedProjects = false } = {}) {
	return db
		.select({
			id: tasks.id,
			projectId: tasks.projectId,
			projectTitle: projects.title,
			title: tasks.title,
			type: tasks.type,
			status: tasks.status,
			description: tasks.description,
			assigneeId: tasks.assigneeId,
			assigneeEmail: users.email,
			assigneeName: users.name,
			dueDate: tasks.dueDate,
			updatedAt: tasks.updatedAt
		})
		.from(tasks)
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.leftJoin(users, eq(tasks.assigneeId, users.id))
		.where(and(includeDeletedProjects ? undefined : isNull(projects.deletedAt), where))
		.limit(500);
}
export type TaskRow = Awaited<ReturnType<typeof listTasks>>[number];

/**
 * Audit rows for a task use entity `task`; the diff always carries `projectId` and the task's
 * title, so the project's history can show them and still name a deleted task.
 */
export async function auditTask(
	db: DbOrTx,
	actor: string,
	action: 'task.created' | 'task.updated' | 'task.deleted',
	task: { id: number; projectId: number; title: string },
	diff: Record<string, unknown> = {}
) {
	await db.insert(auditLog).values({
		actor,
		action,
		entity: 'task',
		entityId: String(task.id),
		diff: { projectId: task.projectId, taskTitle: task.title, ...diff }
	});
}

/** Audit rows of a project and of its tasks, for the project page's history. */
export function projectHistoryWhere(projectId: number): SQL {
	return sql`((${auditLog.entity} = 'project' and ${auditLog.entityId} = ${String(projectId)})
		or (${auditLog.entity} = 'task' and ${auditLog.diff}->>'projectId' = ${String(projectId)}))`;
}

/** The columns a person sets through the task form. */
export function taskValues(input: TaskInput) {
	return {
		title: input.title,
		type: input.type,
		status: input.status,
		description: input.description,
		assigneeId: input.assigneeId,
		dueDate: input.dueDate
	};
}
export type TaskValues = ReturnType<typeof taskValues>;

/** Fields that changed, as { field: { from, to } }, for the audit log. */
export function diffTask(before: Task, after: Partial<TaskValues>) {
	const changes: Record<string, { from: unknown; to: unknown }> = {};
	for (const key of Object.keys(after) as (keyof TaskValues)[]) {
		const a = before[key] ?? null;
		const b = after[key] ?? null;
		if (a !== b) changes[key] = { from: a, to: b };
	}
	return changes;
}

async function assertOpenProject(db: DbOrTx, projectId: number) {
	const [project] = await db
		.select({ deletedAt: projects.deletedAt })
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1);
	if (!project) error(404, 'Project not found');
	if (project.deletedAt) error(409, 'This project is deleted; restore it first');
}

/** Locks a task for a change. With a projectId, the task must belong to that project. */
async function lockTask(tx: Tx, taskId: number, projectId: number | null): Promise<Task> {
	const [task] = await tx
		.select()
		.from(tasks)
		.where(
			and(eq(tasks.id, taskId), projectId === null ? undefined : eq(tasks.projectId, projectId))
		)
		.for('update');
	if (!task) error(404, 'Task not found; it may have been deleted');
	await assertOpenProject(tx, task.projectId);
	return task;
}

function readTaskId(data: FormData): number {
	const parsed = TaskId.safeParse(data.get('taskId'));
	if (!parsed.success) error(400, 'Missing task');
	return parsed.data;
}

function invalid(
	taskId: number | null,
	errors: Partial<Record<TaskField, string[]>>,
	values: Record<TaskField, string>
) {
	return fail(400, { taskForm: { taskId, errors, values } } satisfies TaskFormResult);
}

/** Form action: add a task to a project. */
export async function createTaskAction(db: Db, user: User, projectId: number, data: FormData) {
	const values = readTaskForm(data);
	const parsed = TaskInput.safeParse(values);
	if (!parsed.success) return invalid(null, z.flattenError(parsed.error).fieldErrors, values);
	try {
		await db.transaction(async (tx) => {
			await assertOpenProject(tx, projectId);
			await assertUser(tx, parsed.data.assigneeId, 'assigneeId');
			const row = taskValues(parsed.data);
			const [created] = await tx
				.insert(tasks)
				.values({ ...row, projectId })
				.returning({ id: tasks.id });
			await auditTask(
				tx,
				user.email,
				'task.created',
				{ id: created.id, projectId, title: row.title },
				{
					type: row.type,
					status: row.status,
					assigneeId: row.assigneeId,
					dueDate: row.dueDate
				}
			);
		});
	} catch (e) {
		if (e instanceof UnknownReferenceError) {
			return invalid(null, { assigneeId: ['No longer exists; pick another'] }, values);
		}
		throw e;
	}
}

/** Form action: edit a task's fields. */
export async function updateTaskAction(db: Db, user: User, projectId: number, data: FormData) {
	const taskId = readTaskId(data);
	const values = readTaskForm(data);
	const parsed = TaskInput.safeParse(values);
	if (!parsed.success) return invalid(taskId, z.flattenError(parsed.error).fieldErrors, values);
	try {
		await db.transaction(async (tx) => {
			const before = await lockTask(tx, taskId, projectId);
			await assertUser(tx, parsed.data.assigneeId, 'assigneeId');
			const after = taskValues(parsed.data);
			const changes = diffTask(before, after);
			if (Object.keys(changes).length === 0) return;
			await tx.update(tasks).set(after).where(eq(tasks.id, taskId));
			await auditTask(tx, user.email, 'task.updated', { ...before, title: after.title }, changes);
		});
	} catch (e) {
		if (e instanceof UnknownReferenceError) {
			return invalid(taskId, { assigneeId: ['No longer exists; pick another'] }, values);
		}
		throw e;
	}
}

/** Form action: move a task to another status. projectId null = any project ("My tasks"). */
export async function setTaskStatusAction(
	db: Db,
	user: User,
	projectId: number | null,
	data: FormData
) {
	const taskId = readTaskId(data);
	const status = TaskStatusInput.safeParse(data.get('status'));
	if (!status.success) error(400, 'Unknown status');
	await db.transaction(async (tx) => {
		const before = await lockTask(tx, taskId, projectId);
		if (before.status === status.data) return;
		await tx.update(tasks).set({ status: status.data }).where(eq(tasks.id, taskId));
		await auditTask(tx, user.email, 'task.updated', before, {
			status: { from: before.status, to: status.data }
		});
	});
}

/** Form action: delete a task for good. The audit row keeps its title. */
export async function deleteTaskAction(db: Db, user: User, projectId: number, data: FormData) {
	const taskId = readTaskId(data);
	await db.transaction(async (tx) => {
		const task = await lockTask(tx, taskId, projectId);
		await tx.delete(tasks).where(eq(tasks.id, taskId));
		await auditTask(tx, user.email, 'task.deleted', task, { type: task.type, status: task.status });
	});
}
