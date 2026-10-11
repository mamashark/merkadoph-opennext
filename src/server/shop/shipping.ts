import "server-only";
import { cached } from "@/lib/cache";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Shipping (shop-reference.md §5, A6). Sweden only for now (D14). Four method types:
 *   flat_rate      one price per order
 *   weight_based   price by total weight bands (needs a weight on every product in the cart)
 *   local_delivery own delivery to listed postcode prefixes
 *   pickup         free collection at an address
 * `free_over` makes flat/weight/local free once the goods total (incl. VAT) reaches it.
 */

export type ShippingType = "flat_rate" | "weight_based" | "local_delivery" | "pickup";
export const SHIPPING_TYPES: Record<ShippingType, string> = {
	flat_rate: "Flat rate",
	weight_based: "By weight",
	local_delivery: "Local delivery",
	pickup: "Pickup",
};
export type WeightBand = { max_kg: number; price: number };
export type ShippingMethod = {
	id: string;
	type: ShippingType;
	title: string;
	description: string | null;
	price: number;
	free_over: number | null;
	weight_bands: WeightBand[];
	postcodes: string[];
	pickup_address: string | null;
	enabled: boolean;
	sort_order: number;
};

export type ShippingOption = {
	id: string;
	type: ShippingType;
	title: string;
	description: string | null;
	price: number;
	/** True when free because the order is over `free_over`. */
	free: boolean;
	pickupAddress: string | null;
	/** Shown before an address is known; checked again at checkout. */
	needsPostcode: boolean;
};

/** Enabled methods (public, RLS). Cached with the shop data. */
export const getShippingMethods = cached(
	async (): Promise<ShippingMethod[]> => {
		const { data, error } = await createPublicClient()
			.from("shipping_methods")
			.select("id,type,title,description,price,free_over,weight_bands,postcodes,pickup_address,enabled,sort_order")
			.order("sort_order")
			.order("title");
		if (error) throw new Error(`Failed to load shipping methods: ${error.message}`);
		return (data ?? []).map(normalise);
	},
	"shop:getShippingMethods",
	["shop"],
);

export function normalise(m: Record<string, unknown>): ShippingMethod {
	return {
		...(m as ShippingMethod),
		price: Number(m.price ?? 0),
		free_over: m.free_over == null ? null : Number(m.free_over),
		weight_bands: ((m.weight_bands as WeightBand[]) ?? []).map((b) => ({ max_kg: Number(b.max_kg), price: Number(b.price) })).sort((a, b) => a.max_kg - b.max_kg),
		postcodes: (m.postcodes as string[]) ?? [],
	};
}

export type ShippingInput = {
	/** Goods total incl. VAT. */
	subtotal: number;
	/** Total weight in kg, or null if any product has no weight. */
	weightKg: number | null;
	/** Delivery postcode ("123 45"), or null before the address is known. */
	postcode: string | null;
};

const digits = (s: string) => s.replace(/\D/g, "");

/** Pure: which methods apply to this cart/address, and what they cost. */
export function shippingOptions(methods: ShippingMethod[], input: ShippingInput): ShippingOption[] {
	return methods.flatMap((m): ShippingOption[] => {
		if (!m.enabled) return [];
		let price = m.price;
		let needsPostcode = false;

		if (m.type === "pickup") price = 0;
		if (m.type === "weight_based") {
			if (input.weightKg == null || !m.weight_bands.length) return [];
			const band = m.weight_bands.find((b) => input.weightKg! <= b.max_kg);
			if (!band) return []; // heavier than the largest band
			price = band.price;
		}
		if (m.type === "local_delivery") {
			const prefixes = m.postcodes.map(digits).filter(Boolean);
			if (!prefixes.length) return [];
			if (input.postcode == null) needsPostcode = true;
			else if (!prefixes.some((p) => digits(input.postcode!).startsWith(p))) return [];
		}

		const free = m.type !== "pickup" && m.free_over != null && input.subtotal >= m.free_over;
		return [{ id: m.id, type: m.type, title: m.title, description: m.description, price: free ? 0 : Math.round(price * 100) / 100, free, pickupAddress: m.type === "pickup" ? m.pickup_address : null, needsPostcode }];
	});
}

export async function availableShipping(input: ShippingInput): Promise<ShippingOption[]> {
	return shippingOptions(await getShippingMethods(), input);
}
