import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

/** The identity Cloudflare Access vouches for (docs/ARCHITECTURE.md, Auth). */
export type AccessIdentity = { email: string };

export class AccessError extends Error {}

const keySets = new Map<string, JWTVerifyGetKey>();

function teamKeySet(teamDomain: string): JWTVerifyGetKey {
	let keys = keySets.get(teamDomain);
	if (!keys) {
		// jose caches the fetched keys and refetches when Access rotates them
		keys = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
		keySets.set(teamDomain, keys);
	}
	return keys;
}

/**
 * Verifies the `Cf-Access-Jwt-Assertion` header: signature against the team's Access certificates,
 * issuer, audience tag, and expiry. Throws AccessError on anything else.
 */
export async function verifyAccessJwt(
	token: string | null,
	opts: { teamDomain: string; audience: string; keys?: JWTVerifyGetKey }
): Promise<AccessIdentity> {
	if (!token) throw new AccessError('missing Cf-Access-Jwt-Assertion header');
	try {
		const { payload } = await jwtVerify(token, opts.keys ?? teamKeySet(opts.teamDomain), {
			issuer: `https://${opts.teamDomain}`,
			audience: opts.audience,
			algorithms: ['RS256']
		});
		const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
		if (!email) throw new AccessError('token has no email claim');
		return { email };
	} catch (e) {
		if (e instanceof AccessError) throw e;
		throw new AccessError(`invalid Access token: ${(e as Error).message}`);
	}
}
