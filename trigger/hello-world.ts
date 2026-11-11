import { logger, task } from '@trigger.dev/sdk';
import { z } from 'zod';
import { auditLog } from '../src/lib/server/db/schema.ts';
import { getDb } from './db.ts';

const Payload = z.object({ requestedBy: z.string().email() });

/** Phase 1 check: proves the app can trigger a task and the task can write to the database. */
export const helloWorld = task({
	id: 'hello-world',
	run: async (raw: unknown, { ctx }) => {
		const payload = Payload.parse(raw);
		const [row] = await getDb()
			.insert(auditLog)
			.values({
				actor: 'system:hello-world',
				action: 'hello_world',
				entity: 'system',
				diff: {
					requestedBy: payload.requestedBy,
					runId: ctx.run.id,
					environment: ctx.environment.type
				}
			})
			.returning({ id: auditLog.id });
		logger.info('hello-world wrote audit_log row', { id: row.id });
		return { auditLogId: row.id };
	}
});
