// Task display helpers, shared by the project page and "My tasks". Browser-safe.
import type { TaskStatus, TaskType } from './schemas/task.ts';

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
	enhancement: 'Enhancement',
	revision: 'Revision',
	bug_fix: 'Bug fix',
	integration: 'Integration',
	platform_config: 'Platform config',
	maintenance: 'Maintenance',
	other: 'Other'
};

export const TASK_TYPE_HINTS: Record<TaskType, string> = {
	enhancement: 'New or improved functionality',
	revision: 'Rework of something already delivered (client feedback, UAT)',
	bug_fix: 'Something broken',
	integration: 'Tracking pixel, API, third-party service',
	platform_config: 'Shopify, Wix, WordPress settings',
	maintenance: 'Updates, renewals, checks',
	other: 'Anything else'
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
	todo: 'To do',
	in_progress: 'In progress',
	done: 'Done'
};

/** Field names in task history entries. */
export const TASK_FIELD_LABELS: Record<string, string> = {
	title: 'Title',
	type: 'Type',
	status: 'Status',
	description: 'Description',
	assigneeId: 'Assignee',
	dueDate: 'Due date'
};

/** The one-click next step for a task's status. */
export const NEXT_STATUS: Record<TaskStatus, { to: TaskStatus; label: string }> = {
	todo: { to: 'in_progress', label: 'Start' },
	in_progress: { to: 'done', label: 'Mark done' },
	done: { to: 'todo', label: 'Reopen' }
};

/** Today as YYYY-MM-DD in UTC. The server passes it to the page so SSR and browser agree. */
export function todayUtc(now = new Date()): string {
	return now.toISOString().slice(0, 10);
}

/** An open task whose due date is before today. Dates are YYYY-MM-DD, so strings compare. */
export function isOverdue(
	task: { status: TaskStatus; dueDate: string | null },
	today: string
): boolean {
	return task.status !== 'done' && task.dueDate !== null && task.dueDate < today;
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });

/** "2026-11-19" -> "19 Nov 2026". */
export function formatDueDate(date: string): string {
	return dateFormat.format(new Date(`${date}T00:00:00Z`));
}

const STATUS_RANK: Record<TaskStatus, number> = { in_progress: 0, todo: 1, done: 2 };

/**
 * Work order: in progress, then to do, each by due date (none last); done last, most recently
 * changed first.
 */
export function sortTasks<
	T extends { id: number; status: TaskStatus; dueDate: string | null; updatedAt: Date }
>(tasks: readonly T[]): T[] {
	return [...tasks].sort((a, b) => {
		const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
		if (rank !== 0) return rank;
		if (a.status === 'done') return b.updatedAt.getTime() - a.updatedAt.getTime();
		if (a.dueDate !== b.dueDate) {
			if (a.dueDate === null) return 1;
			if (b.dueDate === null) return -1;
			return a.dueDate < b.dueDate ? -1 : 1;
		}
		return a.id - b.id;
	});
}
