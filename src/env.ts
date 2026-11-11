import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

const optional = z
	.string()
	.trim()
	.optional()
	.transform((v) => v || undefined);

export const variables = defineEnvVars({
	CF_ACCESS_TEAM_DOMAIN: {
		description:
			'Cloudflare Access team domain, e.g. drp.cloudflareaccess.com. Required outside local dev.',
		schema: optional
	},
	CF_ACCESS_AUD: {
		description:
			'Audience (AUD) tag of the Cloudflare Access application. Required outside local dev.',
		schema: optional
	},
	BOOTSTRAP_ADMIN_EMAIL: {
		description:
			'This email gets the admin role when it first signs in. Every other new user starts as business.',
		schema: optional
	},
	DEV_USER_EMAIL: {
		description:
			'Local dev only: signed-in user when there is no Cloudflare Access header. Ignored outside `vite dev`.',
		schema: optional
	},
	DATABASE_URL: {
		description:
			'Local dev only: Postgres connection string. Staging and production use the Hyperdrive binding.',
		schema: optional
	},
	TRIGGER_SECRET_KEY: {
		description: 'Trigger.dev secret key for this environment, used to trigger tasks from the app.',
		schema: optional
	},
	TRIGGER_API_URL: {
		description: 'Trigger.dev API base URL.',
		schema: (v) => v || 'https://api.trigger.dev'
	}
});
