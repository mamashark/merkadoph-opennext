import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin, isCustomer } from "@/lib/auth-shared";
import { getShopSettings } from "@/lib/shop";
import { ensureGuestToken, hashToken, readGuestToken } from "./guest-token";
import { fail, ok, type Result } from "./result";

/**
 * Who is shopping, resolved on the server for every request (shop-reference.md §14.1).
 * Services decide ownership from this — never from ids or emails sent by the browser.
 */
export type Customer = { id: string; email: string; emailVerified: boolean; name: string; isAdmin: boolean };
export type ShopperContext = {
	customer: Customer | null;
	/** SHA-256 of the guest cookie token (what the DB stores), or null if this device has none yet. */
	guestTokenHash: string | null;
};

/** Signed-in shopper (role customer, or an admin shopping on the site). Cached per request. */
export const getCustomer = cache(async (): Promise<Customer | null> => {
	const user = await getCurrentUser();
	if (!user || !(isCustomer(user) || isAdmin(user))) return null;
	const email = user.email ?? "";
	return {
		id: user.id,
		email,
		emailVerified: !!user.email_confirmed_at,
		name: (user.user_metadata?.full_name as string | undefined) || email.split("@")[0],
		isAdmin: isAdmin(user),
	};
});

/** Read-only context: for Server Components and reads. Never creates a cookie. */
export const getShopperContext = cache(async (): Promise<ShopperContext> => {
	const [customer, token] = await Promise.all([getCustomer(), readGuestToken()]);
	return { customer, guestTokenHash: token ? await hashToken(token) : null };
});

/**
 * Context for writes by guests (add to cart, wishlist): creates the guest cookie when the
 * shopper isn't signed in. Server Actions / Route Handlers only.
 */
export async function getWritableShopperContext(): Promise<ShopperContext> {
	const customer = await getCustomer();
	if (customer) return { customer, guestTokenHash: null };
	return { customer: null, guestTokenHash: await hashToken(await ensureGuestToken()) };
}

/** Every shopper-facing action starts here: the shop switch applies to actions, not just pages. */
export async function assertShopOpen(): Promise<Result<null>> {
	const settings = await getShopSettings().catch(() => null);
	return settings?.enabled ? ok(null) : fail("SHOP_CLOSED");
}

/** For account-only services (addresses, orders, profile). */
export async function requireCustomer(): Promise<Result<Customer>> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	const customer = await getCustomer();
	return customer ? ok(customer) : fail("AUTH_REQUIRED");
}
