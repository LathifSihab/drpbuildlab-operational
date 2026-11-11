import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { AccessError, verifyAccessJwt } from './access.ts';

const teamDomain = 'drp-test.cloudflareaccess.com';
const audience = 'aud-tag-123';

let privateKey: CryptoKey;
let keys: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
	const pair = await generateKeyPair('RS256');
	privateKey = pair.privateKey;
	keys = createLocalJWKSet({
		keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256' }]
	});
});

function token(
	claims: Record<string, unknown>,
	opts: { aud?: string; iss?: string; exp?: string } = {}
) {
	return new SignJWT(claims)
		.setProtectedHeader({ alg: 'RS256', kid: 'k1' })
		.setIssuer(opts.iss ?? `https://${teamDomain}`)
		.setAudience(opts.aud ?? audience)
		.setIssuedAt()
		.setExpirationTime(opts.exp ?? '5m')
		.sign(privateKey);
}

const verify = (t: string | null) => verifyAccessJwt(t, { teamDomain, audience, keys });

describe('verifyAccessJwt', () => {
	it('returns the lowercased email from a valid token', async () => {
		await expect(verify(await token({ email: 'Dev@DRPbuildlab.com' }))).resolves.toEqual({
			email: 'dev@drpbuildlab.com'
		});
	});

	it('rejects a missing header', async () => {
		await expect(verify(null)).rejects.toBeInstanceOf(AccessError);
	});

	it('rejects another Access application (wrong audience)', async () => {
		await expect(
			verify(await token({ email: 'a@b.c' }, { aud: 'other-app' }))
		).rejects.toBeInstanceOf(AccessError);
	});

	it('rejects another team (wrong issuer)', async () => {
		await expect(
			verify(await token({ email: 'a@b.c' }, { iss: 'https://evil.cloudflareaccess.com' }))
		).rejects.toBeInstanceOf(AccessError);
	});

	it('rejects an expired token', async () => {
		await expect(verify(await token({ email: 'a@b.c' }, { exp: '-1m' }))).rejects.toBeInstanceOf(
			AccessError
		);
	});

	it('rejects a token signed by another key', async () => {
		const other = await generateKeyPair('RS256');
		const forged = await new SignJWT({ email: 'a@b.c' })
			.setProtectedHeader({ alg: 'RS256', kid: 'k1' })
			.setIssuer(`https://${teamDomain}`)
			.setAudience(audience)
			.setExpirationTime('5m')
			.sign(other.privateKey);
		await expect(verify(forged)).rejects.toBeInstanceOf(AccessError);
	});

	it('rejects a token without an email (e.g. a service token)', async () => {
		await expect(verify(await token({ common_name: 'svc' }))).rejects.toBeInstanceOf(AccessError);
	});
});
