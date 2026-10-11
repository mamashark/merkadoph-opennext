"use server";

import { redirect } from "next/navigation";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { securityEvent } from "@/lib/audit";
import { formFields } from "@/lib/validation";
import * as checkout from "@/server/shop/checkout";
import { fail } from "@/server/shop/result";

/**
 * Website transport for the checkout service (shop-reference.md §13.1, §15.3).
 * The service re-reads the cart, prices, shipping and VAT; only choices and addresses come from the form.
 */

export async function quoteAction(shippingMethodId: string | null, postcode: string | null) {
	return checkout.quote({ shippingMethodId, postcode });
}

const ADDRESS = ["first_name", "last_name", "company", "org_number", "care_of", "line1", "line2", "postal_code", "city", "phone"] as const;
const address = (formData: FormData, prefix: string) => ({
	...(Object.fromEntries(ADDRESS.map((k) => [k, String(formData.get(`${prefix}${k}`) ?? "")])) as Record<(typeof ADDRESS)[number], string>),
	country: "SE" as const,
});

export type PlaceOrderState = Awaited<ReturnType<typeof checkout.placeOrder>> & { redirectUrl?: string | null } | null;

export async function placeOrderAction(_prev: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
	const f = formFields(formData, ["email", "address_id", "shipping_method_id", "payment_method", "notes", "quote_hash"]);
	if (!(await verifyRecaptcha(formData.get("recaptcha_token"), "checkout")).ok) {
		await securityEvent("forms.captcha_failed", "Checkout reCAPTCHA check failed", { email: f.email });
		return fail("CAPTCHA");
	}
	const billingSame = formData.get("billing_same") !== "off";
	const res = await checkout.placeOrder({
		email: f.email,
		address_id: f.address_id,
		shipping: f.address_id ? undefined : address(formData, "ship_"),
		billing_same: billingSame,
		billing: billingSame ? undefined : address(formData, "bill_"),
		save_address: formData.get("save_address") === "on",
		shipping_method_id: f.shipping_method_id,
		payment_method: f.payment_method as "manual",
		notes: f.notes,
		terms: (formData.get("terms") === "on") as true,
		quote_hash: f.quote_hash,
	});
	// Pay later (or a repeated click): straight to the private order page. Online: the page sends the browser to Stripe/PayPal.
	if (res.ok && !res.data.redirectUrl) redirect(`/checkout/complete?${new URLSearchParams({ order: res.data.orderId, t: res.data.token })}`);
	return res;
}
