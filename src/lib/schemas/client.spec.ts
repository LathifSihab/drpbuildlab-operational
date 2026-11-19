import { describe, expect, it } from 'vitest';
import {
	ClientInput,
	clientFormErrors,
	readClientForm,
	splitDomains,
	type ClientFormValues
} from './client.ts';

const form = (over: Partial<ClientFormValues>): ClientFormValues => ({
	name: 'TÈRRO Vastgoed',
	kind: 'client',
	emailDomains: '',
	notes: '',
	contacts: [],
	...over
});

const contact = (over: Partial<Record<'name' | 'email' | 'phone' | 'role', string>>) => ({
	name: '',
	email: '',
	phone: '',
	role: '',
	...over
});

describe('splitDomains', () => {
	it('lowercases, strips "@", splits on commas/spaces/semicolons, and dedupes', () => {
		expect(splitDomains(' @Terro.be, terro.nl;TERRO.BE  ')).toEqual(['terro.be', 'terro.nl']);
	});
});

describe('ClientInput', () => {
	it('accepts a minimal client', () => {
		const r = ClientInput.parse(form({}));
		expect(r).toMatchObject({ name: 'TÈRRO Vastgoed', kind: 'client', emailDomains: [] });
		expect(r.notes).toBeNull();
	});

	it('requires a name and a known kind', () => {
		expect(ClientInput.safeParse(form({ name: '  ' })).success).toBe(false);
		expect(ClientInput.safeParse(form({ kind: 'vendor' })).success).toBe(false);
	});

	it('rejects invalid, shared-mail and DRP domains, naming each one', () => {
		const r = ClientInput.safeParse(
			form({ emailDomains: 'terro.be, terro, gmail.com, drpbuildlab.com' })
		);
		expect(r.success).toBe(false);
		const messages = r.success ? [] : clientFormErrors(r.error).emailDomains;
		expect(messages).toHaveLength(3);
		expect(messages?.join(' ')).toContain('“terro” is not a domain');
		expect(messages?.join(' ')).toContain('gmail.com');
		expect(messages?.join(' ')).toContain("DRP's own domain");
	});

	it('validates contacts and keys errors by row and field', () => {
		const r = ClientInput.safeParse(
			form({ contacts: [contact({ name: 'An' }), contact({ email: 'not-an-email' })] })
		);
		expect(r.success).toBe(false);
		const errors = r.success ? {} : clientFormErrors(r.error);
		expect(Object.keys(errors).sort()).toEqual(['contacts.1.email', 'contacts.1.name']);
	});

	it('drops empty optional contact fields', () => {
		const r = ClientInput.parse(
			form({ contacts: [contact({ name: 'An', email: 'an@terro.be' })] })
		);
		expect(r.contacts[0]).toEqual({
			name: 'An',
			email: 'an@terro.be',
			phone: undefined,
			role: undefined
		});
	});
});

describe('readClientForm', () => {
	it('reads parallel contact lists and skips fully empty rows', () => {
		const fd = new FormData();
		fd.set('name', 'Acme');
		fd.set('kind', 'partner');
		for (const [n, e] of [
			['An', 'an@acme.be'],
			['', ''],
			['Bo', '']
		]) {
			fd.append('contactName', n);
			fd.append('contactEmail', e);
			fd.append('contactPhone', '');
			fd.append('contactRole', '');
		}
		const values = readClientForm(fd);
		expect(values.kind).toBe('partner');
		expect(values.notes).toBe('');
		expect(values.contacts.map((c) => c.name)).toEqual(['An', 'Bo']);
	});
});
