import "server-only";
import { isPastEnd } from "@/lib/content";
import { revalidatePath, unstable_cache, updateTag } from "next/cache";

/**
 * Caching model
 * - Public data reads are cached with `cached()` and tagged by content type.
 * - Public detail pages and the homepage are cached as ISR pages (`revalidate = CACHE_TTL`).
 * - Listing pages read search params (tabs, pagination) so they render per request, but their data is cached.
 * Entries refresh on their own after CACHE_TTL (a day); saving content or using Admin → Cache purges immediately.
 */
/** Once a day (Kay, 2026-11-20: fewer cache writes on the free Cloudflare plan). Saves purge at once, and the
 *  15-minute cron catches scheduled posts, offers and events (src/lib/scheduled-refresh.ts). Page files repeat this
 *  number as a literal (`export const revalidate = 86400`): Next needs it written out. */
export const CACHE_TTL = 86400;

export const CONTENT_TAGS = ["blogs", "events", "promotions", "services", "portfolio", "bulletin"] as const;
export type ContentTag = (typeof CONTENT_TAGS)[number];

/** Shop data: "products" (products, categories, tags), "shop" (settings, incl. the on/off switch) and "product-feed" (the XML feed). */
export const SHOP_TAGS = ["products", "shop", "product-feed"] as const;
export type ShopTag = (typeof SHOP_TAGS)[number];
/** Site-wide settings: "seo" (business info, defaults, verification) and "legal" (privacy/terms/cookies). */
export const SITE_TAGS = ["seo", "legal"] as const;
export type SiteTag = (typeof SITE_TAGS)[number];
export type CacheTag = ContentTag | ShopTag | SiteTag;

type PathTarget = { path: string; type?: "page" | "layout" };

export type CacheGroupId = "home" | "listings" | ContentTag | "press" | "shop" | "site" | "sitemap";

export const CACHE_GROUPS: Record<CacheGroupId, { label: string; description: string; tags: string[]; paths: PathTarget[] }> = {
	home: { label: "Homepage", description: "The / page.", tags: [], paths: [{ path: "/" }] },
	listings: {
		label: "Listing pages",
		description: "/blogs, /events, /promotions, /services, /impact, /bygg, /digital, /bulletin, /press, /tahooo and /search (all tabs and pages).",
		tags: [],
		paths: [{ path: "/blogs" }, { path: "/events" }, { path: "/promotions" }, { path: "/services" }, { path: "/impact" }, { path: "/bygg" }, { path: "/digital" }, { path: "/bulletin" }, { path: "/press" }, { path: "/tahooo" }, { path: "/search" }],
	},
	blogs: {
		label: "Blogs",
		description: "Blog data, the blog list, every post page, the RSS feed and Community Impact pages linked to a post.",
		tags: ["blogs"],
		paths: [{ path: "/blogs" }, { path: "/blogs/[slug]", type: "page" }, { path: "/blogs/rss.xml" }],
	},
	events: { label: "Events", description: "Event data, the events list and every event page.", tags: ["events"], paths: [{ path: "/events" }, { path: "/events/[slug]", type: "page" }] },
	promotions: {
		label: "Promotions",
		description: "Promotion data, the promotions list, every promotion page and the Bulletin Board (offers).",
		tags: ["promotions"],
		paths: [{ path: "/promotions" }, { path: "/promotions/[slug]", type: "page" }, { path: "/bulletin" }],
	},
	services: {
		label: "Services",
		description: "Service data, the services list, every service page and the Merkado PH Digital page.",
		tags: ["services"],
		paths: [{ path: "/services" }, { path: "/services/[slug]", type: "page" }, { path: "/digital" }],
	},
	portfolio: {
		label: "Community Impact",
		description: "Project data, the /impact list, every project page, the homepage and blog posts that show a linked entry.",
		tags: ["portfolio"],
		paths: [{ path: "/impact" }, { path: "/impact/[slug]", type: "page" }, { path: "/" }],
	},
	bulletin: {
		label: "Bulletin Board",
		description: "Notices, embassy updates, opportunities and press items: /bulletin, every notice page, its categories and publishers.",
		tags: ["bulletin"],
		paths: [{ path: "/bulletin" }, { path: "/bulletin/[slug]", type: "page" }],
	},
	press: {
		label: "Press & Media",
		description: "Media coverage and press releases: /press and every press item page.",
		tags: ["bulletin"],
		paths: [{ path: "/press" }, { path: "/press/[slug]", type: "page" }],
	},
	shop: {
		label: "Shop",
		description: "Products, categories, shop settings, /shop, every category and product page, cart, checkout and /product-feed.xml.",
		tags: ["products", "shop", "product-feed"],
		paths: [{ path: "/shop", type: "layout" }, { path: "/product/[slug]", type: "page" }, { path: "/cart" }, { path: "/checkout" }, { path: "/product-feed.xml" }],
	},
	site: {
		label: "Site settings & legal",
		description: "SEO settings (business info, footer, structured data), /privacy, /terms, /cookies, /case-study and /blogs/rss.xml. Refreshes every public page.",
		tags: ["seo", "legal"],
		paths: [{ path: "/", type: "layout" }],
	},
	sitemap: { label: "Sitemap", description: "/sitemap.xml.", tags: [], paths: [{ path: "/sitemap.xml" }] },
};

export const CACHE_GROUP_IDS = Object.keys(CACHE_GROUPS) as CacheGroupId[];

/** Wraps a public data loader in Next's data cache, tagged so it can be purged. */
export function cached<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string, tags: CacheTag[]) {
	return unstable_cache(fn, [key], { revalidate: CACHE_TTL, tags: [...tags] });
}

/**
 * `cached()` for paged lists. A page past the end throws PastEndError inside (so nothing is stored) and is answered
 * with `empty` here, outside the cache; the page then shows its 404 (B32). Any other error still throws.
 */
export function cachedPaged<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string, tags: CacheTag[], empty: R) {
	const inner = cached(fn, key, tags);
	return async (...args: A): Promise<R> => {
		try {
			return await inner(...args);
		} catch (e) {
			if (isPastEnd(e)) return empty;
			throw e;
		}
	};
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
	[...CONTENT_TAGS, ...SHOP_TAGS, ...SITE_TAGS].forEach((t) => updateTag(t));
	revalidatePath("/", "layout");
}

/** After saving content: that type's data + pages, the homepage (it shows every type) and the sitemap. */
export function purgeContent(tag: ContentTag, slugs: Array<string | null | undefined> = []) {
	// Bulletin items share one data tag but two sections: press pages are purged with them.
	purgeGroups([tag, "home", "sitemap", ...(tag === "bulletin" ? (["press"] as const) : [])]);
	// Projects (cache tag "portfolio") are public at /impact.
	const base = tag === "portfolio" ? "impact" : tag;
	for (const slug of new Set(slugs)) if (slug) revalidatePath(`/${base}/${slug}`);
}

/** After saving shop data (products, categories, tags, settings): shop pages, feed, homepage and sitemap. */
export function purgeShop(productSlugs: Array<string | null | undefined> = []) {
	purgeGroups(["shop", "home", "sitemap"]);
	for (const slug of new Set(productSlugs)) if (slug) revalidatePath(`/product/${slug}`);
}
