import "server-only";

/* Minimal Stripe and PayPal REST clients (fetch only — no SDKs, so they run on Cloudflare Workers). */

export type PayItem = { name: string; unitAmount: number; quantity: number };
export type CreatePayment = { orderId: string; orderNumber: number; currency: string; email: string; items: PayItem[]; returnUrl: string; cancelUrl: string };

/** Minor units (öre/cents). All supported currencies (SEK, EUR, USD, PHP) use 2 decimals. */
const minor = (amount: number) => Math.round(amount * 100);

/* --------------------------------- Stripe -------------------------------- */

async function stripe<T>(secretKey: string, path: string, init: { method?: string; form?: Record<string, string> } = {}): Promise<T> {
	const res = await fetch(`https://api.stripe.com${path}`, {
		method: init.method ?? (init.form ? "POST" : "GET"),
		headers: { Authorization: `Bearer ${secretKey}`, ...(init.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
		body: init.form ? new URLSearchParams(init.form).toString() : undefined,
	});
	const json = (await res.json()) as T & { error?: { message?: string } };
	if (!res.ok) throw new Error(`Stripe: ${json.error?.message ?? res.statusText}`);
	return json;
}

/** Hosted Stripe Checkout session. The customer is redirected to `url`. */
export async function stripeCreateSession(secretKey: string, p: CreatePayment): Promise<{ id: string; url: string }> {
	const form: Record<string, string> = {
		mode: "payment",
		success_url: p.returnUrl,
		cancel_url: p.cancelUrl,
		customer_email: p.email,
		client_reference_id: p.orderId,
		"metadata[order_id]": p.orderId,
		"metadata[order_number]": String(p.orderNumber),
		"payment_intent_data[metadata][order_id]": p.orderId,
		"payment_intent_data[description]": `Merkado PH order #${p.orderNumber}`,
	};
	p.items.forEach((item, i) => {
		form[`line_items[${i}][quantity]`] = String(item.quantity);
		form[`line_items[${i}][price_data][currency]`] = p.currency.toLowerCase();
		form[`line_items[${i}][price_data][unit_amount]`] = String(minor(item.unitAmount));
		form[`line_items[${i}][price_data][product_data][name]`] = item.name.slice(0, 250);
	});
	return stripe(secretKey, "/v1/checkout/sessions", { form });
}

export type StripeSession = { id: string; payment_status: "paid" | "unpaid" | "no_payment_required"; client_reference_id: string | null; payment_intent: string | null; amount_total: number | null; currency: string | null };

export function stripeGetSession(secretKey: string, id: string) {
	return stripe<StripeSession>(secretKey, `/v1/checkout/sessions/${encodeURIComponent(id)}`);
}

/** "Test connection": a harmless authenticated read. */
export async function stripeTest(secretKey: string) {
	const account = await stripe<{ id: string; settings?: { dashboard?: { display_name?: string } }; business_profile?: { name?: string } }>(secretKey, "/v1/account");
	return account.settings?.dashboard?.display_name || account.business_profile?.name || account.id;
}

/** Verifies a Stripe webhook signature (Stripe-Signature header, v1 HMAC-SHA256, 5-minute tolerance). */
export async function stripeVerifyWebhook(rawBody: string, header: string | null, webhookSecret: string): Promise<boolean> {
	if (!header) return false;
	const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
	const signatures = header
		.split(",")
		.filter((kv) => kv.startsWith("v1="))
		.map((kv) => kv.slice(3));
	const t = Number(parts.t);
	if (!t || !signatures.length || Math.abs(Date.now() / 1000 - t) > 300) return false;
	const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`)));
	const expected = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
	return signatures.some((s) => s.length === expected.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0);
}

/* --------------------------------- PayPal -------------------------------- */

const paypalBase = (mode: "test" | "live") => (mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

async function paypalToken(mode: "test" | "live", clientId: string, clientSecret: string): Promise<string> {
	const res = await fetch(`${paypalBase(mode)}/v1/oauth2/token`, {
		method: "POST",
		headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
		body: "grant_type=client_credentials",
	});
	const json = (await res.json()) as { access_token?: string; error_description?: string };
	if (!res.ok || !json.access_token) throw new Error(`PayPal: ${json.error_description ?? "authentication failed"}`);
	return json.access_token;
}

async function paypal<T>(mode: "test" | "live", clientId: string, clientSecret: string, path: string, body?: unknown, requestId?: string): Promise<T> {
	const token = await paypalToken(mode, clientId, clientSecret);
	const res = await fetch(`${paypalBase(mode)}${path}`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(requestId ? { "PayPal-Request-Id": requestId } : {}) },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const json = (await res.json()) as T & { message?: string; details?: Array<{ description?: string }> };
	if (!res.ok) throw new Error(`PayPal: ${json.details?.[0]?.description ?? json.message ?? res.statusText}`);
	return json;
}

export async function paypalCreateOrder(mode: "test" | "live", clientId: string, clientSecret: string, p: CreatePayment): Promise<{ id: string; url: string }> {
	const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
	const total = p.items.reduce((s, i) => s + Math.round(i.unitAmount * 100) * i.quantity, 0) / 100;
	const order = await paypal<{ id: string; links: Array<{ rel: string; href: string }> }>(
		mode,
		clientId,
		clientSecret,
		"/v2/checkout/orders",
		{
			intent: "CAPTURE",
			purchase_units: [
				{
					reference_id: p.orderId,
					custom_id: p.orderId,
					invoice_id: `MPH-${p.orderNumber}`,
					description: `Merkado PH order #${p.orderNumber}`,
					amount: { currency_code: p.currency, value: money(total), breakdown: { item_total: { currency_code: p.currency, value: money(total) } } },
					items: p.items.map((i) => ({ name: i.name.slice(0, 127), quantity: String(i.quantity), unit_amount: { currency_code: p.currency, value: money(i.unitAmount) } })),
				},
			],
			payment_source: {
				paypal: { experience_context: { brand_name: "Merkado PH", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING", return_url: p.returnUrl, cancel_url: p.cancelUrl } },
			},
		},
		`create-${p.orderId}`,
	);
	const approve = order.links.find((l) => l.rel === "payer-action" || l.rel === "approve");
	if (!approve) throw new Error("PayPal: no approval link returned.");
	return { id: order.id, url: approve.href };
}

export type PaypalCapture = { id: string; status: string; purchase_units: Array<{ custom_id?: string; reference_id?: string; payments?: { captures?: Array<{ id: string; status: string; custom_id?: string }> } }> };

export function paypalCapture(mode: "test" | "live", clientId: string, clientSecret: string, paypalOrderId: string) {
	return paypal<PaypalCapture>(mode, clientId, clientSecret, `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {}, `capture-${paypalOrderId}`);
}

export async function paypalTest(mode: "test" | "live", clientId: string, clientSecret: string) {
	await paypalToken(mode, clientId, clientSecret);
	return mode === "live" ? "PayPal live" : "PayPal sandbox";
}
