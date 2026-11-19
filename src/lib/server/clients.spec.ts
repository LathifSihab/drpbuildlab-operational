import { describe, expect, it } from 'vitest';
import type { ClientInput } from '../schemas/client.ts';
import { clientValues, diffClient, hidePersonalData, HIDDEN } from './clients.ts';
import type { Client } from './db/schema.ts';

const before = {
	id: 1,
	name: 'TÈRRO',
	isPartner: false,
	emailDomains: ['terro.be'],
	// Postgres jsonb returns keys in its own order, not the order they were written in.
	contacts: [{ role: 'Owner', name: 'An', email: 'an@terro.be' }],
	notes: 'Prefers phone',
	createdAt: new Date(),
	updatedAt: new Date()
} as Client;

const input: ClientInput = {
	name: 'TÈRRO',
	kind: 'client',
	emailDomains: ['terro.be'],
	notes: 'Prefers phone',
	contacts: [{ name: 'An', email: 'an@terro.be', phone: undefined, role: 'Owner' }]
};

describe('clientValues', () => {
	it('leaves contacts and notes out for people without access', () => {
		expect(clientValues(input, false)).toEqual({
			name: 'TÈRRO',
			isPartner: false,
			emailDomains: ['terro.be']
		});
	});
});

describe('diffClient', () => {
	it('sees no change when only the stored key order differs', () => {
		expect(diffClient(before, clientValues(input, true))).toEqual({});
	});

	it('lists changed fields with from/to', () => {
		const after = clientValues({ ...input, kind: 'partner', notes: null }, true);
		expect(diffClient(before, after)).toEqual({
			isPartner: { from: false, to: true },
			notes: { from: 'Prefers phone', to: null }
		});
	});

	it('never reports contacts or notes for a save without access', () => {
		expect(diffClient(before, clientValues({ ...input, notes: null }, false))).toEqual({});
	});
});

describe('hidePersonalData', () => {
	it('masks contacts and notes in updates and in full rows', () => {
		expect(
			hidePersonalData({
				name: { from: 'A', to: 'B' },
				notes: { from: 'x', to: 'y' },
				contacts: [{ name: 'An' }]
			})
		).toEqual({
			name: { from: 'A', to: 'B' },
			notes: { from: HIDDEN, to: HIDDEN },
			contacts: HIDDEN
		});
	});
});
