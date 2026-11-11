import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema.ts';

let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

/** Tasks connect to Neon directly (no Hyperdrive) with the environment's DATABASE_URL. */
export function getDb() {
	if (!db) {
		const url = process.env.DATABASE_URL;
		if (!url) throw new Error('DATABASE_URL is not set for this Trigger.dev environment');
		db = drizzle(postgres(url, { max: 3 }), { schema });
	}
	return db;
}
