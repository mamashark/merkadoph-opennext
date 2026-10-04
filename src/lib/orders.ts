import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/shop-admin";

// Service-role order operations used by checkout, payment return routes and webhooks.

/**
 * Deducts tracked stock for an order exactly once (guarded by orders.stock_reserved).
 * Returns the product slugs whose stock changed, so callers can purge their cached pages.
 */
export async function reserveStock(orderId: string): Promise<string[]> {
	const db = createAdminClient();
	// Flip the flag first; only the request that flips it does the deduction.
	const { data: claimed } = await db.from("orders").update({ stock_reserved: true }).eq("id", orderId).eq("stock_reserved", false).select("items").maybeSingle();
	if (!claimed) return [];
	const items = (claimed.items ?? []) as Order["items"];
	const { data: products } = await db
		.from("products")
		.select("id,slug,manage_stock,stock_quantity,stock_status")
		.in(
			"id",
			items.map((i) => i.product_id),
		);
	const tracked = (products ?? []).filter((p) => p.manage_stock && p.stock_status !== "onbackorder");
	await Promise.all(
		tracked.map((p) => {
			const qty = items.filter((i) => i.product_id === p.id).reduce((n, i) => n + i.quantity, 0);
			return db
				.from("products")
				.update({ stock_quantity: Math.max(0, (p.stock_quantity ?? 0) - qty) })
				.eq("id", p.id);
		}),
	);
	return tracked.map((p) => p.slug as string);
}

/** Marks an order paid exactly once and reserves its stock. Returns changed product slugs. */
export async function markOrderPaid(orderId: string, reference: string | null): Promise<{ paid: boolean; slugs: string[] }> {
	const db = createAdminClient();
	const { data } = await db
		.from("orders")
		.update({ payment_status: "paid", paid_at: new Date().toISOString(), status: "processing", ...(reference ? { payment_reference: reference } : {}) })
		.eq("id", orderId)
		.neq("payment_status", "paid")
		.select("id")
		.maybeSingle();
	if (!data) {
		const { data: existing } = await db.from("orders").select("payment_status").eq("id", orderId).maybeSingle();
		return { paid: existing?.payment_status === "paid", slugs: [] };
	}
	return { paid: true, slugs: await reserveStock(orderId) };
}

/** Customer cancelled or the payment failed: close the unpaid order. */
export async function markOrderPaymentFailed(orderId: string, cancelled: boolean) {
	await createAdminClient()
		.from("orders")
		.update({ payment_status: "failed", ...(cancelled ? { status: "cancelled" } : {}) })
		.eq("id", orderId)
		.eq("payment_status", "unpaid");
}

export async function getOrderForCustomer(orderId: string) {
	if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
	const { data } = await createAdminClient().from("orders").select("id,order_number,status,payment_method,payment_status,subtotal,currency,email,items").eq("id", orderId).maybeSingle();
	return data as Pick<Order, "id" | "order_number" | "status" | "subtotal" | "currency" | "email" | "items"> & { payment_method: string; payment_status: string } | null;
}
