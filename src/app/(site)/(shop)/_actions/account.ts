"use server";

import { redirect } from "next/navigation";
import { formFields } from "@/lib/validation";
import * as addresses from "@/server/shop/addresses";
import * as profile from "@/server/shop/profile";
import type { FormResult } from "./auth";

/**
 * Website transport for the profile and address services (shop-reference.md §13.1).
 * Ownership comes from the session inside the services — ids here only pick one of the
 * customer's own rows (RLS rejects anything else).
 */

const ADDRESS_FIELDS = ["label", "first_name", "last_name", "company", "org_number", "care_of", "line1", "line2", "postal_code", "city", "phone"] as const;
const addressInput = (formData: FormData) => ({
	...formFields(formData, ADDRESS_FIELDS),
	country: "SE" as const,
	is_default_shipping: formData.get("is_default_shipping") === "on",
	is_default_billing: formData.get("is_default_billing") === "on",
});

export async function updateProfileAction(_prev: FormResult, formData: FormData): Promise<FormResult<profile.Profile>> {
	const raw = formFields(formData, ["first_name", "last_name", "phone"]);
	const res = await profile.updateProfile({ ...raw, marketing_opt_in: formData.get("marketing_opt_in") === "on" });
	return { ...res, values: res.ok ? undefined : raw };
}

export async function saveAddressAction(_prev: FormResult, formData: FormData): Promise<FormResult<addresses.Address>> {
	const id = String(formData.get("id") ?? "");
	const input = addressInput(formData);
	const res = id ? await addresses.updateAddress(id, input) : await addresses.createAddress(input);
	if (res.ok) redirect(`/account/addresses?notice=${id ? "updated" : "added"}`);
	return { ...res, values: formFields(formData, ADDRESS_FIELDS) };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
	const res = await addresses.deleteAddress(String(formData.get("id") ?? ""));
	redirect(`/account/addresses?${res.ok ? "notice=deleted" : "error=not-found"}`);
}

export async function setDefaultAddressAction(formData: FormData): Promise<void> {
	const kind = String(formData.get("kind") ?? "both");
	const res = await addresses.setDefaultAddress(String(formData.get("id") ?? ""), kind === "shipping" || kind === "billing" ? kind : "both");
	redirect(`/account/addresses?${res.ok ? "notice=default" : "error=not-found"}`);
}

export async function deleteAccountAction(_prev: FormResult, formData: FormData): Promise<FormResult<null>> {
	const res = await profile.deleteAccount(formFields(formData, ["current_password"]));
	if (res.ok) redirect("/?notice=account-deleted");
	return res;
}
