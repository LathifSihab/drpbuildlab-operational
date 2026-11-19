import { describe, expect, it } from 'vitest';
import { formatDueDate, isOverdue, sortTasks, todayUtc } from './tasks.ts';

describe('isOverdue', () => {
	const today = '2026-11-19';
	it('is true for an open task due before today', () => {
		expect(isOverdue({ status: 'todo', dueDate: '2026-11-18' }, today)).toBe(true);
		expect(isOverdue({ status: 'in_progress', dueDate: '2026-10-01' }, today)).toBe(true);
	});
	it('is false when due today or later, done, or without a date', () => {
		expect(isOverdue({ status: 'todo', dueDate: today }, today)).toBe(false);
		expect(isOverdue({ status: 'todo', dueDate: '2026-12-01' }, today)).toBe(false);
		expect(isOverdue({ status: 'done', dueDate: '2026-11-01' }, today)).toBe(false);
		expect(isOverdue({ status: 'todo', dueDate: null }, today)).toBe(false);
	});
});

describe('sortTasks', () => {
	const t = (
		id: number,
		status: 'todo' | 'in_progress' | 'done',
		dueDate: string | null,
		updated = '2026-11-01'
	) => ({ id, status, dueDate, updatedAt: new Date(updated) });

	it('puts in progress first, then to do by due date (none last), then done newest first', () => {
		const sorted = sortTasks([
			t(1, 'done', null, '2026-11-01'),
			t(2, 'todo', null),
			t(3, 'todo', '2026-12-01'),
			t(4, 'in_progress', null),
			t(5, 'todo', '2026-11-20'),
			t(6, 'done', null, '2026-11-10')
		]);
		expect(sorted.map((x) => x.id)).toEqual([4, 5, 3, 2, 6, 1]);
	});

	it('does not change the input', () => {
		const input = [t(2, 'todo', null), t(1, 'in_progress', null)];
		sortTasks(input);
		expect(input.map((x) => x.id)).toEqual([2, 1]);
	});
});

describe('dates', () => {
	it('formats a due date without shifting it by time zone', () => {
		expect(formatDueDate('2026-12-01')).toBe('1 Dec 2026');
	});
	it('gives today in UTC', () => {
		expect(todayUtc(new Date('2026-11-19T23:30:00Z'))).toBe('2026-11-19');
	});
});
