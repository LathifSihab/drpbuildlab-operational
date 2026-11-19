import { describe, expect, it } from 'vitest';
import { PROJECT_FIELDS, ProjectInput, readProjectForm } from './project.ts';

const base = Object.fromEntries(PROJECT_FIELDS.map((f) => [f, ''])) as Record<string, string>;
const form = (over: Record<string, string>) => ({
	...base,
	phase: 'lead',
	platform: 'unknown',
	...over
});

describe('ProjectInput', () => {
	it('accepts a minimal project and turns empty fields into null', () => {
		const r = ProjectInput.parse(form({ title: '  TÈRRO website  ' }));
		expect(r.title).toBe('TÈRRO website');
		expect(r.clientId).toBeNull();
		expect(r.siteUrl).toBeNull();
		expect(r.tools).toEqual([]);
	});

	it('requires a title', () => {
		const r = ProjectInput.safeParse(form({ title: '   ' }));
		expect(r.success).toBe(false);
	});

	it('rejects non-http links such as javascript:', () => {
		expect(
			ProjectInput.safeParse(form({ title: 'x', siteUrl: 'javascript:alert(1)' })).success
		).toBe(false);
		expect(ProjectInput.safeParse(form({ title: 'x', repoUrl: 'ftp://example.com' })).success).toBe(
			false
		);
		expect(ProjectInput.parse(form({ title: 'x', siteUrl: 'https://terro.be' })).siteUrl).toBe(
			'https://terro.be'
		);
	});

	it('splits tools on commas, trims, and removes duplicates', () => {
		expect(
			ProjectInput.parse(form({ title: 'x', tools: ' Shopify, Helium ,,Shopify' })).tools
		).toEqual(['Shopify', 'Helium']);
	});

	it('parses ids and rejects junk', () => {
		expect(ProjectInput.parse(form({ title: 'x', clientId: '7' })).clientId).toBe(7);
		expect(ProjectInput.safeParse(form({ title: 'x', clientId: 'abc' })).success).toBe(false);
		expect(ProjectInput.safeParse(form({ title: 'x', clientId: '-1' })).success).toBe(false);
	});

	it('reads the PIC as an optional user id', () => {
		expect(ProjectInput.parse(form({ title: 'x' })).picId).toBeNull();
		expect(ProjectInput.parse(form({ title: 'x', picId: '3' })).picId).toBe(3);
		expect(ProjectInput.safeParse(form({ title: 'x', picId: 'me' })).success).toBe(false);
	});

	it('rejects unknown phases and platforms', () => {
		expect(ProjectInput.safeParse(form({ title: 'x', phase: 'shipped' })).success).toBe(false);
		expect(ProjectInput.safeParse(form({ title: 'x', platform: 'joomla' })).success).toBe(false);
	});
});

describe('readProjectForm', () => {
	it('reads every known field and ignores the rest', () => {
		const fd = new FormData();
		fd.set('title', 'A');
		fd.set('evil', 'x');
		const values = readProjectForm(fd);
		expect(values.title).toBe('A');
		expect(values.notes).toBe('');
		expect('evil' in values).toBe(false);
	});
});
