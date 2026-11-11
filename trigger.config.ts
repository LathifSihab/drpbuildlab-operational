import { defineConfig } from '@trigger.dev/sdk';

// Trigger.dev tasks run on Node (docs/ARCHITECTURE.md). Every Graph and Claude call lives in trigger/.
export default defineConfig({
	// Trigger.dev project "drp-operational" (not a secret).
	project: 'proj_nrywgvbrfplqknvjimwg',
	dirs: ['./trigger'],
	runtime: 'node',
	maxDuration: 300,
	retries: {
		enabledInDev: false,
		default: { maxAttempts: 3, minTimeoutInMs: 1000, maxTimeoutInMs: 30_000, factor: 2 }
	}
});
