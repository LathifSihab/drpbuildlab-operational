import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	user: { email: locals.user.email, role: locals.user.role }
});
