import { TRIGGER_API_URL, TRIGGER_SECRET_KEY } from '$app/env/private';

/**
 * Triggers a Trigger.dev task over the REST API. Plain fetch keeps the Workers bundle free of
 * Node-only code; the tasks themselves run on Trigger.dev (trigger/).
 */
export async function triggerTask(taskId: string, payload: unknown): Promise<{ id: string }> {
	if (!TRIGGER_SECRET_KEY) throw new Error('TRIGGER_SECRET_KEY is not set');
	const res = await fetch(`${TRIGGER_API_URL}/api/v1/tasks/${encodeURIComponent(taskId)}/trigger`, {
		method: 'POST',
		headers: { authorization: `Bearer ${TRIGGER_SECRET_KEY}`, 'content-type': 'application/json' },
		body: JSON.stringify({ payload })
	});
	if (!res.ok) throw new Error(`Trigger.dev returned ${res.status} for task ${taskId}`);
	return (await res.json()) as { id: string };
}
