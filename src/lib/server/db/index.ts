import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';

export type Db = ReturnType<typeof createDb>['db'];

/**
 * One client per request: on Workers, Hyperdrive pools the real connections.
 * Call `close()` after the response (via waitUntil) so the socket is released.
 */
export function createDb(connectionString: string) {
	const client = postgres(connectionString, {
		max: 5,
		fetch_types: false, // avoids an extra round trip; we use no custom types
		prepare: true
	});
	return { db: drizzle(client, { schema }), close: () => client.end({ timeout: 5 }) };
}

let devDb: ReturnType<typeof createDb> | undefined;

/** Local dev reuses one client so hot reloads don't open a connection per request. */
export function getDevDb(connectionString: string) {
	devDb ??= createDb(connectionString);
	return devDb;
}
