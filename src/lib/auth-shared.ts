import type { User } from "@supabase/supabase-js";

/** Role stored in `app_metadata` (only settable with the service role, never by the user). */
export const ADMIN_ROLE = "admin";

/** Shopper accounts (shop-reference.md §2). Set by the service role at registration. */
export const CUSTOMER_ROLE = "customer";

export function isAdmin(user: Pick<User, "app_metadata"> | null | undefined): boolean {
	return user?.app_metadata?.role === ADMIN_ROLE;
}

export function isCustomer(user: Pick<User, "app_metadata"> | null | undefined): boolean {
	return user?.app_metadata?.role === CUSTOMER_ROLE;
}
