import "server-only";
import type { Customer } from "./context";
import { mergeGuestCart } from "./cart";
import { mergeGuestWishlist } from "./wishlist";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * What happens to a device's guest data when the shopper signs in (shop-reference.md §14.3).
 * Each later module registers its step here, in order:
 *   A3 cart: merge the guest cart into the account cart
 *   A4 wishlist: union the guest wishlist into the account wishlist
 *   A7 orders: claim guest orders with the same verified email
 * Steps must be idempotent (sign-in can be retried) and must never throw.
 */
type Step = { name: string; run: (customer: Customer, guestTokenHash: string | null) => Promise<void> };

const steps: Step[] = [
	{ name: "cart", run: mergeGuestCart },
	{ name: "wishlist", run: mergeGuestWishlist },
	{ name: "orders", run: claimGuestOrders },
];

/**
 * Links earlier guest orders placed with this email to the account (§14.3). Only for a verified
 * email — otherwise anyone could register someone else's address and see their orders.
 */
export async function claimGuestOrders(customer: Customer): Promise<void> {
	if (!customer.emailVerified || !customer.email) return;
	await createAdminClient().from("orders").update({ customer_id: customer.id }).is("customer_id", null).eq("email", customer.email.toLowerCase());
}

export async function afterSignIn(customer: Customer, guestTokenHash: string | null): Promise<void> {
	for (const step of steps) {
		try {
			await step.run(customer, guestTokenHash);
		} catch (err) {
			console.error(`[shop:afterSignIn:${step.name}]`, err instanceof Error ? err.message : err);
		}
	}
}

/** Only paths inside the shop/account area are allowed as post-login destinations. */
export function safeShopNext(value: string | null | undefined, fallback = "/account"): string {
	const next = (value ?? "").trim();
	if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
	return /^\/(account|cart|checkout|wishlist|shop|product)(\/|\?|$)/.test(next) ? next : fallback;
}
