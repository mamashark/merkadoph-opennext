"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeShop } from "@/lib/cache";
import { slugify } from "@/lib/content";
import { fetchExisting, optional, optionalUrl, resolvePublishing, text, uniqueSlug, upsertRow } from "@/lib/content-server";
import { fromDateTimeInput } from "@/lib/datetime";
import { CURRENCIES, type Currency } from "@/lib/pricing";
import { getProductFeed, PRODUCT_FEED_PATH } from "@/lib/product-feed";
import { logOp } from "@/lib/ops";
import { DEFAULT_SHOP_SETTINGS, type GalleryImage, type ShopSettings } from "@/lib/shop";
import { getShopReadiness } from "@/lib/shop-status";

const qs = (o: Record<string, string>) => new URLSearchParams(o).toString();

function money(formData: FormData, key: string, label: string): number | null {
	const raw = String(formData.get(key) ?? "").trim().replace(",", ".");
	if (!raw) return null;
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 0 || n > 9_999_999) throw new Error(`${label} must be a positive number.`);
	return Math.round(n * 100) / 100;
}

function int(formData: FormData, key: string, fallback: number | null = null): number | null {
	const raw = String(formData.get(key) ?? "").trim();
	if (!raw) return fallback;
	const n = Math.trunc(Number(raw));
	return Number.isFinite(n) ? Math.max(-999_999, Math.min(999_999, n)) : fallback;
}

function readGallery(raw: FormDataEntryValue | null): GalleryImage[] {
	try {
		const parsed = JSON.parse(String(raw ?? "[]"));
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((g) => g && typeof g.url === "string" && /^https?:\/\//.test(g.url))
			.slice(0, 12)
			.map((g) => ({ url: String(g.url).slice(0, 1000), alt: String(g.alt ?? "").slice(0, 200) }));
	} catch {
		return [];
	}
}

/** Finds or creates tags by name (WooCommerce-style free-text tags). */
async function ensureTags(names: string[]): Promise<string[]> {
	const db = createAdminClient();
	const wanted = new Map(names.map((n) => [slugify(n), n.trim()]).filter(([slug, name]) => slug && name) as Array<[string, string]>);
	if (!wanted.size) return [];
	const { data: existing } = await db.from("product_tags").select("id,slug").in("slug", [...wanted.keys()]);
	const have = new Map((existing ?? []).map((t) => [t.slug as string, t.id as string]));
	const missing = [...wanted].filter(([slug]) => !have.has(slug)).map(([slug, name]) => ({ slug, name: name.slice(0, 60) }));
	if (missing.length) {
		const { data: created, error } = await db.from("product_tags").insert(missing).select("id,slug");
		if (error) throw new Error(`Couldn't create tags: ${error.message}`);
		created?.forEach((t) => have.set(t.slug as string, t.id as string));
	}
	return [...wanted.keys()].map((slug) => have.get(slug)!).filter(Boolean);
}

async function replaceLinks(table: "product_category_map" | "product_tag_map", column: "category_id" | "tag_id", productId: string, ids: string[]) {
	const db = createAdminClient();
	const { error: delErr } = await db.from(table).delete().eq("product_id", productId);
	if (delErr) throw new Error(`Couldn't update ${table}: ${delErr.message}`);
	if (ids.length) {
		const { error } = await db.from(table).insert([...new Set(ids)].map((id) => ({ product_id: productId, [column]: id })));
		if (error) throw new Error(`Couldn't update ${table}: ${error.message}`);
	}
}

function revalidateShopAdmin() {
	revalidatePath("/admin/shop", "layout");
	revalidatePath("/admin");
}

/* ------------------------------ Products ------------------------------ */

export async function saveProduct(formData: FormData) {
	const user = await requireAdmin();
	const id = text(formData, "id", 64) || undefined;
	const title = text(formData, "title", 200);
	if (!title) throw new Error("Product name is required.");

	const regular_price = money(formData, "regular_price", "Regular price");
	const sale_price = money(formData, "sale_price", "Sale price");
	if (sale_price != null && regular_price != null && sale_price > regular_price) throw new Error("The sale price can't be higher than the regular price.");
	const sale_starts_at = fromDateTimeInput(formData.get("sale_starts_at"));
	const sale_ends_at = fromDateTimeInput(formData.get("sale_ends_at"));
	if (sale_starts_at && sale_ends_at && sale_ends_at < sale_starts_at) throw new Error("The sale can't end before it starts.");

	const manage_stock = formData.get("manage_stock") === "on";
	const stockStatus = String(formData.get("stock_status") ?? "instock");
	const sku = optional(text(formData, "sku", 64));

	const existing = await fetchExisting("products", id);
	const slug = await uniqueSlug("products", text(formData, "slug", 80) || title, id);
	const { status, published_at, notice } = resolvePublishing(formData, existing);

	if (sku) {
		const { data: clash } = await createAdminClient().from("products").select("id").eq("sku", sku).neq("id", id ?? "00000000-0000-0000-0000-000000000000").maybeSingle();
		if (clash) throw new Error(`SKU “${sku}” is already used by another product.`);
	}

	const values = {
		title,
		slug,
		status,
		published_at,
		excerpt: optional(text(formData, "excerpt", 1000)),
		content: String(formData.get("content") ?? "").slice(0, 200_000),
		sku,
		regular_price,
		sale_price,
		sale_starts_at,
		sale_ends_at,
		manage_stock,
		stock_quantity: manage_stock ? (int(formData, "stock_quantity", 0) ?? 0) : null,
		stock_status: ["instock", "outofstock", "onbackorder"].includes(stockStatus) ? stockStatus : "instock",
		weight_kg: money(formData, "weight_kg", "Weight"),
		length_cm: money(formData, "length_cm", "Length"),
		width_cm: money(formData, "width_cm", "Width"),
		height_cm: money(formData, "height_cm", "Height"),
		cover_image_url: optionalUrl(formData, "cover_image_url"),
		cover_image_alt: optional(text(formData, "cover_image_alt", 200)),
		gallery: readGallery(formData.get("gallery")),
		brand: optional(text(formData, "brand", 80)),
		gtin: optional(text(formData, "gtin", 20).replace(/\D/g, "")),
		mpn: optional(text(formData, "mpn", 70)),
		condition: ["new", "refurbished", "used"].includes(String(formData.get("condition"))) ? String(formData.get("condition")) : "new",
		is_featured: formData.get("is_featured") === "on",
		sort_order: int(formData, "sort_order", 0) ?? 0,
		meta_title: optional(text(formData, "meta_title", 70)),
		meta_description: optional(text(formData, "meta_description", 170)),
	};

	const productId = await upsertRow("products", id, values, { author_id: user.id });

	const categoryIds = formData.getAll("category_ids").map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v));
	await replaceLinks("product_category_map", "category_id", productId, categoryIds);
	const tagIds = await ensureTags(String(formData.get("tags") ?? "").split(",").slice(0, 20));
	await replaceLinks("product_tag_map", "tag_id", productId, tagIds);

	purgeShop([slug, existing?.slug]);
	revalidateShopAdmin();
	redirect(`/admin/shop/products/${productId}/edit?notice=${notice}`);
}

export async function deleteProduct(formData: FormData) {
	await requireAdmin();
	const id = text(formData, "id", 64);
	const db = createAdminClient();
	const { data } = await db.from("products").select("slug").eq("id", id).maybeSingle();
	const { error } = await db.from("products").delete().eq("id", id);
	if (error) redirect(`/admin/shop/products?${qs({ error: error.message })}`);
	purgeShop([data?.slug as string | undefined]);
	revalidateShopAdmin();
	redirect("/admin/shop/products?notice=deleted");
}

/* ----------------------------- Categories ----------------------------- */

export async function saveCategory(formData: FormData) {
	await requireAdmin();
	const id = text(formData, "id", 64) || undefined;
	const name = text(formData, "name", 120);
	if (!name) throw new Error("Category name is required.");
	const parent = text(formData, "parent_id", 64);
	if (id && parent === id) throw new Error("A category can't be its own parent.");

	const slug = await uniqueSlug("product_categories", text(formData, "slug", 80) || name, id);
	const values = {
		name,
		slug,
		parent_id: parent || null,
		description: optional(text(formData, "description", 2000)),
		image_url: optionalUrl(formData, "image_url"),
		sort_order: int(formData, "sort_order", 0) ?? 0,
		meta_title: optional(text(formData, "meta_title", 70)),
		meta_description: optional(text(formData, "meta_description", 170)),
	};
	const savedId = await upsertRow("product_categories", id, values, {});
	purgeShop();
	revalidateShopAdmin();
	redirect(id ? `/admin/shop/categories/${savedId}?notice=saved` : `/admin/shop/categories?${qs({ notice: `Category “${name}” created.` })}`);
}

export async function deleteCategory(formData: FormData) {
	await requireAdmin();
	const { error } = await createAdminClient()
		.from("product_categories")
		.delete()
		.eq("id", text(formData, "id", 64));
	purgeShop();
	revalidateShopAdmin();
	redirect(`/admin/shop/categories?${qs(error ? { error: error.message } : { notice: "Category deleted. Its products are kept; sub-categories moved to the top level." })}`);
}

/* -------------------------------- Tags -------------------------------- */

export async function saveTag(formData: FormData) {
	await requireAdmin();
	const id = text(formData, "id", 64) || undefined;
	const name = text(formData, "name", 60);
	if (!name) throw new Error("Tag name is required.");
	const slug = await uniqueSlug("product_tags", text(formData, "slug", 80) || name, id);
	await upsertRow("product_tags", id, { name, slug }, {});
	purgeShop();
	revalidateShopAdmin();
	redirect(`/admin/shop/tags?${qs({ notice: id ? "Tag saved." : `Tag “${name}” created.` })}`);
}

export async function deleteTag(formData: FormData) {
	await requireAdmin();
	const { error } = await createAdminClient()
		.from("product_tags")
		.delete()
		.eq("id", text(formData, "id", 64));
	purgeShop();
	revalidateShopAdmin();
	redirect(`/admin/shop/tags?${qs(error ? { error: error.message } : { notice: "Tag deleted." })}`);
}

/* ------------------------------- Orders ------------------------------- */

export async function updateOrderStatus(formData: FormData) {
	await requireAdmin();
	const id = text(formData, "id", 64);
	const status = text(formData, "status", 20);
	if (!["pending", "processing", "completed", "cancelled"].includes(status)) throw new Error("Unknown order status.");
	const { error } = await createAdminClient().from("orders").update({ status }).eq("id", id);
	revalidateShopAdmin();
	redirect(`/admin/shop/orders/${id}?${qs(error ? { error: error.message } : { notice: "Order status updated." })}`);
}

/* ------------------------------ Settings ------------------------------ */

export async function saveShopSettings(formData: FormData) {
	await requireAdmin();
	const currency = String(formData.get("currency") ?? "SEK") as Currency;
	const value: ShopSettings = {
		...DEFAULT_SHOP_SETTINGS,
		enabled: formData.get("enabled") === "on",
		currency: CURRENCIES.includes(currency) ? currency : "SEK",
		title: text(formData, "title", 80) || "Shop",
		description: text(formData, "description", 300),
		checkout_note: text(formData, "checkout_note", 1000),
		brand: text(formData, "brand", 80),
		google_product_category: text(formData, "google_product_category", 200),
	};
	// The shop can only go live with at least one working payment method.
	const blocked = value.enabled && (await getShopReadiness()).usable.length === 0;
	if (blocked) value.enabled = false;

	const { error } = await createAdminClient().from("site_settings").upsert({ key: "shop", value });
	if (error) redirect(`/admin/shop?${qs({ error: error.message })}`);
	purgeShop();
	// The public header shows/hides the Shop link, so every public page is affected.
	revalidatePath("/", "layout");
	if (blocked) redirect(`/admin/shop?${qs({ error: "Settings saved, but the shop stays OFF — set up and turn on at least one payment method in Shop → Payments first." })}`);
	redirect(`/admin/shop?${qs({ notice: value.enabled ? "Settings saved. The shop is ON." : "Settings saved. The shop is OFF — shop pages, cart and checkout are hidden." })}`);
}

export async function regenerateFeed() {
	const me = await requireAdmin();
	const started = Date.now();
	updateTag("product-feed");
	updateTag("products");
	revalidatePath(PRODUCT_FEED_PATH);
	let flash: Record<string, string>;
	try {
		const { count } = await getProductFeed();
		await logOp({ kind: "product_feed", source: "manual", scope: PRODUCT_FEED_PATH, status: "success", message: `Feed regenerated with ${count} product${count === 1 ? "" : "s"}.`, duration_ms: Date.now() - started, actor_email: me.email }).catch(() => {});
		flash = { notice: `Product feed regenerated (${count} product${count === 1 ? "" : "s"}).` };
	} catch (err) {
		const message = err instanceof Error ? err.message : "Feed regeneration failed.";
		await logOp({ kind: "product_feed", source: "manual", scope: PRODUCT_FEED_PATH, status: "error", message, duration_ms: Date.now() - started, actor_email: me.email }).catch(() => {});
		flash = { error: message };
	}
	revalidatePath("/admin/shop");
	redirect(`/admin/shop?${qs(flash)}`);
}
