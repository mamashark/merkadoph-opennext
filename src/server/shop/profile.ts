import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { audit, securityEvent } from "@/lib/audit";
import { fieldErrors, profileSchema } from "@/lib/validation";
import { requireCustomer } from "./context";
import { clearGuestToken } from "./guest-token";
import { listAddresses, type Address } from "./addresses";
import { getWishlist } from "./wishlist";
import { passwordMatches } from "./auth";
import { formatOrderNumber } from "@/lib/order-number";
import { fail, internal, ok, type Result } from "./result";

/** Customer profile, data export and account deletion (shop-reference.md §2.10, §3.5, A5). */

export type Profile = {
	email: string;
	emailVerified: boolean;
	first_name: string;
	last_name: string;
	phone: string | null;
	marketing_opt_in: boolean;
	marketing_opt_in_at: string | null;
	created_at: string | null;
};

export async function getProfile(): Promise<Result<Profile>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	const { data, error } = await (await createClient()).from("customer_profiles").select("first_name,last_name,phone,marketing_opt_in,marketing_opt_in_at,created_at").maybeSingle();
	if (error) return internal("profile.get", error);
	const [first = "", ...rest] = me.data.name.split(" ");
	return ok({
		email: me.data.email,
		emailVerified: me.data.emailVerified,
		first_name: data?.first_name || first,
		last_name: data?.last_name || rest.join(" "),
		phone: data?.phone ?? null,
		marketing_opt_in: data?.marketing_opt_in ?? false,
		marketing_opt_in_at: data?.marketing_opt_in_at ?? null,
		created_at: data?.created_at ?? null,
	});
}

export async function updateProfile(input: { first_name: string; last_name: string; phone: string; marketing_opt_in: boolean }): Promise<Result<Profile>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	const parsed = profileSchema.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", undefined, fieldErrors(parsed));
	const v = parsed.data;

	const current = await getProfile();
	const optInAt = v.marketing_opt_in ? (current.ok && current.data.marketing_opt_in ? current.data.marketing_opt_in_at : new Date().toISOString()) : null;
	const row = { first_name: v.first_name, last_name: v.last_name, phone: v.phone || null, marketing_opt_in: v.marketing_opt_in, marketing_opt_in_at: optInAt };

	// Own row via the session (RLS + column grants). Admins shopping may have no row yet: create it server-side.
	const { data, error } = await (await createClient()).from("customer_profiles").update(row).eq("id", me.data.id).select("id").maybeSingle();
	if (error) return internal("profile.update", error);
	if (!data) {
		const { error: insertError } = await createAdminClient().from("customer_profiles").insert({ id: me.data.id, ...row });
		if (insertError) return internal("profile.insert", insertError);
	}
	await createAdminClient().auth.admin.updateUserById(me.data.id, { user_metadata: { full_name: `${v.first_name} ${v.last_name}` } });
	return getProfile();
}

/** GDPR data export (Art. 15/20): everything we hold about the customer, as JSON. */
export async function exportMyData(): Promise<Result<Record<string, unknown>>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	if (!(await rateLimit("forms", "data_export", [me.data.id]))) return fail("RATE_LIMITED");
	const [profile, addresses, wishlist, { data: orders }] = await Promise.all([
		getProfile(),
		listAddresses(),
		getWishlist(),
		// Own orders via the session (RLS: customer_id = auth.uid()).
		(await createClient()).from("orders").select("order_number,created_at,status,payment_status,payment_method,items,subtotal,shipping_total,tax_total,total,currency,shipping_address,billing_address,shipping_method").order("created_at", { ascending: false }),
	]);
	await audit({ kind: "security", action: "account.data_export", summary: "Customer exported their data", actor: { id: me.data.id, email: me.data.email } });
	return ok({
		exported_at: new Date().toISOString(),
		account: { email: me.data.email, email_verified: me.data.emailVerified },
		profile: profile.ok ? profile.data : null,
		addresses: addresses.ok ? addresses.data.map(({ id: _id, ...a }: Address) => a) : [],
		wishlist: wishlist.ok ? wishlist.data.map((w) => ({ product: w.title, url_slug: w.slug, saved_at: w.addedAt })) : [],
		orders: (orders ?? []).map(({ order_number, ...o }) => ({ order: formatOrderNumber(order_number as number), ...o })),
	});
}

/**
 * Deletes the account (D17): profile, addresses, wishlist and carts go (cascade from the auth user);
 * orders stay for bookkeeping but are unlinked. Requires the current password.
 */
export async function deleteAccount(input: { current_password: string }): Promise<Result<null>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	if (me.data.isAdmin) return fail("FORBIDDEN", "Admin accounts are removed in Admin → Users.");
	if (!(await rateLimit("auth", "delete_account", [me.data.id]))) return fail("RATE_LIMITED");
	if (!input.current_password || !(await passwordMatches(me.data.email, input.current_password))) {
		await securityEvent("auth.reauth_failed", "Wrong current password (delete account)", { email: me.data.email });
		return fail("VALIDATION", undefined, { current_password: "That isn't your current password." });
	}
	const supabase = await createClient();
	await supabase.auth.signOut({ scope: "global" });
	const { error } = await createAdminClient().auth.admin.deleteUser(me.data.id);
	if (error) return internal("profile.delete", error);
	await clearGuestToken();
	await audit({ kind: "security", action: "account.deleted", entity: "customer", entityId: me.data.id, summary: "Customer deleted their account", actor: { id: null, email: null } });
	return ok(null);
}
