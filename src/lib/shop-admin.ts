import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { filterByState } from "@/lib/content-server";
import { searchTerm } from "@/lib/content";
import { DEFAULT_SHOP_SETTINGS, type Category, type Product, type ShopSettings, type Tag } from "@/lib/shop";

// Service-role queries for the admin. Callers must have passed requireAdmin().

const term = (q?: string) => (q ? searchTerm(q) : "");

/* ------------------------------ Settings ------------------------------ */

export async function adminGetShopSettings(): Promise<ShopSettings> {
	const { data } = await createAdminClient().from("site_settings").select("value").eq("key", "shop").maybeSingle();
	return { ...DEFAULT_SHOP_SETTINGS, ...((data?.value as Partial<ShopSettings>) ?? {}) };
}

/* ------------------------------ Products ------------------------------ */

export type AdminProductRow = Pick<
	Product,
	"id" | "title" | "slug" | "sku" | "regular_price" | "sale_price" | "sale_starts_at" | "sale_ends_at" | "manage_stock" | "stock_quantity" | "stock_status" | "cover_image_url" | "is_featured" | "status" | "published_at" | "updated_at" | "categories"
>;

export const PRODUCT_SORTS = {
	"": { column: "updated_at", ascending: false },
	title: { column: "title", ascending: true },
	price: { column: "regular_price", ascending: true },
	stock: { column: "stock_quantity", ascending: true },
	published: { column: "published_at", ascending: false },
} as const;

export async function adminListProducts(opts: { q?: string; status?: string; category?: string; stock?: string; sort?: string; page?: number; perPage?: number }) {
	const { q, status, category, stock, sort = "", page = 1, perPage = 20 } = opts;
	const columns = [
		"id,title,slug,sku,regular_price,sale_price,sale_starts_at,sale_ends_at,manage_stock,stock_quantity,stock_status,cover_image_url,is_featured,status,published_at,updated_at,categories:product_categories(id,name,slug)",
		category && "cat_filter:product_categories!inner(id)",
	]
		.filter(Boolean)
		.join(",");
	let query = filterByState(createAdminClient().from("products").select(columns, { count: "exact" }), status ?? "");
	if (category) query = query.eq("cat_filter.id", category);
	if (stock === "instock" || stock === "outofstock" || stock === "onbackorder") query = query.eq("stock_status", stock);
	if (stock === "low") query = query.eq("manage_stock", true).lte("stock_quantity", 5);
	const t = term(q);
	if (t) query = query.or(`title.ilike.%${t}%,sku.ilike.%${t}%`);
	const order = PRODUCT_SORTS[sort as keyof typeof PRODUCT_SORTS] ?? PRODUCT_SORTS[""];
	const from = (page - 1) * perPage;
	const { data, count, error } = await query.order(order.column, { ascending: order.ascending, nullsFirst: false }).range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load products: ${error.message}`);
	return { rows: (data ?? []) as unknown as AdminProductRow[], total: count ?? 0 };
}

export async function adminGetProduct(id: string): Promise<Product | null> {
	const { data, error } = await createAdminClient().from("products").select("*,categories:product_categories(id,name,slug),tags:product_tags(id,name,slug)").eq("id", id).maybeSingle();
	if (error) throw new Error(`Failed to load product: ${error.message}`);
	return data as Product | null;
}

/* ----------------------------- Categories ----------------------------- */

export async function adminAllCategories(): Promise<Category[]> {
	const { data } = await createAdminClient().from("product_categories").select("*,product_category_map(count)").order("sort_order").order("name");
	return ((data ?? []) as Array<Category & { product_category_map: Array<{ count: number }> }>).map(({ product_category_map, ...c }) => ({ ...c, product_count: product_category_map?.[0]?.count ?? 0 }));
}

export const CATEGORY_SORTS = {
	"": [["sort_order", true], ["name", true]],
	name: [["name", true]],
	newest: [["created_at", false]],
	updated: [["updated_at", false]],
} as const;

export async function adminListCategories(opts: { q?: string; parent?: string; sort?: string; page?: number; perPage?: number }) {
	const { q, parent, sort = "", page = 1, perPage = 20 } = opts;
	let query = createAdminClient().from("product_categories").select("*,product_category_map(count)", { count: "exact" });
	if (parent === "top") query = query.is("parent_id", null);
	else if (parent) query = query.eq("parent_id", parent);
	const t = term(q);
	if (t) query = query.or(`name.ilike.%${t}%,slug.ilike.%${t}%`);
	for (const [column, ascending] of CATEGORY_SORTS[sort as keyof typeof CATEGORY_SORTS] ?? CATEGORY_SORTS[""]) query = query.order(column, { ascending });
	const from = (page - 1) * perPage;
	const { data, count, error } = await query.range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load categories: ${error.message}`);
	const rows = (data as Array<Category & { product_category_map: Array<{ count: number }> }>).map(({ product_category_map, ...c }) => ({ ...c, product_count: product_category_map?.[0]?.count ?? 0 }));
	return { rows, total: count ?? 0 };
}

export async function adminGetCategory(id: string): Promise<Category | null> {
	const { data } = await createAdminClient().from("product_categories").select("*").eq("id", id).maybeSingle();
	return data as Category | null;
}

/* -------------------------------- Tags -------------------------------- */

export async function adminListTags(opts: { q?: string; used?: string; sort?: string; page?: number; perPage?: number }) {
	const { q, used, sort = "", page = 1, perPage = 30 } = opts;
	// "usage" is an extra embed used only for filtering: inner join = used by a product, null = unused.
	const columns = ["*,product_tag_map(count)", used === "used" && "usage:product_tag_map!inner(product_id)", used === "unused" && "usage:product_tag_map(product_id)"].filter(Boolean).join(",");
	let query = createAdminClient().from("product_tags").select(columns, { count: "exact" });
	if (used === "unused") query = query.is("usage", null);
	const t = term(q);
	if (t) query = query.or(`name.ilike.%${t}%,slug.ilike.%${t}%`);
	query = sort === "newest" ? query.order("created_at", { ascending: false }) : sort === "name-desc" ? query.order("name", { ascending: false }) : query.order("name", { ascending: true });
	const from = (page - 1) * perPage;
	const { data, count, error } = await query.range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load tags: ${error.message}`);
	const rows = (data as unknown as Array<Tag & { product_tag_map: Array<{ count: number }>; usage?: unknown }>).map(({ product_tag_map, usage: _u, ...tag }) => ({
		...tag,
		product_count: product_tag_map?.[0]?.count ?? 0,
	}));
	return { rows, total: count ?? 0 };
}

export async function adminGetTag(id: string): Promise<Tag | null> {
	const { data } = await createAdminClient().from("product_tags").select("*").eq("id", id).maybeSingle();
	return data as Tag | null;
}

/* ------------------------------- Orders ------------------------------- */

export type OrderItem = { product_id: string; title: string; slug: string; sku: string | null; unit_price: number; quantity: number; line_total: number };
export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";
export type Order = {
	id: string;
	order_number: number;
	status: OrderStatus;
	customer_name: string;
	email: string;
	phone: string | null;
	address_line1: string | null;
	address_line2: string | null;
	postal_code: string | null;
	city: string | null;
	country: string;
	notes: string | null;
	items: OrderItem[];
	subtotal: number;
	currency: string;
	payment_method: "manual" | "stripe" | "paypal";
	payment_status: "unpaid" | "paid" | "failed" | "refunded";
	payment_reference: string | null;
	paid_at: string | null;
	stock_reserved: boolean;
	created_at: string;
	updated_at: string;
};

export const ORDER_SORTS = {
	"": { column: "created_at", ascending: false },
	oldest: { column: "created_at", ascending: true },
	"total-desc": { column: "subtotal", ascending: false },
	"total-asc": { column: "subtotal", ascending: true },
	number: { column: "order_number", ascending: false },
} as const;

export async function adminListOrders(opts: { q?: string; status?: string; payment?: string; method?: string; sort?: string; page?: number; perPage?: number }) {
	const { q, status, payment, method, sort = "", page = 1, perPage = 20 } = opts;
	let query = createAdminClient().from("orders").select("*", { count: "exact" });
	if (["pending", "processing", "completed", "cancelled"].includes(status ?? "")) query = query.eq("status", status);
	if (["unpaid", "paid", "failed", "refunded"].includes(payment ?? "")) query = query.eq("payment_status", payment);
	if (["manual", "stripe", "paypal"].includes(method ?? "")) query = query.eq("payment_method", method);
	const t = term(q);
	if (t) {
		const asNumber = Number(t.replace(/^#/, ""));
		query = query.or([`customer_name.ilike.%${t}%`, `email.ilike.%${t}%`, ...(Number.isInteger(asNumber) && asNumber > 0 ? [`order_number.eq.${asNumber}`] : [])].join(","));
	}
	const from = (page - 1) * perPage;
	const order = ORDER_SORTS[sort as keyof typeof ORDER_SORTS] ?? ORDER_SORTS[""];
	const { data, count, error } = await query.order(order.column, { ascending: order.ascending }).range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load orders: ${error.message}`);
	return { rows: (data ?? []) as Order[], total: count ?? 0 };
}

export async function adminGetOrder(id: string): Promise<Order | null> {
	const { data } = await createAdminClient().from("orders").select("*").eq("id", id).maybeSingle();
	return data as Order | null;
}

export async function adminShopCounts() {
	const db = createAdminClient();
	const [products, pending] = await Promise.all([
		db.from("products").select("id", { count: "exact", head: true }),
		db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
	]);
	return { products: products.count ?? 0, pendingOrders: pending.count ?? 0 };
}
