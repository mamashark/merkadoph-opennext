/** Price, stock and money helpers shared by server pages, the cart and checkout. */

export const CURRENCIES = ["SEK", "EUR", "USD", "PHP"] as const;
export type Currency = (typeof CURRENCIES)[number];

const LOCALES: Record<Currency, string> = { SEK: "sv-SE", EUR: "sv-SE", USD: "en-US", PHP: "en-PH" };

export function formatMoney(amount: number | null | undefined, currency: Currency = "SEK"): string {
	if (amount == null || Number.isNaN(Number(amount))) return "";
	return new Intl.NumberFormat(LOCALES[currency] ?? "sv-SE", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(amount));
}

export type Priceable = {
	regular_price: number | string | null;
	sale_price: number | string | null;
	sale_starts_at: string | null;
	sale_ends_at: string | null;
};

const num = (v: number | string | null | undefined) => (v == null || v === "" ? null : Number(v));

/** The price a customer pays right now, and whether a sale is active. */
export function priceInfo(p: Priceable, now = Date.now()) {
	const regular = num(p.regular_price);
	const sale = num(p.sale_price);
	const started = !p.sale_starts_at || new Date(p.sale_starts_at).getTime() <= now;
	const notEnded = !p.sale_ends_at || new Date(p.sale_ends_at).getTime() >= now;
	const onSale = sale != null && started && notEnded && (regular == null || sale < regular);
	const price = onSale ? sale : regular;
	const percentOff = onSale && regular ? Math.round(((regular - (sale as number)) / regular) * 100) : 0;
	return { price, regular, onSale, percentOff, saleEndsAt: onSale ? p.sale_ends_at : null };
}

export type StockStatus = "instock" | "outofstock" | "onbackorder";

export type Stockable = { manage_stock: boolean; stock_quantity: number | null; stock_status: StockStatus };

/** Effective availability: with stock management, quantity decides (backorder status is kept). */
export function availability(p: Stockable): StockStatus {
	if (p.manage_stock && p.stock_status !== "onbackorder") return (p.stock_quantity ?? 0) > 0 ? "instock" : "outofstock";
	return p.stock_status;
}

export const STOCK_LABELS: Record<StockStatus, string> = { instock: "In stock", outofstock: "Out of stock", onbackorder: "Available on backorder" };

/** schema.org availability URLs (also used by the product feed). */
export const SCHEMA_AVAILABILITY: Record<StockStatus, string> = {
	instock: "https://schema.org/InStock",
	outofstock: "https://schema.org/OutOfStock",
	onbackorder: "https://schema.org/BackOrder",
};

/** Google Merchant Center availability values. */
export const FEED_AVAILABILITY: Record<StockStatus, string> = { instock: "in_stock", outofstock: "out_of_stock", onbackorder: "backorder" };

/** Maximum a customer can add to the cart (null = no limit). */
export function maxPurchasable(p: Stockable): number | null {
	if (availability(p) === "outofstock") return 0;
	if (p.manage_stock && p.stock_status !== "onbackorder") return Math.max(0, p.stock_quantity ?? 0);
	return null;
}
