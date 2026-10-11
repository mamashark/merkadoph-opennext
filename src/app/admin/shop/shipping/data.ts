import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchTerm } from "@/lib/content";
import { normalise, type ShippingMethod } from "@/server/shop/shipping";

// Admin reads (uncached, service role, includes disabled methods). Callers must have passed requireAdmin().

export async function adminListShippingMethods({ q, type, status, sort = "", page = 1, perPage = 20 }: { q?: string; type?: string; status?: string; sort?: string; page?: number; perPage?: number }) {
	let query = createAdminClient().from("shipping_methods").select("*", { count: "exact" });
	if (["flat_rate", "weight_based", "local_delivery", "pickup"].includes(type ?? "")) query = query.eq("type", type!);
	if (status === "enabled") query = query.eq("enabled", true);
	if (status === "disabled") query = query.eq("enabled", false);
	const term = q ? searchTerm(q) : "";
	if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
	const orders: Record<string, [string, boolean]> = { "": ["sort_order", true], title: ["title", true], price: ["price", true], "price-desc": ["price", false], newest: ["created_at", false] };
	const [column, ascending] = orders[sort] ?? orders[""];
	const from = (page - 1) * perPage;
	const { data, count, error } = await query.order(column, { ascending }).order("title").range(from, from + perPage - 1);
	if (error) throw new Error(error.message);
	return { rows: (data ?? []).map(normalise), total: count ?? 0 };
}

export async function adminGetShippingMethod(id: string): Promise<ShippingMethod | null> {
	if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
	const { data } = await createAdminClient().from("shipping_methods").select("*").eq("id", id).maybeSingle();
	return data ? normalise(data) : null;
}
