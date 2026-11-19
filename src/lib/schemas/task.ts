import { z } from 'zod';

/**
 * Single source for these lists: the database enums (db/schema.ts) are built from them.
 * - enhancement: new or improved functionality on a live project
 * - revision: rework of something DRP already delivered (client feedback, UAT rounds)
 * - the rest match the small-job request types (docs/ARCHITECTURE.md, Projects and requests)
 */
export const TASK_TYPES = [
	'enhancement',
	'revision',
	'bug_fix',
	'integration',
	'platform_config',
	'maintenance',
	'other'
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Names of the fields the task form sends. */
export const TASK_FIELDS = [
	'title',
	'type',
	'status',
	'description',
	'assigneeId',
	'dueDate'
] as const;
export type TaskField = (typeof TASK_FIELDS)[number];

const id = z
	.string()
	.trim()
	.transform((v) => (v ? Number(v) : null))
	.pipe(z.number().int().positive().nullable());

export const TaskInput = z.object({
	title: z.string().trim().min(1, 'Title is required').max(200, 'At most 200 characters'),
	type: z.enum(TASK_TYPES, { error: 'Pick a type' }),
	// A new task has no status field on the form and starts as to do.
	status: z
		.string()
		.transform((v) => v || 'todo')
		.pipe(z.enum(TASK_STATUSES, { error: 'Pick a status' })),
	description: z
		.string()
		.trim()
		.max(10_000, 'At most 10000 characters')
		.transform((v) => v || null),
	assigneeId: id,
	// <input type="date"> sends YYYY-MM-DD, or an empty string.
	dueDate: z
		.string()
		.trim()
		.transform((v) => v || null)
		.pipe(z.iso.date({ error: 'Enter a date' }).nullable())
});
export type TaskInput = z.infer<typeof TaskInput>;

export const TaskStatusInput = z.enum(TASK_STATUSES);

/** A task id from a hidden form field. */
export const TaskId = z.coerce.number().int().positive();

/** Reads the task form. Missing fields count as empty strings. */
export function readTaskForm(data: FormData): Record<TaskField, string> {
	return Object.fromEntries(
		TASK_FIELDS.map((f) => {
			const v = data.get(f);
			return [f, typeof v === 'string' ? v : ''];
		})
	) as Record<TaskField, string>;
}
