import { describe, expect, it } from 'vitest';
import type { Project } from './db/schema.ts';
import { diffProject, slugify, type ProjectValues } from './projects.ts';

describe('slugify', () => {
	it('makes readable, accent-free slugs', () => {
		expect(slugify('TÈRRO Vastgoed – branding & website')).toBe('terro-vastgoed-branding-website');
	});
	it('falls back when nothing usable is left', () => {
		expect(slugify('***')).toBe('project');
	});
});

describe('diffProject', () => {
	const before = {
		title: 'Old',
		clientId: 1,
		partnerId: null,
		accountManagerId: null,
		phase: 'lead',
		platform: 'unknown',
		platformDetail: null,
		productType: null,
		siteUrl: null,
		stagingUrl: null,
		productionUrl: null,
		repoUrl: null,
		domainRegistrar: null,
		tools: ['a'],
		notes: null
	} as unknown as Project;

	it('lists only changed fields with from/to', () => {
		const after = {
			...before,
			title: 'New',
			phase: 'build',
			tools: ['a']
		} as unknown as ProjectValues;
		expect(diffProject(before, after)).toEqual({
			title: { from: 'Old', to: 'New' },
			phase: { from: 'lead', to: 'build' }
		});
	});

	it('is empty when nothing changed', () => {
		expect(diffProject(before, { ...before } as unknown as ProjectValues)).toEqual({});
	});
});
