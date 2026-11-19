import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { clients, projects } from '#lib/server/db/schema.ts';
import { canEditClients } from '#lib/server/clients.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const kindParam = url.searchParams.get('kind');
	const kind = kindParam === 'client' || kindParam === 'partner' ? kindParam : null;
	const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

	const rows = await locals.db
		.select({
			id: clients.id,
			name: clients.name,
			isPartner: clients.isPartner,
			emailDomains: clients.emailDomains,
			updatedAt: clients.updatedAt,
			// Projects in the list (not deleted), as end client or as partner.
			projectCount: sql<number>`(
				select count(*)::int from ${projects}
				where (${projects.clientId} = ${clients.id} or ${projects.partnerId} = ${clients.id})
				and ${projects.deletedAt} is null
			)`
		})
		.from(clients)
		.where(
			and(
				kind ? eq(clients.isPartner, kind === 'partner') : undefined,
				q
					? or(
							ilike(clients.name, pattern),
							sql`array_to_string(${clients.emailDomains}, ' ') ilike ${pattern}`
						)
					: undefined
			)
		)
		.orderBy(asc(sql`lower(${clients.name})`))
		.limit(500);

	return { clients: rows, q, kind, canCreate: canEditClients(locals.user.role) };
};
