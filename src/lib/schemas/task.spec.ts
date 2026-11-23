import { describe, expect, it } from 'vitest';
import { readTaskForm, TASK_FIELDS, TaskInput, TaskProjectId } from './task.ts';

const base = Object.fromEntries(TASK_FIELDS.map((f) => [f, ''])) as Record<string, string>;
const form = (over: Record<string, string>) => ({ ...base, type: 'enhancement', ...over });

describe('TaskInput', () => {
	it('accepts a minimal task: new tasks start as to do, empty fields become null', () => {
		const r = TaskInput.parse(form({ title: '  Add Klaviyo form  ' }));
		expect(r).toEqual({
			title: 'Add Klaviyo form',
			type: 'enhancement',
			status: 'todo',
			description: null,
			assigneeId: null,
			dueDate: null
		});
	});

	it('requires a title and a known type', () => {
		expect(TaskInput.safeParse(form({ title: ' ' })).success).toBe(false);
		expect(TaskInput.safeParse(form({ title: 'x', type: '' })).success).toBe(false);
		expect(TaskInput.safeParse(form({ title: 'x', type: 'feature' })).success).toBe(false);
	});

	it('accepts enhancement and revision', () => {
		expect(TaskInput.parse(form({ title: 'x', type: 'revision' })).type).toBe('revision');
		expect(TaskInput.parse(form({ title: 'x', type: 'enhancement' })).type).toBe('enhancement');
	});

	it('rejects unknown statuses', () => {
		expect(TaskInput.parse(form({ title: 'x', status: 'done' })).status).toBe('done');
		expect(TaskInput.safeParse(form({ title: 'x', status: 'blocked' })).success).toBe(false);
	});

	it('parses the assignee id and the due date', () => {
		const r = TaskInput.parse(form({ title: 'x', assigneeId: '3', dueDate: '2026-12-01' }));
		expect(r.assigneeId).toBe(3);
		expect(r.dueDate).toBe('2026-12-01');
		expect(TaskInput.safeParse(form({ title: 'x', assigneeId: 'me' })).success).toBe(false);
		expect(TaskInput.safeParse(form({ title: 'x', dueDate: '01-12-2026' })).success).toBe(false);
		expect(TaskInput.safeParse(form({ title: 'x', dueDate: '2026-02-30' })).success).toBe(false);
	});
});

describe('readTaskForm', () => {
	it('reads every known field and ignores the rest', () => {
		const fd = new FormData();
		fd.set('title', 'A');
		fd.set('projectId', '99');
		const r = readTaskForm(fd);
		expect(r.title).toBe('A');
		expect(r.status).toBe('');
		expect('projectId' in r).toBe(false);
	});
});

describe('TaskProjectId', () => {
	it('reads a picked project and refuses an empty or bad pick', () => {
		expect(TaskProjectId.parse('12')).toBe(12);
		for (const bad of ['', '0', '-3', 'abc', null]) {
			expect(TaskProjectId.safeParse(bad).success).toBe(false);
		}
	});
});
