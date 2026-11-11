import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import type { User } from '../db/schema.ts';
import { initialRole, requireRole } from './users.ts';

const user = (role: User['role']) => ({ id: 1, email: 'x@drpbuildlab.com', role }) as User;

describe('initialRole', () => {
	it('gives admin only to the bootstrap admin email, case-insensitively', () => {
		expect(initialRole('owner@drpbuildlab.com', ' Owner@DRPbuildlab.com ')).toBe('admin');
	});
	it('gives everyone else the business role', () => {
		expect(initialRole('someone@drpbuildlab.com', 'owner@drpbuildlab.com')).toBe('business');
		expect(initialRole('someone@drpbuildlab.com', undefined)).toBe('business');
	});
});

describe('requireRole', () => {
	it('returns the user when the role is allowed', () => {
		expect(requireRole(user('dev'), ['admin', 'dev']).role).toBe('dev');
	});
	it('throws 403 when the role is not allowed', () => {
		try {
			requireRole(user('business'), ['admin', 'dev']);
			expect.unreachable();
		} catch (e) {
			expect(isHttpError(e, 403)).toBe(true);
		}
	});
	it('throws 401 without a user', () => {
		try {
			requireRole(null, ['admin']);
			expect.unreachable();
		} catch (e) {
			expect(isHttpError(e, 401)).toBe(true);
		}
	});
});
