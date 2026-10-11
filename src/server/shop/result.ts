/**
 * Uniform return type for every shop service and action (shop-reference.md §13.1).
 * Errors carry a stable `code` for logic and a friendly `message` for people; never raw DB text.
 */
export type ErrorCode =
	| "SHOP_CLOSED"
	| "AUTH_REQUIRED"
	| "EMAIL_NOT_VERIFIED"
	| "RECOVERY_REQUIRED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "VALIDATION"
	| "RATE_LIMITED"
	| "CAPTCHA"
	| "CONFLICT"
	| "OUT_OF_STOCK"
	| "PRICE_CHANGED"
	| "UNAVAILABLE"
	| "INTERNAL";

export type ServiceError = { code: ErrorCode; message: string; fields?: Record<string, string> };
export type Result<T> = { ok: true; data: T } | { ok: false; error: ServiceError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
	SHOP_CLOSED: "The shop is closed right now.",
	AUTH_REQUIRED: "Please sign in to continue.",
	EMAIL_NOT_VERIFIED: "Please confirm your email first — check your inbox for our link, or ask us to send a new one.",
	RECOVERY_REQUIRED: "This reset link has expired. Please request a new one.",
	FORBIDDEN: "You don't have access to that.",
	NOT_FOUND: "We couldn't find that.",
	VALIDATION: "Please check the highlighted fields.",
	RATE_LIMITED: "Too many attempts. Please wait a minute and try again.",
	CAPTCHA: "We couldn't verify you're human. Please try again.",
	CONFLICT: "That was changed in the meantime. Please refresh and try again.",
	OUT_OF_STOCK: "Some items are out of stock.",
	PRICE_CHANGED: "Some prices changed. Please review your cart.",
	UNAVAILABLE: "This isn't available right now.",
	INTERNAL: "Something went wrong. Please try again in a moment.",
};

export function fail(code: ErrorCode, message?: string, fields?: Record<string, string>): { ok: false; error: ServiceError } {
	return { ok: false, error: { code, message: message ?? DEFAULT_MESSAGES[code], ...(fields ? { fields } : {}) } };
}

/** Logs the real error server-side and returns a generic one (security.md A-9). */
export function internal(where: string, err: unknown): { ok: false; error: ServiceError } {
	console.error(`[shop:${where}]`, err instanceof Error ? err.message : err);
	return fail("INTERNAL");
}
