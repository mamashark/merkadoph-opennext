import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/shop-admin";
import { securityEvent } from "@/lib/audit";
import { formatOrderNumber } from "@/lib/order-number";
import { notifyOrderLater } from "@/lib/email/notify";

// Service-role order operations used by checkout, payment return routes, webhooks and cron.

type Items = Order["items"];

/** Slugs of the products in an order (to purge their cached pages after a stock change). */
async function slugsOf(items: Items): Promise<string[]> {
	if (!items?.length) return [];
	const { data } = await createAdminClient()
		.from("products")
		.select("slug,manage_stock")
		.in(
			"id",
			items.map((i) => i.product_id),
		);
	return (data ?? []).filter((p) => p.manage_stock).map((p) => p.slug as string);
}

/**
 * Strict hold at checkout (D18): takes stock for every line or fails with `insufficient`
 * without changing anything. Idempotent (orders.stock_reserved).
 */
export async function holdOrderStock(orderId: string): Promise<{ ok: true; slugs: string[] } | { ok: false; insufficient: boolean }> {
	const db = createAdminClient();
	const { error } = await db.rpc("reserve_order_stock", { p_order: orderId });
	if (error) {
		if (/insufficient_stock/.test(error.message)) return { ok: false, insufficient: true };
		console.error("[orders.holdOrderStock]", error.message);
		return { ok: false, insufficient: false };
	}
	const { data } = await db.from("orders").select("items").eq("id", orderId).single();
	return { ok: true, slugs: await slugsOf((data?.items ?? []) as Items) };
}

/**
 * Deducts stock for an order that is already paid (e.g. the hold expired before a late payment).
 * The money is taken, so this never fails: stock floors at 0 and an oversell is logged for review.
 */
export async function reserveStock(orderId: string): Promise<string[]> {
	const held = await holdOrderStock(orderId);
	if (held.ok) return held.slugs;
	if (!held.insufficient) return [];

	const db = createAdminClient();
	const { data: claimed } = await db.from("orders").update({ stock_reserved: true }).eq("id", orderId).eq("stock_reserved", false).select("items,order_number").maybeSingle();
	if (!claimed) return [];
	const items = (claimed.items ?? []) as Items;
	for (const item of items) await db.rpc("decrement_stock", { p_product_id: item.product_id, p_qty: item.quantity });
	await securityEvent("orders.oversold", `${formatOrderNumber(claimed.order_number as number)} was paid after its stock hold expired — check stock`, { orderId });
	return slugsOf(items);
}

/** Gives an order's held stock back. Idempotent. Returns changed product slugs. */
export async function releaseOrderStock(orderId: string): Promise<string[]> {
	const db = createAdminClient();
	const { data: released, error } = await db.rpc("release_order_stock", { p_order: orderId });
	if (error || !released) return [];
	const { data } = await db.from("orders").select("items").eq("id", orderId).single();
	return slugsOf((data?.items ?? []) as Items);
}

/**
 * Puts an unpaid order's cart back in the shopper's hands (payment cancelled/failed/expired, D18):
 * reactivates the converted cart, or merges it into a newer active cart of the same owner.
 */
export async function restoreCart(orderId: string): Promise<void> {
	const db = createAdminClient();
	const { data: order } = await db.from("orders").select("cart_id").eq("id", orderId).maybeSingle();
	if (!order?.cart_id) return;
	const { data: cart } = await db.from("carts").select("id,status,customer_id,guest_token_hash").eq("id", order.cart_id).maybeSingle();
	if (!cart || cart.status !== "converted") return;

	let active = db.from("carts").select("id").eq("status", "active");
	active = cart.customer_id ? active.eq("customer_id", cart.customer_id) : active.eq("guest_token_hash", cart.guest_token_hash);
	const { data: newer } = await active.maybeSingle();
	if (newer) await db.rpc("cart_merge", { p_from: cart.id, p_into: newer.id });
	else await db.from("carts").update({ status: "active", converted_order_id: null, last_activity_at: new Date().toISOString() }).eq("id", cart.id);
}

/**
 * True when what the gateway says was paid equals the order total (in minor units, e.g. öre).
 * A mismatch means tampering or misconfiguration: the order stays unpaid and a security event is logged.
 */
export async function paidAmountMatches(orderId: string, paidMinor: number | null | undefined, paidCurrency: string | null | undefined, gateway: string): Promise<boolean> {
	const { data } = await createAdminClient().from("orders").select("subtotal,total,currency,order_number").eq("id", orderId).maybeSingle();
	if (!data) return false;
	const expected = Math.round(Number(data.total ?? data.subtotal) * 100);
	const ok = paidMinor === expected && String(paidCurrency ?? "").toUpperCase() === String(data.currency).toUpperCase();
	if (!ok) {
		await securityEvent("payments.amount_mismatch", `${formatOrderNumber(data.order_number as number)}: paid amount doesn't match the order`, {
			gateway,
			orderId,
			expected: `${expected} ${data.currency}`,
			paid: `${paidMinor ?? "?"} ${paidCurrency ?? "?"}`,
		});
	}
	return ok;
}

/** Marks an order paid exactly once and makes sure its stock is taken. Returns changed product slugs. */
export async function markOrderPaid(orderId: string, reference: string | null): Promise<{ paid: boolean; slugs: string[] }> {
	const db = createAdminClient();
	const { data } = await db
		.from("orders")
		.update({ payment_status: "paid", paid_at: new Date().toISOString(), status: "processing", reserved_until: null, ...(reference ? { payment_reference: reference } : {}) })
		.eq("id", orderId)
		.neq("payment_status", "paid")
		.select("id")
		.maybeSingle();
	if (!data) {
		const { data: existing } = await db.from("orders").select("payment_status").eq("id", orderId).maybeSingle();
		return { paid: existing?.payment_status === "paid", slugs: [] };
	}
	const slugs = await reserveStock(orderId);
	notifyOrderLater(orderId, "confirmation", "alert");
	return { paid: true, slugs };
}

/** Customer cancelled, the payment failed or the hold expired: close the unpaid order, free its stock, restore the cart. */
export async function markOrderPaymentFailed(orderId: string, cancelled: boolean): Promise<string[]> {
	const { data } = await createAdminClient()
		.from("orders")
		.update({ payment_status: "failed", ...(cancelled ? { status: "cancelled" } : {}) })
		.eq("id", orderId)
		.eq("payment_status", "unpaid")
		.select("id")
		.maybeSingle();
	if (!data) return [];
	const slugs = await releaseOrderStock(orderId);
	await restoreCart(orderId);
	return slugs;
}

/** Cron (every 15 min): online-payment orders whose 30-minute hold ran out. */
export async function releaseExpiredHolds(): Promise<{ released: number; slugs: string[] }> {
	const { data } = await createAdminClient()
		.from("orders")
		.select("id")
		.eq("payment_status", "unpaid")
		.eq("stock_reserved", true)
		.in("payment_method", ["stripe", "paypal"])
		.lt("reserved_until", new Date().toISOString())
		.limit(200);
	const slugs = new Set<string>();
	for (const o of data ?? []) (await markOrderPaymentFailed(o.id as string, true)).forEach((s) => slugs.add(s));
	return { released: data?.length ?? 0, slugs: [...slugs] };
}

/** Constant-time comparison for access tokens. */
function sameToken(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export type CustomerOrderView = Pick<Order, "id" | "order_number" | "status" | "subtotal" | "currency" | "email" | "items"> & {
	payment_method: string;
	payment_status: string;
	access_token: string;
	total: number;
	shipping_total: number;
	tax_total: number;
	shipping_method: { title: string; type: string; pickup_address?: string | null } | null;
	shipping_address: Record<string, string | null> | null;
	created_at: string;
};

/**
 * An order for the confirmation / order-status page (D21): only with its secret token, or for the
 * signed-in customer who owns it. Bare order ids reveal nothing.
 */
export async function getOrderForViewer(orderId: string, token: string | null, customerId: string | null): Promise<CustomerOrderView | null> {
	if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
	const { data } = await createAdminClient()
		.from("orders")
		.select("id,order_number,status,payment_method,payment_status,subtotal,total,shipping_total,tax_total,shipping_method,shipping_address,currency,email,items,access_token,customer_id,created_at")
		.eq("id", orderId)
		.maybeSingle();
	if (!data) return null;
	const allowed = (token && sameToken(String(data.access_token), token)) || (customerId && data.customer_id === customerId);
	if (!allowed) return null;
	const { customer_id: _owner, ...order } = data;
	return { ...order, total: Number(order.total ?? order.subtotal), shipping_total: Number(order.shipping_total ?? 0), tax_total: Number(order.tax_total ?? 0) } as CustomerOrderView;
}
