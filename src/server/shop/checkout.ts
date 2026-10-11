import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import type { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/env";
import { checkoutMethods, gatewayConfig } from "@/lib/payments";
import { paypalCreateOrder, stripeCreateSession } from "@/lib/payment-providers";
import { holdOrderStock, markOrderPaymentFailed } from "@/lib/orders";
import { notifyOrderLater } from "@/lib/email/notify";
import { formatOrderNumber } from "@/lib/order-number";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { checkoutInputSchema, fieldErrors, type orderAddressSchema } from "@/lib/validation";
import { assertShopOpen, getShopperContext, type ShopperContext } from "./context";
import { cartForCheckout, markCartConverted, type CartView } from "./cart";
import { availableShipping, type ShippingOption } from "./shipping";
import { taxFor, type TaxBreakdown } from "./tax";
import { createAddress, getAddress } from "./addresses";
import { fail, internal, ok, type Result } from "./result";

/**
 * Checkout (shop-reference.md §15.3, A7). `quote()` is the single source of totals; `placeOrder()`
 * recomputes it, refuses if anything changed since the customer looked (D19), creates the order
 * once per cart version (idempotent), holds stock (D18) and starts payment.
 */

/** Online payments: Stripe page expires after 30 min; the stock hold lasts a little longer. */
const PAYMENT_WINDOW_S = 30 * 60 + 30;
const HOLD_MS = 32 * 60 * 1000;

export type Quote = {
	cart: CartView;
	shippingOptions: ShippingOption[];
	shipping: ShippingOption | null;
	tax: TaxBreakdown;
	subtotal: number;
	shippingTotal: number;
	total: number;
	currency: string;
	/** Fingerprint of everything that affects the price. */
	hash: string;
	/** Reasons the order can't be placed yet (empty = ready). */
	problems: string[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

async function fingerprint(parts: unknown): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(parts)));
	return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildQuote(ctx: ShopperContext, opts: { shippingMethodId?: string | null; postcode?: string | null }): Promise<Quote> {
	const cart = await cartForCheckout(ctx);
	const shippingOptions = cart.lines.length ? await availableShipping({ subtotal: cart.subtotal, weightKg: cart.weightKg, postcode: opts.postcode ?? null }) : [];
	const shipping = shippingOptions.find((o) => o.id === opts.shippingMethodId) ?? (shippingOptions.length === 1 ? shippingOptions[0] : null);
	const shippingTotal = shipping?.price ?? 0;
	const tax = await taxFor(
		cart.lines.map((l) => ({ gross: l.lineTotal, taxClass: l.taxClass })),
		shippingTotal,
	);
	const total = r2(cart.subtotal + shippingTotal);

	const problems: string[] = [];
	if (!cart.lines.length) problems.push("Your cart is empty.");
	if (cart.lines.some((l) => l.status === "out_of_stock")) problems.push("Remove the items that are out of stock.");
	if (cart.lines.length && !shippingOptions.length) problems.push("No delivery option is available for this order. Please contact us.");
	if (shippingOptions.length && !shipping) problems.push("Choose a delivery option.");
	if (shipping?.needsPostcode) problems.push("Enter your postcode to check local delivery.");

	const hash = await fingerprint({
		l: cart.lines.map((l) => [l.productId, l.quantity, l.unitPrice]),
		s: shipping ? [shipping.id, shipping.price] : null,
		t: tax.total,
		total,
	});
	return { cart, shippingOptions, shipping, tax, subtotal: cart.subtotal, shippingTotal, total, currency: cart.currency, hash, problems };
}

/** Prices, delivery options, VAT and total for the current cart. */
export async function quote(input: { shippingMethodId?: string | null; postcode?: string | null } = {}): Promise<Result<Quote>> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	try {
		return ok(await buildQuote(await getShopperContext(), input));
	} catch (err) {
		return internal("checkout.quote", err);
	}
}

/* ------------------------------------------------------------------ */

type OrderAddress = z.output<typeof orderAddressSchema>;
export type CheckoutInput = z.input<typeof checkoutInputSchema>;
export type PlacedOrder = {
	orderId: string;
	number: string;
	token: string;
	total: number;
	currency: string;
	email: string;
	paymentMethod: string;
	/** Stripe/PayPal page to send the customer to (null for pay later or a repeated request). */
	redirectUrl: string | null;
	/** The same cart version was already ordered (double click / retry). */
	duplicate: boolean;
};

const snapshot = (a: OrderAddress) => ({ ...a, company: a.company || null, org_number: a.org_number || null, care_of: a.care_of || null, line2: a.line2 || null });

export async function placeOrder(input: CheckoutInput): Promise<Result<PlacedOrder> | { ok: false; error: { code: "PRICE_CHANGED"; message: string }; quote: Quote }> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	const ctx = await getShopperContext();
	const parsed = checkoutInputSchema.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", undefined, fieldErrors(parsed));
	const v = parsed.data;
	const email = ctx.customer?.email.toLowerCase() ?? v.email;
	if (!(await rateLimit("forms", "checkout", [await clientIp(), email]))) return fail("RATE_LIMITED");

	// Addresses: a saved one (own rows only, via RLS) or the typed one.
	let shippingAddress: OrderAddress;
	if (v.address_id) {
		if (!ctx.customer) return fail("AUTH_REQUIRED");
		const saved = await getAddress(v.address_id);
		if (!saved.ok) return fail("VALIDATION", undefined, { address_id: "Choose one of your saved addresses." });
		const { id: _id, label: _l, is_default_shipping: _s, is_default_billing: _b, created_at: _c, updated_at: _u, ...rest } = saved.data;
		shippingAddress = { ...rest, company: rest.company ?? "", org_number: rest.org_number ?? "", care_of: rest.care_of ?? "", line2: rest.line2 ?? "" };
	} else {
		if (!v.shipping) return fail("VALIDATION", undefined, { shipping: "Enter your delivery address." });
		shippingAddress = v.shipping;
	}
	const billingAddress = v.billing_same ? shippingAddress : v.billing;
	if (!billingAddress) return fail("VALIDATION", undefined, { billing: "Enter your billing address." });

	// Recompute everything server-side and compare with what the customer saw (D19).
	let q: Quote;
	try {
		q = await buildQuote(ctx, { shippingMethodId: v.shipping_method_id, postcode: shippingAddress.postal_code });
	} catch (err) {
		return internal("checkout.place.quote", err);
	}
	if (q.problems.length) return fail("VALIDATION", q.problems[0]);
	if (!q.cart.id) return fail("VALIDATION", "Your cart is empty.");
	if (q.hash !== v.quote_hash) return { ok: false, error: { code: "PRICE_CHANGED", message: "Your total changed since you looked. Please check the new total and place the order again." }, quote: q };

	const methods = await checkoutMethods();
	const method = methods.find((m) => m.id === v.payment_method);
	if (!method) return fail("VALIDATION", undefined, { payment_method: "That payment method isn't available." });

	const db = createAdminClient();
	const idempotencyKey = `${q.cart.id}:${q.cart.version}`;
	const { data: existing } = await db.from("orders").select("id,order_number,access_token,total,currency,email,payment_method").eq("idempotency_key", idempotencyKey).maybeSingle();
	if (existing) return ok(toPlaced(existing, null, true));

	const items = q.cart.lines.map((l, i) => ({
		product_id: l.productId,
		title: l.title,
		slug: l.slug,
		sku: l.sku,
		unit_price: l.unitPrice,
		quantity: l.quantity,
		line_total: l.lineTotal,
		tax_rate: q.tax.enabled ? q.tax.lines[i].rate : null,
		tax_amount: q.tax.enabled ? q.tax.lines[i].tax : null,
	}));

	const { data: order, error } = await db
		.from("orders")
		.insert({
			customer_id: ctx.customer?.id ?? null,
			customer_name: `${shippingAddress.first_name} ${shippingAddress.last_name}`.trim(),
			email,
			phone: shippingAddress.phone,
			address_line1: shippingAddress.line1,
			address_line2: shippingAddress.line2 || null,
			postal_code: shippingAddress.postal_code,
			city: shippingAddress.city,
			country: shippingAddress.country,
			notes: v.notes || null,
			items,
			subtotal: q.subtotal,
			shipping_total: q.shippingTotal,
			tax_total: q.tax.total,
			tax_breakdown: q.tax.enabled ? q.tax.rates : null,
			discount_total: 0,
			total: q.total,
			currency: q.currency,
			shipping_address: snapshot(shippingAddress),
			billing_address: snapshot(billingAddress),
			shipping_method: q.shipping ? { id: q.shipping.id, type: q.shipping.type, title: q.shipping.title, price: q.shipping.price, pickup_address: q.shipping.pickupAddress } : null,
			payment_method: method.id,
			payment_status: "unpaid",
			terms_accepted_at: new Date().toISOString(),
			cart_id: q.cart.id,
			idempotency_key: idempotencyKey,
			reserved_until: method.id === "manual" ? null : new Date(Date.now() + HOLD_MS).toISOString(),
		})
		.select("id,order_number,access_token,total,currency,email,payment_method")
		.single();
	if (error || !order) {
		if (error?.code === "23505") {
			// A parallel request for the same cart version won the race.
			const { data: winner } = await db.from("orders").select("id,order_number,access_token,total,currency,email,payment_method").eq("idempotency_key", idempotencyKey).maybeSingle();
			if (winner) return ok(toPlaced(winner, null, true));
		}
		return internal("checkout.place.insert", error);
	}

	// Stock: all or nothing (D18).
	const held = await holdOrderStock(order.id as string);
	if (!held.ok) {
		await db.from("orders").update({ payment_status: "failed", status: "cancelled", idempotency_key: null }).eq("id", order.id);
		return fail("OUT_OF_STOCK", held.insufficient ? "Some items sold out while you were checking out. Please review your cart." : undefined);
	}
	if (held.slugs.length) {
		revalidateTag("products", { expire: 0 });
		held.slugs.forEach((s) => revalidatePath(`/product/${s}`));
	}
	revalidatePath("/admin/shop", "layout");

	if (ctx.customer && v.save_address && !v.address_id) await createAddress({ ...shippingAddress, label: "", is_default_shipping: false, is_default_billing: false }).catch(() => {});
	await audit({ kind: "admin", action: "orders.placed", entity: "orders", entityId: order.id as string, summary: `${formatOrderNumber(order.order_number as number)} placed (${method.id})`, actor: { id: ctx.customer?.id ?? null, email } });

	// Pay later: done.
	if (method.id === "manual") {
		await markCartConverted(q.cart.id, order.id as string);
		notifyOrderLater(order.id as string, "confirmation", "alert");
		return ok(toPlaced(order, null, false));
	}

	// Online payment: hand over to Stripe / PayPal (amounts incl. shipping).
	const token = String(order.access_token);
	const qs = (extra: Record<string, string>) => new URLSearchParams({ gateway: method.id, order: order.id as string, t: token, ...extra }).toString();
	const payment = {
		orderId: order.id as string,
		orderNumber: order.order_number as number,
		currency: q.currency,
		email,
		items: [
			...items.map((i) => ({ name: i.title, unitAmount: i.unit_price, quantity: i.quantity })),
			...(q.shippingTotal > 0 && q.shipping ? [{ name: `Shipping: ${q.shipping.title}`, unitAmount: q.shippingTotal, quantity: 1 }] : []),
		],
		returnUrl: `${SITE_URL}/api/checkout/return?${qs({})}${method.id === "stripe" ? "&session_id={CHECKOUT_SESSION_ID}" : ""}`,
		cancelUrl: `${SITE_URL}/api/checkout/cancel?${qs({})}`,
		expiresAt: Math.floor(Date.now() / 1000) + PAYMENT_WINDOW_S,
	};
	try {
		const config = await gatewayConfig(method.id);
		if (!config) throw new Error("Payment method is not configured.");
		const started =
			method.id === "stripe"
				? await stripeCreateSession(config.secrets.secret_key ?? "", payment)
				: await paypalCreateOrder(config.mode, config.settings.client_id ?? "", config.secrets.client_secret ?? "", payment);
		await db.from("orders").update({ payment_reference: started.id }).eq("id", order.id);
		await markCartConverted(q.cart.id, order.id as string);
		return ok(toPlaced(order, started.url, false));
	} catch (err) {
		await markOrderPaymentFailed(order.id as string, true);
		console.error("[checkout.payment-start]", err instanceof Error ? err.message : err);
		return fail("UNAVAILABLE", `We couldn't start the ${method.title} payment. Please try again or choose another payment method.`);
	}
}

function toPlaced(o: Record<string, unknown>, redirectUrl: string | null, duplicate: boolean): PlacedOrder {
	return {
		orderId: o.id as string,
		number: formatOrderNumber(o.order_number as number),
		token: String(o.access_token),
		total: Number(o.total),
		currency: o.currency as string,
		email: o.email as string,
		paymentMethod: o.payment_method as string,
		redirectUrl,
		duplicate,
	};
}
