import { defineConfig } from 'drizzle-kit';

// `db:generate` works offline; `db:migrate` and `db:studio` need DATABASE_URL for the target branch.
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL ?? '' },
	verbose: true,
	strict: true
});
