import type { MetadataRoute } from "next";
import { getAllPublishedSlugs } from "@/lib/blogs";
import { getEventSlugs } from "@/lib/events";
import { getPromotionSlugs } from "@/lib/promotions";
import { getServiceSlugs } from "@/lib/services";
import { SITE_URL } from "@/lib/env";
import { stageGateEnabled } from "@/lib/stage";
import { getAllLiveProducts, getCategories, getShopSettings, type Category, type Product } from "@/lib/shop";

export const revalidate = 3600;

type Entry = { slug: string; updated_at: string };

const safe = (p: Promise<Entry[]>) => p.catch(() => [] as Entry[]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// While the site is behind the staging gate only the "coming soon" homepage is public.
	if (stageGateEnabled()) return [{ url: SITE_URL, changeFrequency: "weekly", priority: 1 }];

	const [blogs, events, promotions, services] = await Promise.all([safe(getAllPublishedSlugs()), safe(getEventSlugs()), safe(getPromotionSlugs()), safe(getServiceSlugs())]);

	// Shop: only while the shop is switched on (Admin → Shop).
	const settings = await getShopSettings().catch(() => null);
	const [products, categories] = settings?.enabled
		? await Promise.all([getAllLiveProducts().catch(() => [] as Product[]), getCategories().catch(() => [] as Category[])])
		: [[] as Product[], [] as Category[]];
	const shop: MetadataRoute.Sitemap = settings?.enabled
		? [
				{ url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
				...categories
					.filter((c) => (c.product_count ?? 0) > 0)
					.map((c) => ({ url: `${SITE_URL}/shop/${c.slug}`, lastModified: c.updated_at, changeFrequency: "weekly" as const, priority: 0.7 })),
				...products.map((p) => ({
					url: `${SITE_URL}/product/${p.slug}`,
					lastModified: p.updated_at,
					changeFrequency: "weekly" as const,
					priority: 0.8,
					images: [p.cover_image_url, ...(p.gallery ?? []).map((g) => g.url)].filter((u): u is string => !!u).slice(0, 10),
				})),
			]
		: [];

	const section = (base: string, rows: Entry[], changeFrequency: "daily" | "weekly" | "monthly") =>
		rows.map((r) => ({ url: `${SITE_URL}${base}/${r.slug}`, lastModified: r.updated_at, changeFrequency, priority: 0.7 }));

	return [
		{ url: SITE_URL, changeFrequency: "weekly", priority: 1 },
		{ url: `${SITE_URL}/blogs`, changeFrequency: "daily", priority: 0.8 },
		{ url: `${SITE_URL}/events`, changeFrequency: "daily", priority: 0.8 },
		{ url: `${SITE_URL}/promotions`, changeFrequency: "daily", priority: 0.8 },
		{ url: `${SITE_URL}/services`, changeFrequency: "weekly", priority: 0.8 },
		...section("/blogs", blogs, "weekly"),
		...section("/events", events, "weekly"),
		...section("/promotions", promotions, "daily"),
		...section("/services", services, "monthly"),
		...shop,
	];
}
