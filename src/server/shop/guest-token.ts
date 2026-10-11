import "server-only";
import { cookies } from "next/headers";

/**
 * Guest identity for carts and wishlists (shop-reference.md §14.1): a random 32-byte token in an
 * httpOnly cookie. The database only ever stores its SHA-256 hash, so a DB leak can't be used to
 * take over guest carts. The token never appears in URLs, HTML or logs.
 */
export const GUEST_COOKIE = "mph_cart";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days, refreshed on every write

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // 32 bytes, base64url

function newToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`mph-guest:${token}`));
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The guest token from the cookie, if present and well-formed. Safe in Server Components. */
export async function readGuestToken(): Promise<string | null> {
	const value = (await cookies()).get(GUEST_COOKIE)?.value ?? null;
	return value && TOKEN_RE.test(value) ? value : null;
}

/**
 * Returns the guest token, creating the cookie if needed and extending its lifetime.
 * Only callable from Server Actions / Route Handlers (cookies are read-only while rendering).
 */
export async function ensureGuestToken(): Promise<string> {
	const token = (await readGuestToken()) ?? newToken();
	(await cookies()).set(GUEST_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: MAX_AGE,
	});
	return token;
}

/** Forgets this device's guest state (after merging into an account, or on sign-out). */
export async function clearGuestToken() {
	(await cookies()).delete(GUEST_COOKIE);
}
