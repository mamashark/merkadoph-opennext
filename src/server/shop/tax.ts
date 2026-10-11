import "server-only";
import { cached } from "@/lib/cache";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * VAT (moms) — shop-reference.md §6, A6. Prices are entered INCLUDING VAT (Swedish B2C), so VAT
 * is the included part: gross × rate / (100 + rate). Shipping VAT follows the goods: it is split
 * across the rates in the same proportion as the goods (Skatteverket's rule for mixed rates).
 * While the business isn't VAT-registered (`enabled: false`) nothing is calculated or shown.
 */

export type TaxClass = { id: string; name: string; rate: number; sort_order: number };
export type TaxSettings = { enabled: boolean; default_class: string };
export const DEFAULT_TAX_SETTINGS: TaxSettings = { enabled: false, default_class: "standard" };

export const getTaxSettings = cached(
	async (): Promise<TaxSettings> => {
		const { data } = await createPublicClient().from("site_settings").select("value").eq("key", "tax").maybeSingle();
		return { ...DEFAULT_TAX_SETTINGS, ...((data?.value as Partial<TaxSettings>) ?? {}) };
	},
	"shop:getTaxSettings",
	["shop"],
);

export const getTaxClasses = cached(
	async (): Promise<TaxClass[]> => {
		const { data, error } = await createPublicClient().from("tax_classes").select("id,name,rate,sort_order").order("sort_order").order("name");
		if (error) throw new Error(`Failed to load tax classes: ${error.message}`);
		return (data ?? []).map((c) => ({ ...c, rate: Number(c.rate) })) as TaxClass[];
	},
	"shop:getTaxClasses",
	["shop"],
);

export type TaxLineInput = { gross: number; taxClass: string | null };
export type TaxBreakdown = {
	enabled: boolean;
	/** Per rate, rounded to öre once per rate (as receipts show it). */
	rates: Array<{ rate: number; gross: number; net: number; tax: number }>;
	/** Total VAT included in goods + shipping. */
	total: number;
	/** VAT per input line (same order), for storing on order lines. */
	lines: Array<{ rate: number; tax: number }>;
	shipping: { tax: number };
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const included = (gross: number, rate: number) => (rate > 0 ? (gross * rate) / (100 + rate) : 0);

/** Pure calculation: give it the settings and classes, the goods lines and the shipping price. */
export function computeTax(settings: TaxSettings, classes: TaxClass[], lines: TaxLineInput[], shippingGross: number): TaxBreakdown {
	if (!settings.enabled) return { enabled: false, rates: [], total: 0, lines: lines.map(() => ({ rate: 0, tax: 0 })), shipping: { tax: 0 } };

	const rateOf = (id: string | null) => {
		const found = classes.find((c) => c.id === (id ?? settings.default_class)) ?? classes.find((c) => c.id === settings.default_class);
		return found?.rate ?? 25;
	};
	const lineRates = lines.map((l) => rateOf(l.taxClass));

	// Goods gross per rate.
	const goods = new Map<number, number>();
	lines.forEach((l, i) => goods.set(lineRates[i], (goods.get(lineRates[i]) ?? 0) + l.gross));
	const goodsTotal = [...goods.values()].reduce((s, v) => s + v, 0);

	// Shipping split in proportion to goods per rate (or the default rate when there are no goods).
	const shippingByRate = new Map<number, number>();
	if (shippingGross > 0) {
		if (goodsTotal > 0) goods.forEach((g, rate) => shippingByRate.set(rate, (shippingGross * g) / goodsTotal));
		else shippingByRate.set(rateOf(null), shippingGross);
	}

	const allRates = [...new Set([...goods.keys(), ...shippingByRate.keys()])].sort((a, b) => b - a);
	const rates = allRates.map((rate) => {
		const gross = r2((goods.get(rate) ?? 0) + (shippingByRate.get(rate) ?? 0));
		const tax = r2(included(gross, rate));
		return { rate, gross, net: r2(gross - tax), tax };
	});
	const shippingTax = r2([...shippingByRate].reduce((s, [rate, g]) => s + included(g, rate), 0));

	return {
		enabled: true,
		rates,
		total: r2(rates.reduce((s, r) => s + r.tax, 0)),
		lines: lines.map((l, i) => ({ rate: lineRates[i], tax: r2(included(l.gross, lineRates[i])) })),
		shipping: { tax: shippingTax },
	};
}

/** Loads settings + classes and computes. */
export async function taxFor(lines: TaxLineInput[], shippingGross: number): Promise<TaxBreakdown> {
	const [settings, classes] = await Promise.all([getTaxSettings(), getTaxClasses()]);
	return computeTax(settings, classes, lines, shippingGross);
}
