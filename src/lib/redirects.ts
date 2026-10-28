import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchTerm, type ContentTable } from "@/lib/content";

/** Public URL prefix per content table (for automatic slug-change redirects). Tags have no page. */
export const PUBLIC_BASE: Partial<Record<ContentTable, string>> = {
	blogs: "/blogs",
	events: "/events",
	promotions: "/promotions",
	services: "/services",
	portfolios: "/portfolio",
	products: "/product",
	product_categories: "/shop",
};

/**
 * Keeps old URLs working when a published slug changes (seo.md §7.1):
 * - adds a 301 from the old path to the new one,
 * - re-points any redirect that targeted the old path (no chains),
 * - removes a redirect that would now shadow the new path.
 */
export async function onSlugChange(table: ContentTable, oldSlug: string, newSlug: string) {
	const base = PUBLIC_BASE[table];
	if (!base || !oldSlug || oldSlug === newSlug) return;
	const from = `${base}/${oldSlug}`;
	const to = `${base}/${newSlug}`;
	const db = createAdminClient();
	await db.from("redirects").delete().eq("from_path", to);
	await db.from("redirects").update({ to_path: to }).eq("to_path", from);
	await db.from("redirects").upsert({ from_path: from, to_path: to, status: 301, source: "auto", note: `Slug changed (${table})` }, { onConflict: "from_path" });
}

export type RedirectRow = {
	id: string;
	from_path: string;
	to_path: string;
	status: 301 | 302 | 307 | 308;
	source: "manual" | "auto";
	note: string | null;
	hits: number;
	last_hit_at: string | null;
	created_at: string;
	updated_at: string;
};

/** Admin → SEO → Redirects. Service role; callers must have passed requireAdmin(). */
export async function listRedirects({ q, source, status, sort = "", page = 1, perPage = 25 }: { q?: string; source?: string; status?: string; sort?: string; page?: number; perPage?: number }) {
	let query = createAdminClient().from("redirects").select("*", { count: "exact" });
	if (source === "manual" || source === "auto") query = query.eq("source", source);
	if (["301", "302", "307", "308"].includes(status ?? "")) query = query.eq("status", Number(status));
	const term = q ? searchTerm(q) : "";
	if (term) query = query.or(`from_path.ilike.%${term}%,to_path.ilike.%${term}%,note.ilike.%${term}%`);
	const orders: Record<string, [string, boolean]> = { "": ["created_at", false], oldest: ["created_at", true], hits: ["hits", false], from: ["from_path", true], recent: ["last_hit_at", false] };
	const [column, ascending] = orders[sort] ?? orders[""];
	const from = (page - 1) * perPage;
	const { data, count, error } = await query.order(column, { ascending, nullsFirst: false }).range(from, from + perPage - 1);
	if (error) throw new Error(error.message);
	return { rows: (data ?? []) as RedirectRow[], total: count ?? 0 };
}

export async function getRedirect(id: string): Promise<RedirectRow | null> {
	if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
	const { data } = await createAdminClient().from("redirects").select("*").eq("id", id).maybeSingle();
	return data as RedirectRow | null;
}
