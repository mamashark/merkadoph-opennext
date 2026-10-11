import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseOrderStock } from "@/lib/orders";
import { formatOrderNumber, parseOrderNumber } from "@/lib/order-number";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { addItem } from "./cart";
import { notifyOrderLater } from "@/lib/email/notify";
import { requireCustomer } from "./context";
import { fail, internal, ok, type Result } from "./result";

/**
 * "My orders" for signed-in customers (shop-reference.md §3.2–3.3, A8). Reads go through the
 * customer's session, so RLS (customer_id = auth.uid()) only ever returns their own orders.
 */

export type OrderLine = { product_id: string; title: string; slug: string; sku: string | null; unit_price: number; quantity: number; line_total: number; tax_rate: number | null; tax_amount: number | null };
export type MyOrderSummary = {
	number: string;
	order_number: number;
	created_at: string;
	status: string;
	payment_status: string;
	payment_method: string;
	total: number;
	currency: string;
	item_count: number;
	cancel_requested_at: string | null;
};
export type MyOrder = MyOrderSummary & {
	id: string;
	access_token: string;
	items: OrderLine[];
	subtotal: number;
	shipping_total: number;
	tax_total: number;
	tax_breakdown: Array<{ rate: number; gross: number; net: number; tax: number }> | null;
	shipping_method: { title: string; type: string; price: number; pickup_address?: string | null } | null;
	shipping_address: Record<string, string | null> | null;
	billing_address: Record<string, string | null> | null;
	notes: string | null;
	paid_at: string | null;
	cancel_reason: string | null;
	/** What the customer may do now (D22). */
	canCancel: boolean;
	canRequestCancel: boolean;
};

const LIST_COLUMNS = "order_number,created_at,status,payment_status,payment_method,total,subtotal,currency,items,cancel_requested_at";
const DETAIL_COLUMNS = `id,access_token,${LIST_COLUMNS},shipping_total,tax_total,tax_breakdown,shipping_method,shipping_address,billing_address,notes,paid_at,cancel_reason`;

const SORTS: Record<string, [string, boolean]> = { "": ["created_at", false], oldest: ["created_at", true], "total-desc": ["total", false], total: ["total", true] };

function summary(o: Record<string, unknown>): MyOrderSummary {
	const items = (o.items ?? []) as OrderLine[];
	return {
		number: formatOrderNumber(o.order_number as number),
		order_number: o.order_number as number,
		created_at: o.created_at as string,
		status: o.status as string,
		payment_status: o.payment_status as string,
		payment_method: o.payment_method as string,
		total: Number(o.total ?? o.subtotal),
		currency: o.currency as string,
		item_count: items.reduce((n, i) => n + i.quantity, 0),
		cancel_requested_at: (o.cancel_requested_at as string | null) ?? null,
	};
}

/** Self-cancel (D22): unpaid and not yet being processed. */
const canSelfCancel = (o: { status: string; payment_status: string }) => o.status === "pending" && o.payment_status === "unpaid";

export type ListInput = { q?: string; status?: string; from?: string; to?: string; sort?: string; page?: number; perPage?: number };

/** Own orders with URL filters: order number search, status, date range, sort, pagination. */
export async function listMyOrders(input: ListInput = {}): Promise<Result<{ rows: MyOrderSummary[]; total: number }>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	const page = Math.max(1, Math.floor(input.page ?? 1));
	const perPage = Math.min(50, Math.max(1, Math.floor(input.perPage ?? 10)));
	let query = (await createClient()).from("orders").select(LIST_COLUMNS, { count: "exact" });

	if (input.q?.trim()) {
		const n = parseOrderNumber(input.q);
		if (n == null) return ok({ rows: [], total: 0 });
		query = query.eq("order_number", n);
	}
	if (input.status === "open") query = query.in("status", ["pending", "processing", "shipped"]);
	else if (["pending", "processing", "shipped", "completed", "cancelled"].includes(input.status ?? "")) query = query.eq("status", input.status!);
	const day = /^\d{4}-\d{2}-\d{2}$/;
	if (input.from && day.test(input.from)) query = query.gte("created_at", `${input.from}T00:00:00Z`);
	if (input.to && day.test(input.to)) query = query.lte("created_at", `${input.to}T23:59:59Z`);

	const [column, ascending] = SORTS[input.sort ?? ""] ?? SORTS[""];
	const start = (page - 1) * perPage;
	const { data, count, error } = await query.order(column, { ascending }).range(start, start + perPage - 1);
	if (error) return internal("orders.list", error);
	return ok({ rows: (data ?? []).map(summary), total: count ?? 0 });
}

async function loadMine(orderNumber: string | number): Promise<Record<string, unknown> | null> {
	const n = typeof orderNumber === "number" ? orderNumber : parseOrderNumber(orderNumber);
	if (n == null) return null;
	const { data } = await (await createClient()).from("orders").select(DETAIL_COLUMNS).eq("order_number", n).maybeSingle();
	return data;
}

export async function getMyOrder(orderNumber: string | number): Promise<Result<MyOrder>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	const o = await loadMine(orderNumber);
	if (!o) return fail("NOT_FOUND", "We couldn't find that order in your account.");
	const status = { status: o.status as string, payment_status: o.payment_status as string };
	return ok({
		...summary(o),
		id: o.id as string,
		access_token: String(o.access_token),
		items: (o.items ?? []) as OrderLine[],
		subtotal: Number(o.subtotal),
		shipping_total: Number(o.shipping_total ?? 0),
		tax_total: Number(o.tax_total ?? 0),
		tax_breakdown: (o.tax_breakdown as MyOrder["tax_breakdown"]) ?? null,
		shipping_method: (o.shipping_method as MyOrder["shipping_method"]) ?? null,
		shipping_address: (o.shipping_address as MyOrder["shipping_address"]) ?? null,
		billing_address: (o.billing_address as MyOrder["billing_address"]) ?? null,
		notes: (o.notes as string | null) ?? null,
		paid_at: (o.paid_at as string | null) ?? null,
		cancel_reason: (o.cancel_reason as string | null) ?? null,
		canCancel: canSelfCancel(status),
		canRequestCancel: !canSelfCancel(status) && !o.cancel_requested_at && ["pending", "processing"].includes(status.status),
	});
}

/** D22: instant cancel for unpaid, not-yet-processed orders (stock goes back). */
export async function cancelMyOrder(orderNumber: string | number): Promise<Result<null>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	if (!(await rateLimit("forms", "order_cancel", [me.data.id]))) return fail("RATE_LIMITED");
	const o = await loadMine(orderNumber);
	if (!o) return fail("NOT_FOUND", "We couldn't find that order in your account.");
	if (!canSelfCancel({ status: o.status as string, payment_status: o.payment_status as string })) return fail("CONFLICT", "This order can't be cancelled online anymore. Request a cancellation instead.");

	// Ownership is proven above (RLS read); the guarded update avoids racing an admin or a payment.
	const { data, error } = await createAdminClient()
		.from("orders")
		.update({ status: "cancelled", cancel_requested_at: new Date().toISOString(), cancel_reason: "Cancelled by the customer" })
		.eq("id", o.id as string)
		.eq("customer_id", me.data.id)
		.eq("status", "pending")
		.eq("payment_status", "unpaid")
		.select("id")
		.maybeSingle();
	if (error) return internal("orders.cancel", error);
	if (!data) return fail("CONFLICT", "This order changed in the meantime. Please refresh.");
	const slugs = await releaseOrderStock(o.id as string);
	if (slugs.length) {
		revalidateTag("products", { expire: 0 });
		slugs.forEach((s) => revalidatePath(`/product/${s}`));
	}
	revalidatePath("/admin/shop", "layout");
	notifyOrderLater(o.id as string, "cancelled");
	await audit({ kind: "admin", action: "orders.customer_cancelled", entity: "orders", entityId: o.id as string, summary: `${formatOrderNumber(o.order_number as number)} cancelled by the customer`, actor: { id: me.data.id, email: me.data.email } });
	return ok(null);
}

const reasonSchema = z.string().trim().min(3, "Tell us briefly why (at least 3 characters).").max(500);

/** D22: paid or processing orders — the request is stored on the order for the shop to handle (refund). */
export async function requestCancellation(orderNumber: string | number, reason: string): Promise<Result<null>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	const parsed = reasonSchema.safeParse(reason);
	if (!parsed.success) return fail("VALIDATION", undefined, { reason: parsed.error.issues[0].message });
	if (!(await rateLimit("forms", "order_cancel", [me.data.id]))) return fail("RATE_LIMITED");
	const o = await loadMine(orderNumber);
	if (!o) return fail("NOT_FOUND", "We couldn't find that order in your account.");
	if (o.cancel_requested_at) return fail("CONFLICT", "You've already asked to cancel this order. We'll be in touch.");
	if (!["pending", "processing"].includes(o.status as string)) return fail("CONFLICT", "This order can't be cancelled anymore. Please contact us.");

	const { data, error } = await createAdminClient()
		.from("orders")
		.update({ cancel_requested_at: new Date().toISOString(), cancel_reason: parsed.data })
		.eq("id", o.id as string)
		.eq("customer_id", me.data.id)
		.is("cancel_requested_at", null)
		.select("id")
		.maybeSingle();
	if (error) return internal("orders.requestCancel", error);
	if (!data) return fail("CONFLICT", "You've already asked to cancel this order.");
	revalidatePath("/admin/shop", "layout");
	await audit({ kind: "admin", action: "orders.cancel_requested", entity: "orders", entityId: o.id as string, summary: `${formatOrderNumber(o.order_number as number)}: customer asked to cancel`, details: { reason: parsed.data }, actor: { id: me.data.id, email: me.data.email } });
	return ok(null);
}

/** D23: adds what's still for sale (today's price/stock) to the cart; lists what was skipped. */
export async function buyAgain(orderNumber: string | number): Promise<Result<{ added: number; skipped: Array<{ title: string; reason: string }> }>> {
	const me = await requireCustomer();
	if (!me.ok) return me;
	const o = await loadMine(orderNumber);
	if (!o) return fail("NOT_FOUND", "We couldn't find that order in your account.");
	let added = 0;
	const skipped: Array<{ title: string; reason: string }> = [];
	for (const line of (o.items ?? []) as OrderLine[]) {
		const res = await addItem({ productId: line.product_id, quantity: line.quantity });
		if (res.ok) added++;
		else skipped.push({ title: line.title, reason: res.error.message });
	}
	return ok({ added, skipped });
}
