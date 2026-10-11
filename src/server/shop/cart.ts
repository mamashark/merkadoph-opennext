import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductsForCheckout, getShopSettings } from "@/lib/shop";
import { availability, maxPurchasable, priceInfo } from "@/lib/pricing";
import { rateLimit } from "@/lib/rate-limit";
import { assertShopOpen, getShopperContext, getWritableShopperContext, type Customer, type ShopperContext } from "./context";
import { fail, internal, ok, type Result } from "./result";

/**
 * Server-side cart for guests (cookie token) and customers (account) — shop-reference.md §14–15, A3.
 * Prices and stock are re-read on every read; the browser only ever sends product ids and quantities.
 */

export const MAX_LINES = 50;
export const MAX_QTY = 99;

export type LineStatus = "ok" | "clamped" | "out_of_stock";
export type CartLineView = {
	productId: string;
	slug: string;
	title: string;
	sku: string | null;
	image: string | null;
	unitPrice: number;
	regularPrice: number | null;
	onSale: boolean;
	quantity: number;
	/** Most this shopper can buy (null = no stock limit, still capped at 99). */
	max: number | null;
	lineTotal: number;
	/** The price when it was added differs from today's price. */
	priceChanged: boolean;
	status: LineStatus;
	/** Per-unit weight (null = unknown) and VAT class, for shipping and VAT. */
	weightKg: number | null;
	taxClass: string | null;
};
export type CartView = {
	id: string | null;
	version: number;
	currency: string;
	lines: CartLineView[];
	count: number;
	subtotal: number;
	/** Total weight in kg, or null when a product has no weight (weight-based shipping is then not offered). */
	weightKg: number | null;
	/** Things that changed since the shopper last looked (removed products, clamped quantities…). */
	notices: string[];
	canCheckout: boolean;
};
export type CartSummary = { count: number };

const round2 = (n: number) => Math.round(n * 100) / 100;
const db = () => createAdminClient();
const productInput = z.object({ productId: z.uuid(), quantity: z.coerce.number().int().min(0).max(MAX_QTY) });

/** Rate-limit key: the shopper, never the IP alone (many shoppers can share one IP). */
const shopperKey = (ctx: ShopperContext) => ctx.customer?.id ?? ctx.guestTokenHash ?? "anon";

/** The active cart id of this shopper, or null (never creates one). */
async function findCartId(ctx: ShopperContext): Promise<string | null> {
	if (!ctx.customer && !ctx.guestTokenHash) return null;
	let query = db().from("carts").select("id").eq("status", "active");
	query = ctx.customer ? query.eq("customer_id", ctx.customer.id) : query.eq("guest_token_hash", ctx.guestTokenHash!);
	const { data } = await query.maybeSingle();
	return (data?.id as string | undefined) ?? null;
}

async function openCartId(ctx: ShopperContext): Promise<string> {
	const currency = (await getShopSettings()).currency;
	const { data, error } = await db().rpc("cart_open", { p_customer: ctx.customer?.id ?? null, p_guest: ctx.customer ? null : ctx.guestTokenHash, p_currency: currency });
	if (error || !data) throw new Error(error?.message ?? "cart_open returned nothing");
	return data as string;
}

const emptyCart = async (): Promise<CartView> => ({ id: null, version: 0, currency: (await getShopSettings()).currency, lines: [], count: 0, subtotal: 0, weightKg: 0, notices: [], canCheckout: false });

/**
 * Loads the cart with live prices and stock, and repairs it: removes products that are no longer
 * sold and lowers quantities above stock (with notices for the shopper).
 */
async function loadCart(cartId: string): Promise<CartView> {
	const client = db();
	const [{ data: cart }, { data: items }] = await Promise.all([
		client.from("carts").select("id,version,currency").eq("id", cartId).single(),
		client.from("cart_items").select("product_id,quantity,price_at_add,added_at").eq("cart_id", cartId).order("added_at"),
	]);
	if (!cart) return emptyCart();
	const products = await getProductsForCheckout((items ?? []).map((i) => i.product_id as string));
	const notices: string[] = [];
	const lines: CartLineView[] = [];
	const removals: string[] = [];
	const clamps: Array<{ productId: string; quantity: number }> = [];

	for (const item of items ?? []) {
		const p = products.find((x) => x.id === item.product_id);
		const { price, regular, onSale } = p ? priceInfo(p) : { price: null, regular: null, onSale: false };
		if (!p || price == null) {
			removals.push(item.product_id as string);
			notices.push(p ? `${p.title} can't be bought online right now and was removed.` : "A product in your cart is no longer available and was removed.");
			continue;
		}
		const max = maxPurchasable(p);
		let quantity = item.quantity as number;
		let status: LineStatus = "ok";
		if (availability(p) === "outofstock") {
			status = "out_of_stock";
			notices.push(`${p.title} is out of stock.`);
		} else if (max != null && quantity > max) {
			quantity = max;
			status = "clamped";
			clamps.push({ productId: p.id, quantity });
			notices.push(`Only ${max} of ${p.title} left — we updated the quantity.`);
		}
		const priceAtAdd = item.price_at_add == null ? null : Number(item.price_at_add);
		lines.push({
			productId: p.id,
			slug: p.slug,
			title: p.title,
			sku: p.sku,
			image: p.cover_image_url,
			unitPrice: price,
			regularPrice: regular,
			onSale,
			quantity,
			max,
			lineTotal: round2(price * quantity),
			priceChanged: priceAtAdd != null && priceAtAdd !== price,
			status,
			weightKg: p.weight_kg == null ? null : Number(p.weight_kg),
			taxClass: p.tax_class ?? null,
		});
	}

	// Persist the repairs so the next read (and checkout) sees the same cart.
	if (removals.length) await client.from("cart_items").delete().eq("cart_id", cartId).in("product_id", removals);
	for (const c of clamps) await client.rpc("cart_set_item", { p_cart: cartId, p_product: c.productId, p_qty: c.quantity, p_mode: "set", p_max: c.quantity, p_price: null });
	let version = cart.version as number;
	if (removals.length || clamps.length) {
		await client.from("carts").update({ version: version + 1 }).eq("id", cartId);
		version = ((await client.from("carts").select("version").eq("id", cartId).single()).data?.version as number) ?? version + 1;
	}

	return {
		id: cart.id as string,
		version,
		currency: cart.currency as string,
		lines,
		count: lines.reduce((n, l) => n + l.quantity, 0),
		subtotal: round2(lines.reduce((s, l) => s + l.lineTotal, 0)),
		weightKg: lines.some((l) => l.weightKg == null) ? null : Math.round(lines.reduce((s, l) => s + (l.weightKg ?? 0) * l.quantity, 0) * 1000) / 1000,
		notices,
		canCheckout: lines.length > 0 && lines.every((l) => l.status !== "out_of_stock"),
	};
}

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

export async function getCart(): Promise<Result<CartView>> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	try {
		const id = await findCartId(await getShopperContext());
		return ok(id ? await loadCart(id) : await emptyCart());
	} catch (err) {
		return internal("cart.get", err);
	}
}

/** Cheap read for the header badge. */
export async function getCartSummary(): Promise<Result<CartSummary>> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	const id = await findCartId(await getShopperContext());
	if (!id) return ok({ count: 0 });
	const { data } = await db().from("cart_items").select("quantity").eq("cart_id", id);
	return ok({ count: (data ?? []).reduce((n, r) => n + (r.quantity as number), 0) });
}

/* ------------------------------------------------------------------ */
/* Writes                                                               */
/* ------------------------------------------------------------------ */

async function writeGuard(): Promise<Result<ShopperContext>> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	const ctx = await getWritableShopperContext();
	if (!(await rateLimit("cart", "cart", [shopperKey(ctx)]))) return fail("RATE_LIMITED");
	return ok(ctx);
}

/** Adds a product (quantity is added to what's already in the cart, capped by stock and 99). */
export async function addItem(input: { productId: string; quantity?: number }): Promise<Result<CartView>> {
	const parsed = productInput.safeParse({ quantity: 1, ...input });
	if (!parsed.success || parsed.data.quantity < 1) return fail("VALIDATION", "That product can't be added.");
	const guard = await writeGuard();
	if (!guard.ok) return guard;
	try {
		const [product] = await getProductsForCheckout([parsed.data.productId]);
		const price = product ? priceInfo(product).price : null;
		if (!product || price == null) return fail("UNAVAILABLE", "This product can't be bought online right now.");
		const max = maxPurchasable(product);
		if (max === 0) return fail("OUT_OF_STOCK", `${product.title} is out of stock.`);

		const cartId = await openCartId(guard.data);
		const { count } = await db().from("cart_items").select("product_id", { count: "exact", head: true }).eq("cart_id", cartId).neq("product_id", product.id);
		if ((count ?? 0) >= MAX_LINES) return fail("VALIDATION", `Your cart can hold up to ${MAX_LINES} different products.`);

		const { error } = await db().rpc("cart_set_item", { p_cart: cartId, p_product: product.id, p_qty: parsed.data.quantity, p_mode: "add", p_max: max ?? MAX_QTY, p_price: price });
		if (error) return internal("cart.add", error);
		return ok(await loadCart(cartId));
	} catch (err) {
		return internal("cart.add", err);
	}
}

/** Sets a line's quantity; 0 removes it. */
export async function setQuantity(input: { productId: string; quantity: number }): Promise<Result<CartView>> {
	const parsed = productInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", "Please enter a quantity between 0 and 99.");
	const guard = await writeGuard();
	if (!guard.ok) return guard;
	try {
		const cartId = await findCartId(guard.data);
		if (!cartId) return ok(await emptyCart());
		const [product] = await getProductsForCheckout([parsed.data.productId]);
		const max = product ? maxPurchasable(product) : 0;
		const price = product ? priceInfo(product).price : null;
		const qty = product ? parsed.data.quantity : 0; // gone products are just removed
		const { error } = await db().rpc("cart_set_item", { p_cart: cartId, p_product: parsed.data.productId, p_qty: qty, p_mode: "set", p_max: max ?? MAX_QTY, p_price: price });
		if (error) return internal("cart.set", error);
		return ok(await loadCart(cartId));
	} catch (err) {
		return internal("cart.set", err);
	}
}

export async function removeItem(input: { productId: string }): Promise<Result<CartView>> {
	return setQuantity({ productId: input.productId, quantity: 0 });
}

export async function clearCart(): Promise<Result<CartView>> {
	const guard = await writeGuard();
	if (!guard.ok) return guard;
	const cartId = await findCartId(guard.data);
	if (cartId) {
		await db().from("cart_items").delete().eq("cart_id", cartId);
		await db().from("carts").update({ last_activity_at: new Date().toISOString() }).eq("id", cartId);
	}
	return ok(await emptyCart());
}

/* ------------------------------------------------------------------ */
/* Identity transition (registered in transitions.ts)                   */
/* ------------------------------------------------------------------ */

/** Guest → signed in (D3): merge the device's guest cart into the account cart. Idempotent. */
export async function mergeGuestCart(customer: Customer, guestTokenHash: string | null): Promise<void> {
	if (!guestTokenHash) return;
	const { data: guest } = await db().from("carts").select("id").eq("status", "active").eq("guest_token_hash", guestTokenHash).maybeSingle();
	if (!guest) return;
	const { count } = await db().from("cart_items").select("product_id", { count: "exact", head: true }).eq("cart_id", guest.id);
	if (!count) {
		await db().from("carts").update({ status: "merged" }).eq("id", guest.id);
		return;
	}
	const intoId = await openCartId({ customer, guestTokenHash: null });
	const { error } = await db().rpc("cart_merge", { p_from: guest.id, p_into: intoId });
	if (error) throw new Error(error.message);
	await loadCart(intoId); // clamp merged quantities to stock right away
}

/* ------------------------------------------------------------------ */
/* Checkout helpers                                                     */
/* ------------------------------------------------------------------ */

/** The shopper's repaired, live-priced cart (empty view when there is none). */
export async function cartForCheckout(ctx: ShopperContext): Promise<CartView> {
	const id = await findCartId(ctx);
	return id ? loadCart(id) : emptyCart();
}

/** After an order is placed: the cart is closed and linked to the order (restorable, §15.4). */
export async function markCartConverted(cartId: string, orderId: string): Promise<void> {
	await db().from("carts").update({ status: "converted", converted_order_id: orderId, last_activity_at: new Date().toISOString() }).eq("id", cartId).eq("status", "active");
}
