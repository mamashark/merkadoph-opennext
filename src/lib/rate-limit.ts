import "server-only";
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Rate limiting via the Cloudflare Workers Rate Limiting binding (wrangler.jsonc → "ratelimits").
 * - "auth":  5 requests / 60 s  (login, password reset, sign-up) — keyed by IP and by email
 * - "forms": 10 requests / 60 s (contact, checkout)
 * - "cart":  60 requests / 60 s (cart + wishlist changes) — keyed by customer id or guest token hash
 * If the binding isn't available (e.g. some local setups) requests are allowed.
 */
type Limiter = { limit: (opts: { key: string }) => Promise<{ success: boolean }> };
type Bucket = "auth" | "forms" | "cart";

const BINDINGS: Record<Bucket, string> = { auth: "RL_AUTH", forms: "RL_FORMS", cart: "RL_CART" };

export async function clientIp(): Promise<string> {
	const h = await headers();
	return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Returns true when the request may proceed. `keys` are combined with the action name. */
export async function rateLimit(bucket: Bucket, action: string, keys: string[]): Promise<boolean> {
	let limiter: Limiter | undefined;
	try {
		limiter = (getCloudflareContext().env as Record<string, unknown>)[BINDINGS[bucket]] as Limiter | undefined;
	} catch {
		limiter = undefined;
	}
	if (!limiter?.limit) return true;
	for (const key of keys.filter(Boolean)) {
		try {
			const { success } = await limiter.limit({ key: `${action}:${key.toLowerCase()}` });
			if (!success) return false;
		} catch {
			// Limiter unavailable — fail open rather than lock real users out.
		}
	}
	return true;
}

export const RATE_LIMITED_MESSAGE = "Too many attempts. Please wait a minute and try again.";
