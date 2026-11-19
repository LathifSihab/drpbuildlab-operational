import { describe, expect, it } from 'vitest';
import type { Task } from './db/schema.ts';
import { canEditTasks, diffTask, type TaskValues } from './tasks.ts';

describe('diffTask', () => {
	const before = {
		id: 1,
		projectId: 7,
		title: 'Fix checkout',
		type: 'bug_fix',
		status: 'todo',
		description: null,
		assigneeId: null,
		dueDate: null
	} as unknown as Task;

	const values = (over: Partial<TaskValues>): TaskValues => ({
		title: 'Fix checkout',
		type: 'bug_fix',
		status: 'todo',
		description: null,
		assigneeId: null,
		dueDate: null,
		...over
	});

	it('lists only changed fields with from/to', () => {
		expect(diffTask(before, values({ status: 'done', assigneeId: 3, type: 'revision' }))).toEqual({
			status: { from: 'todo', to: 'done' },
			assigneeId: { from: null, to: 3 },
			type: { from: 'bug_fix', to: 'revision' }
		});
	});

	it('is empty when nothing changed', () => {
		expect(diffTask(before, values({}))).toEqual({});
	});
});

describe('canEditTasks', () => {
	it('lets every role manage tasks', () => {
		expect(canEditTasks('admin')).toBe(true);
		expect(canEditTasks('dev')).toBe(true);
		expect(canEditTasks('business')).toBe(true);
	});
});
