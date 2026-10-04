import { getShopSettings } from "@/lib/shop";
import { getProductFeed } from "@/lib/product-feed";

/**
 * Public product feed (Google Merchant Center RSS 2.0): [site]/product-feed.xml
 * Served from the cache; rebuilt when products/settings change or via Admin → Shop → Regenerate feed.
 */
// Static route, refreshed every 5 minutes and on purge (the data underneath is cached and tagged too).
export const revalidate = 300;

export async function GET() {
	const settings = await getShopSettings();
	if (!settings.enabled) return new Response("Shop is disabled.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

	const { xml } = await getProductFeed();
	return new Response(xml, {
		headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex" },
	});
}
