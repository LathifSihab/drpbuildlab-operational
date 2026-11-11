import { defineConfig } from '@trigger.dev/sdk';

// Trigger.dev tasks run on Node (docs/ARCHITECTURE.md). Every Graph and Claude call lives in trigger/.
export default defineConfig({
	// Project ref from the Trigger.dev dashboard (Project settings). Set TRIGGER_PROJECT_REF in .env.
	project: process.env.TRIGGER_PROJECT_REF ?? 'proj_REPLACE_ME',
	dirs: ['./trigger'],
	runtime: 'node',
	maxDuration: 300,
	retries: {
		enabledInDev: false,
		default: { maxAttempts: 3, minTimeoutInMs: 1000, maxTimeoutInMs: 30_000, factor: 2 }
	}
});
