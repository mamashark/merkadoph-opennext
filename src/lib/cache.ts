import "server-only";
import { revalidatePath, unstable_cache, updateTag } from "next/cache";

/**
 * Caching model
 * - Public data reads are cached with `cached()` and tagged by content type.
 * - Public detail pages and the homepage are cached as ISR pages (`revalidate = CACHE_TTL`).
 * - Listing pages read search params (tabs, pagination) so they render per request, but their data is cached.
 * Entries refresh on their own after CACHE_TTL; saving content or using Admin → Cache purges immediately.
 */
export const CACHE_TTL = 300;

export const CONTENT_TAGS = ["blogs", "events", "promotions", "services"] as const;
export type ContentTag = (typeof CONTENT_TAGS)[number];

/** Shop data: "products" (products, categories, tags), "shop" (settings, incl. the on/off switch) and "product-feed" (the XML feed). */
export const SHOP_TAGS = ["products", "shop", "product-feed"] as const;
export type ShopTag = (typeof SHOP_TAGS)[number];
export type CacheTag = ContentTag | ShopTag;

type PathTarget = { path: string; type?: "page" | "layout" };

export type CacheGroupId = "home" | "listings" | ContentTag | "shop" | "sitemap";

export const CACHE_GROUPS: Record<CacheGroupId, { label: string; description: string; tags: string[]; paths: PathTarget[] }> = {
	home: { label: "Homepage", description: "The / page.", tags: [], paths: [{ path: "/" }] },
	listings: {
		label: "Listing pages",
		description: "/blogs, /events, /promotions and /services (all tabs and pages).",
		tags: [],
		paths: [{ path: "/blogs" }, { path: "/events" }, { path: "/promotions" }, { path: "/services" }],
	},
	blogs: { label: "Blogs", description: "Blog data, the blog list and every post page.", tags: ["blogs"], paths: [{ path: "/blogs" }, { path: "/blogs/[slug]", type: "page" }] },
	events: { label: "Events", description: "Event data, the events list and every event page.", tags: ["events"], paths: [{ path: "/events" }, { path: "/events/[slug]", type: "page" }] },
	promotions: {
		label: "Promotions",
		description: "Promotion data, the promotions list and every promotion page.",
		tags: ["promotions"],
		paths: [{ path: "/promotions" }, { path: "/promotions/[slug]", type: "page" }],
	},
	services: {
		label: "Services",
		description: "Service data, the services list and every service page.",
		tags: ["services"],
		paths: [{ path: "/services" }, { path: "/services/[slug]", type: "page" }],
	},
	shop: {
		label: "Shop",
		description: "Products, categories, shop settings, /shop, every category and product page, cart, checkout and /product-feed.xml.",
		tags: ["products", "shop", "product-feed"],
		paths: [{ path: "/shop", type: "layout" }, { path: "/product/[slug]", type: "page" }, { path: "/cart" }, { path: "/checkout" }, { path: "/product-feed.xml" }],
	},
	sitemap: { label: "Sitemap", description: "/sitemap.xml.", tags: [], paths: [{ path: "/sitemap.xml" }] },
};

export const CACHE_GROUP_IDS = Object.keys(CACHE_GROUPS) as CacheGroupId[];

/** Wraps a public data loader in Next's data cache, tagged so it can be purged. */
export function cached<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string, tags: CacheTag[]) {
	return unstable_cache(fn, [key], { revalidate: CACHE_TTL, tags: [...tags] });
}

/**
 * Purges cache groups. Uses `updateTag`, so it must run inside a Server Action; the next
 * visitor gets fresh content instead of a stale copy.
 */
export function purgeGroups(ids: CacheGroupId[]) {
	const tags = new Set<string>();
	const paths = new Map<string, PathTarget>();
	for (const id of ids) {
		CACHE_GROUPS[id].tags.forEach((t) => tags.add(t));
		CACHE_GROUPS[id].paths.forEach((p) => paths.set(`${p.path}|${p.type ?? ""}`, p));
	}
	tags.forEach((t) => updateTag(t));
	paths.forEach(({ path, type }) => (type ? revalidatePath(path, type) : revalidatePath(path)));
}

/** Everything: all data tags plus every cached page. */
export function purgeAll() {
	[...CONTENT_TAGS, ...SHOP_TAGS].forEach((t) => updateTag(t));
	revalidatePath("/", "layout");
}

/** After saving content: that type's data + pages, the homepage (it shows every type) and the sitemap. */
export function purgeContent(tag: ContentTag, slugs: Array<string | null | undefined> = []) {
	purgeGroups([tag, "home", "sitemap"]);
	for (const slug of new Set(slugs)) if (slug) revalidatePath(`/${tag}/${slug}`);
}

/** After saving shop data (products, categories, tags, settings): shop pages, feed, homepage and sitemap. */
export function purgeShop(productSlugs: Array<string | null | undefined> = []) {
	purgeGroups(["shop", "home", "sitemap"]);
	for (const slug of new Set(productSlugs)) if (slug) revalidatePath(`/product/${slug}`);
}
