import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchTerm } from "@/lib/content";
import { DEFAULT_TAX_SETTINGS, type TaxClass, type TaxSettings } from "@/server/shop/tax";

// Admin reads (uncached, service role). Callers must have passed requireAdmin().

export async function adminTaxSettings(): Promise<TaxSettings> {
	const { data } = await createAdminClient().from("site_settings").select("value").eq("key", "tax").maybeSingle();
	return { ...DEFAULT_TAX_SETTINGS, ...((data?.value as Partial<TaxSettings>) ?? {}) };
}

export type AdminTaxClass = TaxClass & { products: number };

export async function adminTaxClasses({ q, sort = "", page = 1, perPage = 20 }: { q?: string; sort?: string; page?: number; perPage?: number } = {}) {
	const db = createAdminClient();
	let query = db.from("tax_classes").select("id,name,rate,sort_order", { count: "exact" });
	const term = q ? searchTerm(q) : "";
	if (term) query = query.or(`name.ilike.%${term}%,id.ilike.%${term}%`);
	const orders: Record<string, [string, boolean]> = { "": ["sort_order", true], name: ["name", true], "rate-desc": ["rate", false], rate: ["rate", true] };
	const [column, ascending] = orders[sort] ?? orders[""];
	const from = (page - 1) * perPage;
	const { data, count, error } = await query.order(column, { ascending }).range(from, from + perPage - 1);
	if (error) throw new Error(error.message);

	const settings = await adminTaxSettings();
	const rows = await Promise.all(
		(data ?? []).map(async (c) => {
			// Products without a class use the default class.
			let usage = db.from("products").select("id", { count: "exact", head: true });
			usage = c.id === settings.default_class ? usage.or(`tax_class.eq.${c.id},tax_class.is.null`) : usage.eq("tax_class", c.id);
			const { count: products } = await usage;
			return { ...c, rate: Number(c.rate), products: products ?? 0 } as AdminTaxClass;
		}),
	);
	return { rows, total: count ?? 0 };
}

/** Props for the product form's VAT class picker. */
export async function productTaxProps() {
	const [settings, { data }] = await Promise.all([adminTaxSettings(), createAdminClient().from("tax_classes").select("id,name,rate,sort_order").order("sort_order")]);
	return { enabled: settings.enabled, defaultClass: settings.default_class, classes: (data ?? []).map((c) => ({ ...c, rate: Number(c.rate) })) as TaxClass[] };
}
