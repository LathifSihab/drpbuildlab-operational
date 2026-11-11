import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { users, type Role, type User } from '../db/schema.ts';

/** New users start with the least access; only the bootstrap admin starts as admin. */
export function initialRole(email: string, bootstrapAdminEmail: string | undefined): Role {
	return bootstrapAdminEmail && email === bootstrapAdminEmail.trim().toLowerCase()
		? 'admin'
		: 'business';
}

/** Loads the user for a verified email, creating the row on first sign-in. */
export async function getOrCreateUser(
	db: Db,
	email: string,
	bootstrapAdminEmail: string | undefined
): Promise<User> {
	const now = new Date();
	const [existing] = await db
		.update(users)
		.set({ lastSeenAt: now })
		.where(eq(users.email, email))
		.returning();
	if (existing) return existing;

	const [created] = await db
		.insert(users)
		.values({ email, role: initialRole(email, bootstrapAdminEmail), lastSeenAt: now })
		.onConflictDoUpdate({ target: users.email, set: { lastSeenAt: now } })
		.returning();
	return created;
}

/** Call in every load and action that needs more than a signed-in user. */
export function requireRole(user: User | null, allowed: readonly Role[]): User {
	if (!user) error(401, 'Not signed in');
	if (!allowed.includes(user.role)) error(403, 'You do not have access to this page');
	return user;
}
