import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { addressSchema, fieldErrors } from "@/lib/validation";
import { requireCustomer } from "./context";
import { fail, internal, ok, type Result } from "./result";

/**
 * Customer address book (shop-reference.md §3.4, A5). Uses the customer's own session, so
 * row-level security (customer_id = auth.uid()) guards every query in the database as well.
 */

export const MAX_ADDRESSES = 10;

export type Address = {
	id: string;
	label: string | null;
	first_name: string;
	last_name: string;
	company: string | null;
	org_number: string | null;
	care_of: string | null;
	line1: string;
	line2: string | null;
	postal_code: string;
	city: string;
	country: "SE";
	phone: string;
	is_default_shipping: boolean;
	is_default_billing: boolean;
	created_at: string;
	updated_at: string;
};
export type AddressInput = z.input<typeof addressSchema>;

const COLUMNS = "id,label,first_name,last_name,company,org_number,care_of,line1,line2,postal_code,city,country,phone,is_default_shipping,is_default_billing,created_at,updated_at";
const idSchema = z.uuid();

/** Empty optional strings are stored as null. */
function toRow(v: z.output<typeof addressSchema>) {
	const n = (s: string) => s || null;
	return { ...v, label: n(v.label), company: n(v.company), org_number: n(v.org_number), care_of: n(v.care_of), line2: n(v.line2) };
}

export async function listAddresses(): Promise<Result<Address[]>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	const { data, error } = await (await createClient())
		.from("customer_addresses")
		.select(COLUMNS)
		.order("is_default_shipping", { ascending: false })
		.order("created_at", { ascending: true });
	if (error) return internal("addresses.list", error);
	return ok((data ?? []) as Address[]);
}

export async function getAddress(id: string): Promise<Result<Address>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	if (!idSchema.safeParse(id).success) return fail("NOT_FOUND");
	const { data, error } = await (await createClient()).from("customer_addresses").select(COLUMNS).eq("id", id).maybeSingle();
	if (error) return internal("addresses.get", error);
	return data ? ok(data as Address) : fail("NOT_FOUND");
}

/** Makes `id` the only default of the chosen kind(s). */
async function setDefaults(id: string, kinds: { shipping: boolean; billing: boolean }) {
	const supabase = await createClient();
	for (const [kind, on] of [["is_default_shipping", kinds.shipping], ["is_default_billing", kinds.billing]] as const) {
		if (!on) continue;
		await supabase.from("customer_addresses").update({ [kind]: false }).eq(kind, true).neq("id", id);
		await supabase.from("customer_addresses").update({ [kind]: true }).eq("id", id);
	}
}

export async function createAddress(input: AddressInput): Promise<Result<Address>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	const parsed = addressSchema.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", undefined, fieldErrors(parsed));
	const supabase = await createClient();

	const { count } = await supabase.from("customer_addresses").select("id", { count: "exact", head: true });
	if ((count ?? 0) >= MAX_ADDRESSES) return fail("VALIDATION", `You can save up to ${MAX_ADDRESSES} addresses. Remove one first.`);
	// The first address becomes the default for both.
	const first = (count ?? 0) === 0;
	const v = parsed.data;
	const wantShipping = v.is_default_shipping || first;
	const wantBilling = v.is_default_billing || first;

	const { data, error } = await supabase
		.from("customer_addresses")
		.insert({ ...toRow(v), is_default_shipping: false, is_default_billing: false })
		.select("id")
		.single();
	if (error || !data) return error?.code === "P0001" ? fail("VALIDATION", `You can save up to ${MAX_ADDRESSES} addresses.`) : internal("addresses.create", error);
	await setDefaults(data.id as string, { shipping: wantShipping, billing: wantBilling });
	return getAddress(data.id as string);
}

export async function updateAddress(id: string, input: AddressInput): Promise<Result<Address>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	if (!idSchema.safeParse(id).success) return fail("NOT_FOUND");
	const parsed = addressSchema.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", undefined, fieldErrors(parsed));
	const v = parsed.data;
	const supabase = await createClient();
	// Defaults are only switched on here (switching off happens by choosing another default).
	const { is_default_shipping, is_default_billing, ...fields } = toRow(v);
	const { data, error } = await supabase.from("customer_addresses").update(fields).eq("id", id).select("id").maybeSingle();
	if (error) return internal("addresses.update", error);
	if (!data) return fail("NOT_FOUND");
	await setDefaults(id, { shipping: is_default_shipping, billing: is_default_billing });
	return getAddress(id);
}

export async function setDefaultAddress(id: string, kind: "shipping" | "billing" | "both"): Promise<Result<null>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	const found = await getAddress(id);
	if (!found.ok) return found;
	await setDefaults(id, { shipping: kind !== "billing", billing: kind !== "shipping" });
	return ok(null);
}

/** Deleting a default promotes the oldest remaining address, so there's always a default. */
export async function deleteAddress(id: string): Promise<Result<null>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	const found = await getAddress(id);
	if (!found.ok) return found;
	const supabase = await createClient();
	const { error } = await supabase.from("customer_addresses").delete().eq("id", id);
	if (error) return internal("addresses.delete", error);

	const { data: next } = await supabase.from("customer_addresses").select("id").order("created_at").limit(1).maybeSingle();
	if (next) await setDefaults(next.id as string, { shipping: found.data.is_default_shipping, billing: found.data.is_default_billing });
	return ok(null);
}

/** Default shipping/billing addresses (checkout prefill). */
export async function getDefaultAddresses(): Promise<Result<{ shipping: Address | null; billing: Address | null }>> {
	const list = await listAddresses();
	if (!list.ok) return list;
	return ok({ shipping: list.data.find((a) => a.is_default_shipping) ?? null, billing: list.data.find((a) => a.is_default_billing) ?? null });
}
