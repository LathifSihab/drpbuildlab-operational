import { describe, expect, it } from 'vitest';
import { withHttps } from './url.ts';

describe('withHttps', () => {
	it('adds https:// to bare domains and paths', () => {
		expect(withHttps(' terro.be ')).toBe('https://terro.be');
		expect(withHttps('shop.terro.be/nl?x=1')).toBe('https://shop.terro.be/nl?x=1');
	});

	it('leaves links with a scheme alone, including ones validation must reject', () => {
		expect(withHttps('http://terro.be')).toBe('http://terro.be');
		expect(withHttps('javascript:alert(1)')).toBe('javascript:alert(1)');
		expect(withHttps('ftp://x.be')).toBe('ftp://x.be');
	});

	it('leaves empty and non-domain text alone', () => {
		expect(withHttps('')).toBe('');
		expect(withHttps('not a url')).toBe('not a url');
		expect(withHttps('terro')).toBe('terro');
	});
});
