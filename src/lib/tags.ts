import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchTerm } from "@/lib/content";

/**
 * Shared tags for blogs, events, promotions, services and portfolios (public.tags).
 * Content rows keep their own `tags text[]`; a database trigger maps every saved tag to the shared
 * spelling and adds new names to this list (supabase/migrations/20261114000000_shared_tags.sql).
 * Product tags are separate (src/lib/shop-admin.ts).
 */

export type TagUsage = {
	id: string;
	name: string;
	created_at: string;
	updated_at: string;
	blogs: number;
	events: number;
	promotions: number;
	services: number;
	portfolios: number;
	total: number;
};

export const TAG_USAGE_TYPES = [
	{ key: "blogs", label: "Blogs", singular: "post", plural: "posts", adminPath: "/admin/blogs" },
	{ key: "events", label: "Events", singular: "event", plural: "events", adminPath: "/admin/events" },
	{ key: "promotions", label: "Promotions", singular: "promotion", plural: "promotions", adminPath: "/admin/promotions" },
	{ key: "services", label: "Services", singular: "service", plural: "services", adminPath: "/admin/services" },
	{ key: "portfolios", label: "Portfolio", singular: "project", plural: "projects", adminPath: "/admin/portfolio" },
] as const;
export type TagUsageType = (typeof TAG_USAGE_TYPES)[number]["key"];

const SORTS = {
	"": { column: "name", ascending: true },
	"name-desc": { column: "name", ascending: false },
	used: { column: "total", ascending: false },
	newest: { column: "created_at", ascending: false },
} as const;

/** Admin → Tags: search, "used in" filter, sort and pagination, all from the URL. */
export async function adminListSharedTags(opts: { q?: string; used?: string; sort?: string; page?: number; perPage?: number }) {
	const { q, used = "", sort = "", page = 1, perPage = 30 } = opts;
	let query = createAdminClient().from("tag_usage").select("*", { count: "exact" });
	const term = q ? searchTerm(q) : "";
	if (term) query = query.ilike("name", `%${term}%`);
	if (used === "unused") query = query.eq("total", 0);
	else if (used === "used") query = query.gt("total", 0);
	else if (TAG_USAGE_TYPES.some((t) => t.key === used)) query = query.gt(used, 0);
	const order = SORTS[sort as keyof typeof SORTS] ?? SORTS[""];
	query = query.order(order.column, { ascending: order.ascending });
	if (order.column !== "name") query = query.order("name", { ascending: true });
	const from = (page - 1) * perPage;
	const { data, count, error } = await query.range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load tags: ${error.message}`);
	return { rows: (data ?? []) as TagUsage[], total: count ?? 0 };
}

export async function adminGetSharedTag(id: string): Promise<TagUsage | null> {
	if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
	const { data } = await createAdminClient().from("tag_usage").select("*").eq("id", id).maybeSingle();
	return data as TagUsage | null;
}

/** Every shared tag name, A–Z: suggestions in content forms and tag filters in admin lists. */
export async function allTagNames(): Promise<string[]> {
	const { data, error } = await createAdminClient().from("tags").select("name").order("name").limit(2000);
	if (error) return [];
	return (data ?? []).map((r) => r.name as string);
}

/** Admin list "Tag" filter, built from the shared list. */
export function tagFilter(names: string[]) {
	return { name: "tag", label: "Tag", options: [{ label: "All tags", value: "" }, ...names.map((n) => ({ label: n, value: n }))] };
}
