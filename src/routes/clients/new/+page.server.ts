import { error, fail, redirect } from '@sveltejs/kit';
import { requireRole } from '#lib/server/auth/users.ts';
import {
	auditClient,
	canEditClients,
	canSeeClientPersonalData,
	clientConflicts,
	clientValues
} from '#lib/server/clients.ts';
import { clients } from '#lib/server/db/schema.ts';
import { ClientInput, clientFormErrors, readClientForm } from '#lib/schemas/client.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!canEditClients(locals.user.role)) error(403, 'You cannot create clients');
	return { canSeePersonal: canSeeClientPersonalData(locals.user.role) };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = requireRole(locals.user, ['admin', 'dev', 'business']);
		const values = readClientForm(await request.formData());
		const parsed = ClientInput.safeParse(values);
		if (!parsed.success) return fail(400, { errors: clientFormErrors(parsed.error), values });

		const row = clientValues(parsed.data, canSeeClientPersonalData(user.role));
		const result = await locals.db.transaction(async (tx) => {
			const errors = await clientConflicts(tx, row, null);
			if (Object.keys(errors).length) return { errors };
			const [created] = await tx.insert(clients).values(row).returning({ id: clients.id });
			await auditClient(tx, user.email, 'client.created', created.id, row);
			return { id: created.id };
		});
		if ('errors' in result) return fail(400, { errors: result.errors, values });
		redirect(303, `/clients/${result.id}`);
	}
};
