function required(name: string, value: string | undefined): string {
	if (!value) throw new Error(`Missing environment variable: ${name}`);
	return value;
}

export const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * The site's own origin for this deployment (reference.md: every internal redirect and absolute link
 * is built from NEXT_PUBLIC_SITE_URL — never from a hardcoded domain or the incoming request's host).
 */
export const SITE_URL = required("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL).replace(/\/$/, "");
export const SITE_NAME = "Merkado PH";

/** Absolute URL on this site for a path ("/cart?x=1", "/#contact"). Use for every internal redirect. */
export function siteUrl(path = "/"): URL {
	return new URL(path.startsWith("/") ? path : `/${path}`, `${SITE_URL}/`);
}

/**
 * Turns a link pointing at this site (any of its absolute URLs) into a path, so stored content never
 * carries a domain. External links and paths are returned unchanged.
 */
export function toSitePath(href: string): string {
	try {
		const url = new URL(href);
		if (url.host === new URL(SITE_URL).host) return `${url.pathname}${url.search}${url.hash}` || "/";
	} catch {
		// Not absolute: already a path.
	}
	return href;
}
