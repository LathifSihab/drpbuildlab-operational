// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Db } from '#lib/server/db/index.ts';
import type { User } from '#lib/server/db/schema.ts';

declare global {
	namespace App {
		interface Locals {
			db: Db;
			user: User;
		}
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
		}
	}
}

export {};
