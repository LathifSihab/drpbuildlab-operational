import { error } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';
import {
	BOOTSTRAP_ADMIN_EMAIL,
	CF_ACCESS_AUD,
	CF_ACCESS_TEAM_DOMAIN,
	DATABASE_URL,
	DEV_USER_EMAIL
} from '$app/env/private';
import { AccessError, verifyAccessJwt } from '#lib/server/auth/access.ts';
import { getOrCreateUser } from '#lib/server/auth/users.ts';
import { createDb, getDevDb } from '#lib/server/db/index.ts';

async function identify(request: Request): Promise<string> {
	const token = request.headers.get('cf-access-jwt-assertion');
	// Local dev only: `dev` is false in every build, so this can never apply on Workers.
	if (dev && !token && DEV_USER_EMAIL) return DEV_USER_EMAIL.trim().toLowerCase();

	if (!CF_ACCESS_TEAM_DOMAIN || !CF_ACCESS_AUD) {
		error(500, 'Cloudflare Access is not configured (CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD)');
	}
	try {
		const { email } = await verifyAccessJwt(token, {
			teamDomain: CF_ACCESS_TEAM_DOMAIN,
			audience: CF_ACCESS_AUD
		});
		return email;
	} catch (e) {
		if (e instanceof AccessError) {
			console.warn('access denied:', e.message); // never log the token itself
			error(401, 'Sign in through Cloudflare Access');
		}
		throw e;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const email = await identify(event.request);

	const hyperdrive = event.platform?.env.HYPERDRIVE;
	let close: (() => Promise<void>) | undefined;
	if (hyperdrive) {
		const conn = createDb(hyperdrive.connectionString);
		event.locals.db = conn.db;
		close = conn.close;
	} else if (dev && DATABASE_URL) {
		event.locals.db = getDevDb(DATABASE_URL).db;
	} else {
		error(500, 'No database: HYPERDRIVE binding missing (or DATABASE_URL in local dev)');
	}

	try {
		event.locals.user = await getOrCreateUser(event.locals.db, email, BOOTSTRAP_ADMIN_EMAIL);
		return await resolve(event);
	} finally {
		if (close) event.platform?.ctx.waitUntil(close());
	}
};
