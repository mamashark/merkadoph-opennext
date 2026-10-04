"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductsForCheckout, getShopSettings } from "@/lib/shop";
import { availability, maxPurchasable, priceInfo } from "@/lib/pricing";
import { checkoutMethods, gatewayConfig } from "@/lib/payments";
import { paypalCreateOrder, stripeCreateSession } from "@/lib/payment-providers";
import { markOrderPaymentFailed, reserveStock } from "@/lib/orders";
import { SITE_URL } from "@/lib/env";

export type CheckoutField = "name" | "email" | "address" | "postal" | "city";
export type CheckoutState = {
	status: "idle" | "success" | "error" | "redirect";
	/** Stripe Checkout / PayPal approval page to send the customer to. */
	redirectUrl?: string;
	message?: string;
	errors?: Partial<Record<CheckoutField, string>>;
	values?: Record<string, string>;
	/** Cart lines that changed (price, stock) since they were added, so the cart can be fixed. */
	problems?: Array<{ id: string; message: string }>;
	order?: { number: number; total: number; currency: string; email: string };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_FILL_MS = 3000;

/**
 * Places an order request. Never trusts the browser: prices, availability and stock are re-read
 * from the database, and the order stores its own copy of each line.
 */
export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
	const settings = await getShopSettings();
	if (!settings.enabled) return { status: "error", message: "The shop is closed right now." };

	const field = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);
	const values = {
		name: field("name", 120),
		email: field("email", 254).toLowerCase(),
		phone: field("phone", 40),
		address_line1: field("address_line1", 200),
		address_line2: field("address_line2", 200),
		postal_code: field("postal_code", 20),
		city: field("city", 100),
		notes: field("notes", 2000),
	};

	// Spam traps.
	const startedAt = Number(formData.get("started_at"));
	if (field("company", 200) || (Number.isFinite(startedAt) && Date.now() - startedAt < MIN_FILL_MS)) {
		return { status: "error", message: "Something went wrong. Please try again.", values };
	}

	const errors: CheckoutState["errors"] = {};
	if (!values.name) errors.name = "Please enter your name.";
	if (!EMAIL.test(values.email)) errors.email = "Please enter a valid email address.";
	if (!values.address_line1) errors.address = "Please enter your street address.";
	if (!values.postal_code) errors.postal = "Please enter your postal code.";
	if (!values.city) errors.city = "Please enter your city.";
	if (Object.keys(errors).length) return { status: "error", message: "Please check the highlighted fields.", errors, values };

	// Cart lines from the browser: only ids and quantities are used.
	let requested: Array<{ id: string; quantity: number }> = [];
	try {
		requested = (JSON.parse(String(formData.get("items") ?? "[]")) as Array<{ id: unknown; quantity: unknown }>)
			.map((l) => ({ id: String(l.id), quantity: Math.floor(Number(l.quantity)) }))
			.filter((l) => /^[0-9a-f-]{36}$/i.test(l.id) && l.quantity > 0 && l.quantity <= 99)
			.slice(0, 50);
	} catch {
		requested = [];
	}
	if (!requested.length) return { status: "error", message: "Your cart is empty.", values };

	const products = await getProductsForCheckout(requested.map((l) => l.id));
	const problems: NonNullable<CheckoutState["problems"]> = [];
	const items = requested.flatMap(({ id, quantity }) => {
		const p = products.find((x) => x.id === id);
		if (!p) return problems.push({ id, message: "This product is no longer available." }), [];
		const { price } = priceInfo(p);
		if (price == null) return problems.push({ id, message: `${p.title} can't be ordered online right now.` }), [];
		if (availability(p) === "outofstock") return problems.push({ id, message: `${p.title} is out of stock.` }), [];
		const max = maxPurchasable(p);
		if (max != null && quantity > max) return problems.push({ id, message: `Only ${max} of ${p.title} left in stock.` }), [];
		return [{ product_id: p.id, title: p.title, slug: p.slug, sku: p.sku, unit_price: price, quantity, line_total: Math.round(price * quantity * 100) / 100, _p: p }];
	});
	if (problems.length) return { status: "error", message: "Some items in your cart changed. Please review them.", problems, values };

	// Payment method: must be one the shop currently offers.
	const methods = await checkoutMethods();
	const method = methods.find((m) => m.id === String(formData.get("payment_method") ?? "")) ?? (methods.length === 1 ? methods[0] : undefined);
	if (!method) return { status: "error", message: methods.length ? "Please choose a payment method." : "Checkout isn't available right now. Please contact us to order.", values };

	const subtotal = Math.round(items.reduce((s, i) => s + i.line_total, 0) * 100) / 100;
	const db = createAdminClient();
	const { data: order, error } = await db
		.from("orders")
		.insert({
			customer_name: values.name,
			email: values.email,
			phone: values.phone || null,
			address_line1: values.address_line1,
			address_line2: values.address_line2 || null,
			postal_code: values.postal_code,
			city: values.city,
			country: "SE",
			notes: values.notes || null,
			items: items.map(({ _p, ...i }) => i),
			subtotal,
			currency: settings.currency,
			payment_method: method.id,
			payment_status: "unpaid",
		})
		.select("id,order_number")
		.single();
	if (error || !order) return { status: "error", message: "Sorry, we couldn't place your order. Please try again in a moment.", values };
	revalidatePath("/admin/shop", "layout");

	// Pay later: the order is confirmed now, so reserve stock straight away.
	if (method.id === "manual") {
		const slugs = await reserveStock(order.id as string);
		if (slugs.length) {
			updateTag("products");
			slugs.forEach((s) => revalidatePath(`/product/${s}`));
		}
		return { status: "success", order: { number: order.order_number as number, total: subtotal, currency: settings.currency, email: values.email } };
	}

	// Online payment: hand over to Stripe / PayPal. Stock is reserved once the payment is confirmed.
	const payment = {
		orderId: order.id as string,
		orderNumber: order.order_number as number,
		currency: settings.currency,
		email: values.email,
		items: items.map((i) => ({ name: i.title, unitAmount: i.unit_price, quantity: i.quantity })),
		returnUrl: `${SITE_URL}/api/checkout/return?gateway=${method.id}&order=${order.id}${method.id === "stripe" ? "&session_id={CHECKOUT_SESSION_ID}" : ""}`,
		cancelUrl: `${SITE_URL}/api/checkout/cancel?order=${order.id}`,
	};
	try {
		const config = await gatewayConfig(method.id);
		if (!config) throw new Error("Payment method is not configured.");
		const started =
			method.id === "stripe"
				? await stripeCreateSession(config.secrets.secret_key ?? "", payment)
				: await paypalCreateOrder(config.mode, config.settings.client_id ?? "", config.secrets.client_secret ?? "", payment);
		await db.from("orders").update({ payment_reference: started.id }).eq("id", order.id);
		return { status: "redirect", redirectUrl: started.url };
	} catch (err) {
		await markOrderPaymentFailed(order.id as string, true);
		console.error("Payment start failed:", err instanceof Error ? err.message : err);
		return { status: "error", message: `We couldn't start the ${method.title} payment. Please try again or choose another payment method.`, values };
	}
}
