import "server-only";
import { cached } from "@/lib/cache";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import { toPlainText } from "@/lib/content";
import { availability, FEED_AVAILABILITY, priceInfo } from "@/lib/pricing";
import { getAllLiveProducts, getShopSettings, type Product, type ShopSettings } from "@/lib/shop";

/** Public URL path of the feed. */
export const PRODUCT_FEED_PATH = "/product-feed.xml";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const money = (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`;

function item(p: Product, s: ShopSettings): string {
	const { price, regular, onSale } = priceInfo(p);
	const fields: Array<[string, string | number | null | undefined]> = [
		["g:id", p.sku || p.id],
		["g:title", p.title],
		["g:description", (toPlainText(p.content) || p.excerpt || p.title).slice(0, 5000)],
		["g:link", `${SITE_URL}/product/${p.slug}`],
		["g:image_link", p.cover_image_url],
		...(p.gallery ?? []).slice(0, 10).map((g): [string, string] => ["g:additional_image_link", g.url]),
		["g:availability", FEED_AVAILABILITY[availability(p)]],
		["g:price", regular != null ? money(regular, s.currency) : price != null ? money(price, s.currency) : null],
		["g:sale_price", onSale && price != null ? money(price, s.currency) : null],
		[
			"g:sale_price_effective_date",
			onSale && p.sale_starts_at && p.sale_ends_at ? `${new Date(p.sale_starts_at).toISOString()}/${new Date(p.sale_ends_at).toISOString()}` : null,
		],
		["g:brand", p.brand || s.brand],
		["g:gtin", p.gtin],
		["g:mpn", p.mpn],
		["g:identifier_exists", p.gtin || p.mpn ? null : "no"],
		["g:condition", p.condition],
		["g:product_type", p.categories.map((c) => c.name).join(" > ") || null],
		["g:google_product_category", s.google_product_category || null],
		["g:shipping_weight", p.weight_kg != null ? `${p.weight_kg} kg` : null],
	];
	const body = fields
		.filter(([, v]) => v != null && v !== "")
		.map(([k, v]) => `      <${k}>${esc(String(v))}</${k}>`)
		.join("\n");
	return `    <item>\n${body}\n    </item>`;
}

/** Google Merchant Center RSS 2.0 feed (also accepted by Meta Commerce and most marketplaces). */
export function buildFeed(products: Product[], settings: ShopSettings): string {
	const priced = products.filter((p) => priceInfo(p).price != null);
	return [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
		`  <channel>`,
		`    <title>${esc(`${SITE_NAME} — ${settings.title || "Shop"}`)}</title>`,
		`    <link>${esc(`${SITE_URL}/shop`)}</link>`,
		`    <description>${esc(settings.description || `Products from ${SITE_NAME}`)}</description>`,
		`    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
		...priced.map((p) => item(p, settings)),
		`  </channel>`,
		`</rss>`,
	].join("\n");
}

/** Cached feed body + item count. Purged by product/settings saves and by Admin → Shop → Regenerate feed. */
export const getProductFeed = cached(async () => {
	const [products, settings] = await Promise.all([getAllLiveProducts(), getShopSettings()]);
	const xml = buildFeed(products, settings);
	return { xml, count: products.filter((p) => priceInfo(p).price != null).length, generatedAt: new Date().toISOString() };
}, "product-feed:xml", ["products", "shop", "product-feed"]);
