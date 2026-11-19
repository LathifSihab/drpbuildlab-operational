/**
 * Adds `https://` to a bare domain the way people type it ("terro.be/shop"). Anything that
 * already has a scheme, or does not look like a domain, is left as it is, so validation can still
 * reject it (e.g. `javascript:`).
 */
export function withHttps(raw: string): string {
	const value = raw.trim();
	if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
	if (/^[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/.test(value)) return `https://${value}`;
	return value;
}
