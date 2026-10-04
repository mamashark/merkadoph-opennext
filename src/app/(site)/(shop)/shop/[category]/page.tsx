import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { categoryTrail, getCategories, getCategoryBySlug, getShopSettings } from "@/lib/shop";
import { pageParam, param } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { Catalog } from "@/components/shop/catalog";

export async function generateMetadata({ params, searchParams }: PageProps<"/shop/[category]">): Promise<Metadata> {
	const [{ category: slug }, query] = await Promise.all([params, searchParams]);
	const category = await getCategoryBySlug(slug);
	if (!category) return { title: "Category not found", robots: { index: false } };
	const page = pageParam(query);
	const filtered = !!(param(query, "q") || param(query, "tag") || param(query, "sort"));
	return {
		...pageMetadata({
			title: `${category.meta_title || category.name}${page > 1 ? ` — Page ${page}` : ""}`,
			description: category.meta_description || category.description || `Shop ${category.name} at Merkado PH.`,
			path: page > 1 ? `/shop/${category.slug}?page=${page}` : `/shop/${category.slug}`,
			image: category.image_url ? { url: category.image_url, alt: category.name } : null,
		}),
		...(filtered ? { robots: { index: false, follow: true } } : {}),
	};
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/shop/[category]">) {
	const [{ category: slug }, query] = await Promise.all([params, searchParams]);
	const [category, categories, settings] = await Promise.all([getCategoryBySlug(slug), getCategories(), getShopSettings()]);
	if (!category) notFound();
	const values = { q: param(query, "q").trim().slice(0, 100), tag: param(query, "tag"), sort: param(query, "sort"), page: pageParam(query) };
	const trail = categoryTrail(category, categories);

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<nav aria-label="Breadcrumb" className="mb-4">
				<ol className="flex flex-wrap items-center gap-1 text-sm text-stone-600 dark:text-stone-400">
					<li>
						<Link href="/shop" className="hover:text-stone-950 dark:hover:text-white">
							{settings.title || "Shop"}
						</Link>
					</li>
					{trail.map((c, i) => (
						<li key={c.id} className="flex items-center gap-1">
							<ChevronRight className="h-3.5 w-3.5" aria-hidden />
							{i === trail.length - 1 ? (
								<span aria-current="page" className="text-stone-900 dark:text-stone-100">
									{c.name}
								</span>
							) : (
								<Link href={`/shop/${c.slug}`} className="hover:text-stone-950 dark:hover:text-white">
									{c.name}
								</Link>
							)}
						</li>
					))}
				</ol>
			</nav>
			<header className="mb-10 max-w-2xl">
				<h1 className="text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">{category.name}</h1>
				{category.description && <p className="mt-3 text-lg text-stone-700 dark:text-stone-300">{category.description}</p>}
			</header>
			<Catalog category={category} values={values} />
		</main>
	);
}
