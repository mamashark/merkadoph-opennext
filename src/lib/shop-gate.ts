/**
 * The old shop (local/guidelines.md section 8) stays in the code but is closed. While SHOP_CODE_ENABLED is false,
 * its pages and API routes answer 404 (src/proxy.ts) and its server actions refuse to run (assertShopOpen),
 * whatever Admin → Shop says. Closed 2026-11-20 (Kay) to remove unused ways in. Reopening it is a code change.
 * Old Shopify URLs (/products/…, /collections/…) are redirects and are handled before this check.
 */
export const SHOP_CODE_ENABLED = false;

/** Shop pages (closed by src/proxy.ts). The checkout and Stripe endpoints and the product feed check SHOP_CODE_ENABLED themselves. */
export const SHOP_PATH = /^\/(shop|product|cart|checkout|wishlist|account)(\/|$)/;

/** First line of every shop server action: they can be called directly, so the closed shop refuses them too. */
export function assertShopOpen(): void {
	if (!SHOP_CODE_ENABLED) throw new Error("The shop is closed.");
}
