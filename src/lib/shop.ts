import "server-only";
import { cache } from "react";
import { cached } from "@/lib/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { onlyLive } from "@/lib/content-server";
import { searchTerm, type ContentStatus } from "@/lib/content";
import type { Currency, StockStatus } from "@/lib/pricing";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ShopSettings = {
	enabled: boolean;
	currency: Currency;
	title: string;
	description: string;
	checkout_note: string;
	brand: string;
	google_product_category: string;
};

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
	enabled: false,
	currency: "SEK",
	title: "Shop",
	description: "",
	checkout_note: "",
	brand: "Merkado PH",
	google_product_category: "",
};

export type TaxonomyRef = { id: string; name: string; slug: string };
export type GalleryImage = { url: string; alt: string };

export type Product = {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	content: string;
	sku: string | null;
	regular_price: number | null;
	sale_price: number | null;
	sale_starts_at: string | null;
	sale_ends_at: string | null;
	manage_stock: boolean;
	stock_quantity: number | null;
	stock_status: StockStatus;
	weight_kg: number | null;
	length_cm: number | null;
	width_cm: number | null;
	height_cm: number | null;
	cover_image_url: string | null;
	cover_image_alt: string | null;
	gallery: GalleryImage[];
	brand: string | null;
	gtin: string | null;
	mpn: string | null;
	condition: "new" | "refurbished" | "used";
	is_featured: boolean;
	sort_order: number;
	meta_title: string | null;
	meta_description: string | null;
	status: ContentStatus;
	published_at: string | null;
	created_at: string;
	updated_at: string;
	categories: TaxonomyRef[];
	tags: TaxonomyRef[];
};

export type ProductCard = Pick<
	Product,
	| "id"
	| "title"
	| "slug"
	| "excerpt"
	| "regular_price"
	| "sale_price"
	| "sale_starts_at"
	| "sale_ends_at"
	| "manage_stock"
	| "stock_quantity"
	| "stock_status"
	| "cover_image_url"
	| "cover_image_alt"
	| "is_featured"
	| "published_at"
	| "updated_at"
	| "categories"
>;

export type Category = {
	id: string;
	name: string;
	slug: string;
	parent_id: string | null;
	description: string | null;
	image_url: string | null;
	sort_order: number;
	meta_title: string | null;
	meta_description: string | null;
	created_at: string;
	updated_at: string;
	product_count?: number;
};

export type Tag = { id: string; name: string; slug: string; created_at: string; product_count?: number };

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

/** Shop settings incl. the on/off switch. Falls back to "off" if the table isn't there yet. */
export const getShopSettings = cached(async (): Promise<ShopSettings> => {
	const { data } = await createPublicClient().from("site_settings").select("value").eq("key", "shop").maybeSingle();
	return { ...DEFAULT_SHOP_SETTINGS, ...((data?.value as Partial<ShopSettings>) ?? {}) };
}, "shop:getShopSettings", ["shop"]);

/* ------------------------------------------------------------------ */
/* Public product queries (RLS: live products only)                    */
/* ------------------------------------------------------------------ */

const TAXONOMY = "categories:product_categories(id,name,slug)";
const CARD_COLUMNS = `id,title,slug,excerpt,regular_price,sale_price,sale_starts_at,sale_ends_at,manage_stock,stock_quantity,stock_status,cover_image_url,cover_image_alt,is_featured,published_at,updated_at,${TAXONOMY}`;

export const SHOP_PER_PAGE = 12;

export const SHOP_SORTS = {
	"": { label: "Featured", order: [["is_featured", false], ["sort_order", true], ["published_at", false]] },
	newest: { label: "Newest", order: [["published_at", false]] },
	"price-asc": { label: "Price: low to high", order: [["regular_price", true]] },
	"price-desc": { label: "Price: high to low", order: [["regular_price", false]] },
	name: { label: "Name A–Z", order: [["title", true]] },
} as const satisfies Record<string, { label: string; order: ReadonlyArray<readonly [string, boolean]> }>;
export type ShopSort = keyof typeof SHOP_SORTS;

type ListQuery = { category?: string; tag?: string; q?: string; sort?: string; page?: number; perPage?: number };

export const getShopProducts = cached(async ({ category, tag, q, sort = "", page = 1, perPage = SHOP_PER_PAGE }: ListQuery) => {
	// Extra inner-joined embeds act as filters without trimming the displayed category list.
	const columns = [CARD_COLUMNS, category && "cat_filter:product_categories!inner(slug)", tag && "tag_filter:product_tags!inner(slug)"].filter(Boolean).join(",");
	let query = onlyLive(createPublicClient().from("products").select(columns, { count: "exact" }));
	if (category) query = query.eq("cat_filter.slug", category);
	if (tag) query = query.eq("tag_filter.slug", tag);
	const term = q ? searchTerm(q) : "";
	if (term) query = query.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%,sku.ilike.%${term}%`);
	for (const [column, ascending] of (SHOP_SORTS[sort as ShopSort] ?? SHOP_SORTS[""]).order) query = query.order(column, { ascending, nullsFirst: false });

	const from = (page - 1) * perPage;
	const { data, count, error } = await query.range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load products: ${error.message}`);
	const products = ((data ?? []) as unknown as Array<ProductCard & { cat_filter?: unknown; tag_filter?: unknown }>).map(({ cat_filter: _c, tag_filter: _t, ...p }) => p as ProductCard);
	return { products, total: count ?? 0 };
}, "products:getShopProducts", ["products"]);

export const getProductBySlug = cache(
	cached(async (slug: string): Promise<Product | null> => {
		const { data, error } = await onlyLive(createPublicClient().from("products").select(`*,${TAXONOMY},tags:product_tags(id,name,slug)`).eq("slug", slug)).maybeSingle();
		if (error) throw new Error(`Failed to load product: ${error.message}`);
		return data as Product | null;
	}, "products:getProductBySlug", ["products"]),
);

export const getRelatedProducts = cached(async (productId: string, categorySlugs: string[], limit: number = 4): Promise<ProductCard[]> => {
	if (!categorySlugs.length) return [];
	const { data } = await onlyLive(createPublicClient().from("products").select(`${CARD_COLUMNS},cat_filter:product_categories!inner(slug)`))
		.in("cat_filter.slug", categorySlugs)
		.neq("id", productId)
		.order("is_featured", { ascending: false })
		.order("published_at", { ascending: false })
		.limit(limit);
	return ((data ?? []) as unknown as Array<ProductCard & { cat_filter?: unknown }>).map(({ cat_filter: _c, ...p }) => p as ProductCard);
}, "products:getRelatedProducts", ["products"]);

/** Categories with live product counts (RLS on the map table only exposes live products). */
export const getCategories = cached(async (): Promise<Category[]> => {
	const { data, error } = await createPublicClient()
		.from("product_categories")
		.select("*,product_category_map(count)")
		.order("sort_order", { ascending: true })
		.order("name", { ascending: true });
	if (error) return [];
	return (data as Array<Category & { product_category_map: Array<{ count: number }> }>).map(({ product_category_map, ...c }) => ({ ...c, product_count: product_category_map?.[0]?.count ?? 0 }));
}, "products:getCategories", ["products"]);

export const getCategoryBySlug = cache(async (slug: string): Promise<Category | null> => (await getCategories()).find((c) => c.slug === slug) ?? null);

export const getTags = cached(async (): Promise<Tag[]> => {
	const { data } = await createPublicClient().from("product_tags").select("*,product_tag_map(count)").order("name");
	return ((data ?? []) as Array<Tag & { product_tag_map: Array<{ count: number }> }>).map(({ product_tag_map, ...t }) => ({ ...t, product_count: product_tag_map?.[0]?.count ?? 0 }));
}, "products:getTags", ["products"]);

/** Everything the feed and sitemap need, for all live products. */
export const getAllLiveProducts = cached(async (): Promise<Product[]> => {
	const { data, error } = await onlyLive(createPublicClient().from("products").select(`*,${TAXONOMY},tags:product_tags(id,name,slug)`))
		.order("published_at", { ascending: false })
		.limit(5000);
	if (error) throw new Error(`Failed to load products: ${error.message}`);
	return (data ?? []) as Product[];
}, "products:getAllLiveProducts", ["products"]);

/** Uncached, for checkout: always re-read prices and stock from the database. */
export async function getProductsForCheckout(ids: string[]) {
	if (!ids.length) return [];
	const { data, error } = await onlyLive(
		createPublicClient().from("products").select("id,title,slug,sku,regular_price,sale_price,sale_starts_at,sale_ends_at,manage_stock,stock_quantity,stock_status,cover_image_url"),
	).in("id", ids);
	if (error) throw new Error(`Failed to load products: ${error.message}`);
	return data as Array<Pick<Product, "id" | "title" | "slug" | "sku" | "regular_price" | "sale_price" | "sale_starts_at" | "sale_ends_at" | "manage_stock" | "stock_quantity" | "stock_status" | "cover_image_url">>;
}

/** Breadcrumb trail for a category (root → leaf). */
export function categoryTrail(category: Category, all: Category[]): Category[] {
	const trail: Category[] = [category];
	let current = category;
	while (current.parent_id && trail.length < 6) {
		const parent = all.find((c) => c.id === current.parent_id);
		if (!parent) break;
		trail.unshift(parent);
		current = parent;
	}
	return trail;
}
