import { describe, expect, it } from 'vitest';
import {
	businessDomain,
	formatEur,
	phaseFor,
	projectTitles,
	quoteClient,
	quoteProject,
	skipReason,
	type CzQuote
} from './map.ts';

const quote = (over: Partial<CzQuote>): CzQuote => ({
	id: 'q1',
	reference: 'Q-2026-AAAAAA',
	client_name: 'Tuinen De Ridder',
	client_email: 'info@deridder.be',
	client_type: 'business',
	client_company_number: null,
	title: 'Beginnerspakket — €499',
	lines: [],
	total_due: 60379,
	status: 'open',
	label: null,
	billing: 'once',
	issued_at: '2026-10-05T00:00:00Z',
	paid_at: null,
	partner_id: null,
	partner_code: null,
	lead_first_name: 'Jan',
	lead_last_name: 'De Ridder',
	lead_phone: null,
	...over
});

describe('skipReason', () => {
	it('skips cancelled, outdated, test and --skip quotes', () => {
		expect(skipReason(quote({ status: 'cancelled' }))).toBe('cancelled');
		expect(skipReason(quote({ label: 'outdated' }))).toMatch(/outdated/);
		expect(skipReason(quote({ client_name: 'TEST Lathif (ignore)' }))).toMatch(/test/);
		expect(skipReason(quote({}), new Set(['Q-2026-AAAAAA']))).toMatch(/--skip/);
	});

	it('imports open and paid quotes, even with "test" inside a word', () => {
		expect(skipReason(quote({ status: 'paid' }))).toBeNull();
		expect(skipReason(quote({ client_name: 'Contest BV' }))).toBeNull();
	});
});

describe('phaseFor', () => {
	it('maps quote status to project phase', () => {
		expect(phaseFor({ status: 'open' })).toBe('proposal');
		expect(phaseFor({ status: 'paid' })).toBe('build');
		expect(phaseFor({ status: 'accepted' })).toBe('build');
		expect(phaseFor({ status: 'ended' })).toBe('closed');
		expect(phaseFor({ status: 'expired' })).toBe('lost');
	});
});

describe('businessDomain', () => {
	it('keeps a business domain, never a shared mailbox, DRP, or a private client', () => {
		expect(businessDomain(quote({}))).toBe('deridder.be');
		expect(businessDomain(quote({ client_email: 'jan@gmail.com' }))).toBeNull();
		expect(businessDomain(quote({ client_email: 'x@drpbuildlab.com' }))).toBeNull();
		expect(businessDomain(quote({ client_type: 'private' }))).toBeNull();
	});
});

describe('quoteClient', () => {
	it('merges all quotes of one client: contacts by email, domains, company number', () => {
		const c = quoteClient([
			quote({ client_name: ' Niva  liften', client_company_number: 'BE0123' }),
			quote({ lead_phone: '+32 470 00 00 00' }),
			quote({ client_email: 'Boekhouding@deridder.be', lead_first_name: 'An', lead_last_name: '' })
		]);
		expect(c.name).toBe('Niva liften');
		expect(c.isPartner).toBe(false);
		expect(c.emailDomains).toEqual(['deridder.be']);
		expect(c.contacts).toEqual([
			{ name: 'Jan De Ridder', email: 'info@deridder.be', phone: '+32 470 00 00 00' },
			{ name: 'An', email: 'boekhouding@deridder.be', phone: undefined }
		]);
		expect(c.notes).toContain('Company number: BE0123.');
	});
});

describe('projectTitles', () => {
	it('adds the reference only when two imported quotes would share a title', () => {
		const titles = projectTitles([
			quote({ reference: 'Q-1', client_name: 'TuinZorg DP', title: 'Op maat' }),
			quote({ reference: 'Q-2', client_name: 'tuinzorg dp', title: 'Op maat' }),
			quote({ reference: 'Q-3', client_name: 'Trovana', title: 'Op maat' })
		]);
		expect(titles.get('Q-1')).toBe('TuinZorg DP · Op maat (Q-1)');
		expect(titles.get('Q-2')).toBe('tuinzorg dp · Op maat (Q-2)');
		expect(titles.get('Q-3')).toBe('Trovana · Op maat');
	});
});

describe('quoteProject', () => {
	it('keeps the quote reference, dates, total and lines in the notes', () => {
		const p = quoteProject(
			quote({
				status: 'paid',
				paid_at: '2026-10-12T09:00:00Z',
				partner_code: 'MOSDESIGN',
				lines: [{ name: 'Website', detail: 'one page', amount: 49900 }]
			}),
			'Tuinen De Ridder · Beginnerspakket'
		);
		expect(p.phase).toBe('build');
		expect(p.productType).toBe('Beginnerspakket — €499');
		expect(p.notes).toContain('quote Q-2026-AAAAAA (paid 12 Oct 2026)');
		expect(p.notes).toContain(`Total due ${formatEur(60379)} incl. VAT.`);
		expect(p.notes).toContain('Referred by partner code MOSDESIGN.');
		expect(p.notes).toContain(`- Website (one page): ${formatEur(49900)}`);
	});
});
