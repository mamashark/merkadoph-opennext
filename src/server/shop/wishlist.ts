import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { availability, priceInfo, type StockStatus } from "@/lib/pricing";
import { rateLimit } from "@/lib/rate-limit";
import { addItem } from "./cart";
import { assertShopOpen, getShopperContext, getWritableShopperContext, type Customer, type ShopperContext } from "./context";
import { fail, internal, ok, type Result } from "./result";

/**
 * Wishlist for guests (cookie token, D5) and customers — shop-reference.md §3.7, §14, A4.
 * Only live products are shown; deleted products disappear via ON DELETE CASCADE.
 */

export const MAX_WISHLIST = 200;

export type WishlistItem = {
	productId: string;
	slug: string;
	title: string;
	image: string | null;
	imageAlt: string | null;
	price: number | null;
	regularPrice: number | null;
	onSale: boolean;
	availability: StockStatus;
	addedAt: string;
};

const db = () => createAdminClient();
const idInput = z.object({ productId: z.uuid() });

/** Owner filter: the customer, or this device's guest token. */
const owner = (ctx: ShopperContext): [string, string] => (ctx.customer ? ["customer_id", ctx.customer.id] : ["guest_token_hash", ctx.guestTokenHash!]);
const hasOwner = (ctx: ShopperContext) => !!(ctx.customer || ctx.guestTokenHash);

/** Product ids on the wishlist (for heart buttons). */
export async function getWishlistIds(): Promise<Result<string[]>> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	const ctx = await getShopperContext();
	if (!hasOwner(ctx)) return ok([]);
	const { data, error } = await db().from("wishlist_items").select("product_id").eq(...owner(ctx));
	if (error) return internal("wishlist.ids", error);
	return ok((data ?? []).map((r) => r.product_id as string));
}

export async function getWishlist(): Promise<Result<WishlistItem[]>> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	const ctx = await getShopperContext();
	if (!hasOwner(ctx)) return ok([]);
	const { data: rows, error } = await db().from("wishlist_items").select("product_id,created_at").eq(...owner(ctx)).order("created_at", { ascending: false });
	if (error) return internal("wishlist.list", error);
	if (!rows?.length) return ok([]);

	// Public client + RLS: only live products come back.
	const { data: products, error: pErr } = await createPublicClient()
		.from("products")
		.select("id,title,slug,cover_image_url,cover_image_alt,regular_price,sale_price,sale_starts_at,sale_ends_at,manage_stock,stock_quantity,stock_status")
		.in(
			"id",
			rows.map((r) => r.product_id as string),
		);
	if (pErr) return internal("wishlist.products", pErr);

	return ok(
		rows.flatMap((r) => {
			const p = products?.find((x) => x.id === r.product_id);
			if (!p) return [];
			const { price, regular, onSale } = priceInfo(p);
			return [{ productId: p.id, slug: p.slug, title: p.title, image: p.cover_image_url, imageAlt: p.cover_image_alt, price, regularPrice: regular, onSale, availability: availability(p), addedAt: r.created_at as string }];
		}),
	);
}

async function writeGuard(): Promise<Result<ShopperContext>> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	const ctx = await getWritableShopperContext();
	if (!(await rateLimit("cart", "wishlist", [ctx.customer?.id ?? ctx.guestTokenHash ?? "anon"]))) return fail("RATE_LIMITED");
	return ok(ctx);
}

/** Adds the product if it isn't saved yet, removes it if it is. Returns the new state. */
export async function toggleWishlist(input: { productId: string }): Promise<Result<{ saved: boolean }>> {
	const parsed = idInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", "That product can't be saved.");
	const guard = await writeGuard();
	if (!guard.ok) return guard;
	const ctx = guard.data;
	const productId = parsed.data.productId;

	const { data: existing } = await db().from("wishlist_items").select("id").eq("product_id", productId).eq(...owner(ctx)).maybeSingle();
	if (existing) {
		await db().from("wishlist_items").delete().eq("id", existing.id);
		return ok({ saved: false });
	}

	const { count } = await db().from("wishlist_items").select("id", { count: "exact", head: true }).eq(...owner(ctx));
	if ((count ?? 0) >= MAX_WISHLIST) return fail("VALIDATION", `Your wishlist can hold up to ${MAX_WISHLIST} products.`);
	const { data: live } = await createPublicClient().from("products").select("id").eq("id", productId).maybeSingle();
	if (!live) return fail("UNAVAILABLE", "This product isn't available.");

	const { error } = await db()
		.from("wishlist_items")
		.insert(ctx.customer ? { customer_id: ctx.customer.id, product_id: productId } : { guest_token_hash: ctx.guestTokenHash, product_id: productId });
	if (error && error.code !== "23505") return internal("wishlist.add", error); // 23505: double click — already saved
	return ok({ saved: true });
}

export async function removeFromWishlist(input: { productId: string }): Promise<Result<null>> {
	const parsed = idInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION");
	const guard = await writeGuard();
	if (!guard.ok) return guard;
	await db().from("wishlist_items").delete().eq("product_id", parsed.data.productId).eq(...owner(guard.data));
	return ok(null);
}

/** Adds the product to the cart and takes it off the wishlist. */
export async function moveToCart(input: { productId: string }): Promise<Result<null>> {
	const added = await addItem({ productId: input.productId, quantity: 1 });
	if (!added.ok) return added;
	return removeFromWishlist(input);
}

/** Guest → signed in (D5): copy the guest wishlist into the account (no duplicates), then drop it. */
export async function mergeGuestWishlist(customer: Customer, guestTokenHash: string | null): Promise<void> {
	if (!guestTokenHash) return;
	const { data: rows } = await db().from("wishlist_items").select("product_id").eq("guest_token_hash", guestTokenHash);
	if (!rows?.length) return;
	const { data: mine } = await db().from("wishlist_items").select("product_id").eq("customer_id", customer.id);
	const have = new Set((mine ?? []).map((r) => r.product_id as string));
	const missing = rows.filter((r) => !have.has(r.product_id as string)).slice(0, Math.max(0, MAX_WISHLIST - have.size));
	if (missing.length) {
		const { error } = await db()
			.from("wishlist_items")
			.insert(missing.map((r) => ({ customer_id: customer.id, product_id: r.product_id })));
		if (error && error.code !== "23505") throw new Error(error.message);
	}
	await db().from("wishlist_items").delete().eq("guest_token_hash", guestTokenHash);
}
