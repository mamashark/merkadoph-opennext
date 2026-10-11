/** Session cookie flags (security.md §2): HTTPS-only in production, never sent cross-site on POST. */
export const SESSION_COOKIE_OPTIONS = {
	path: "/",
	sameSite: "lax",
	secure: process.env.NODE_ENV === "production",
} as const;
