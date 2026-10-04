import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShopSettings } from "@/lib/shop";
import { pageParam, param } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { Catalog } from "@/components/shop/catalog";
import { PageIntro } from "@/components/site/content-card";

// Renders per request (filters live in the URL); product data comes from the cache.

const fallbackDescription = "Shop Merkado PH online — order in a few clicks and we'll confirm payment and delivery by email.";

export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
	const [settings, params] = await Promise.all([getShopSettings(), searchParams]);
	const page = pageParam(params);
	const filtered = !!(param(params, "q") || param(params, "tag") || param(params, "sort"));
	return {
		...pageMetadata({
			title: `${settings.title || "Shop"}${page > 1 ? ` — Page ${page}` : ""}`,
			description: settings.description || fallbackDescription,
			path: page > 1 ? `/shop?page=${page}` : "/shop",
		}),
		// Search/filter/sort variations shouldn't compete with the main listing in search results.
		...(filtered ? { robots: { index: false, follow: true } } : {}),
	};
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
	const [settings, params] = await Promise.all([getShopSettings(), searchParams]);
	const values = { q: param(params, "q").trim().slice(0, 100), tag: param(params, "tag"), sort: param(params, "sort"), page: pageParam(params) };
	if (values.page > 50) notFound();

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<PageIntro eyebrow="Shop" title={settings.title || "Shop"} description={settings.description || fallbackDescription} />
			<Catalog values={values} />
		</main>
	);
}
