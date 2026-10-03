/**
 * Staging gate for the public site (used by src/proxy.ts — keep this file edge/proxy-safe).
 *
 * While the site is in "coming soon" mode, every public page is hidden behind a key:
 *   https://<site>/?staged=<STAGE_KEY>
 * A valid key sets a cookie (so the key never has to be pasted again) and the URL is cleaned.
 *   ?staged=off  → forget the cookie and lock the site again for this browser.
 *
 * The gate is on in production builds until launch (NEXT_PUBLIC_HOMEPAGE_LIVE=true).
 * In `npm run dev` it is off, so everything is reachable locally.
 */
export const STAGE_PARAM = "staged";
export const STAGE_COOKIE = "mph_stage";
export const STAGE_COOKIE_MAX_AGE = 30 * 24 * 3600;

export function stageGateEnabled(): boolean {
	return process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_HOMEPAGE_LIVE !== "true";
}

/** Cookie value: a hash of the key, so the key itself is never stored in the browser. Changing STAGE_KEY revokes every cookie. */
export async function stageToken(key: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`merkadoph-stage:${key}`));
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
	const enc = new TextEncoder();
	const x = enc.encode(a);
	const y = enc.encode(b);
	let diff = x.length ^ y.length;
	for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
	return diff === 0;
}
