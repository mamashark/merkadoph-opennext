import Link from "next/link";
import { Search, X } from "lucide-react";
import { categoryTrail, getCategories, getShopProducts, getShopSettings, getTags, SHOP_PER_PAGE, SHOP_SORTS, type Category } from "@/lib/shop";
import { absoluteUrl, breadcrumbs } from "@/lib/seo";
import { SITE_NAME } from "@/lib/env";
import { ProductCard } from "./product-card";
import { JsonLd } from "@/components/site/json-ld";
import { Pagination } from "@/components/admin/pagination";
import { cn } from "@/lib/ui";

type Values = { q: string; tag: string; sort: string; page: number };

/**
 * Server-rendered product listing for /shop and /shop/[category]. Filters live in the URL
 * (?q, ?tag, ?sort, ?page) so every view is linkable; the form works without JavaScript.
 */
export async function Catalog({ category, values }: { category?: Category; values: Values }) {
	const [settings, categories, tags, { products, total }] = await Promise.all([
		getShopSettings(),
		getCategories(),
		getTags(),
		getShopProducts({ category: category?.slug, tag: values.tag || undefined, q: values.q || undefined, sort: values.sort, page: values.page }),
	]);
	const basePath = category ? `/shop/${category.slug}` : "/shop";
	const keep = Object.fromEntries(Object.entries({ q: values.q, tag: values.tag, sort: values.sort }).filter(([, v]) => v));
	const activeTag = tags.find((t) => t.slug === values.tag);
	const trail = category ? categoryTrail(category, categories) : [];
	const children = category ? categories.filter((c) => c.parent_id === category.id && (c.product_count ?? 0) > 0) : [];
	const topLevel = categories.filter((c) => !c.parent_id && (c.product_count ?? 0) > 0);

	return (
		<>
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "CollectionPage",
						name: category ? category.name : settings.title,
						description: category?.description || settings.description || undefined,
						url: absoluteUrl(basePath),
						isPartOf: { "@type": "WebSite", name: SITE_NAME },
						mainEntity: {
							"@type": "ItemList",
							numberOfItems: total,
							itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: (values.page - 1) * SHOP_PER_PAGE + i + 1, url: absoluteUrl(`/product/${p.slug}`), name: p.title })),
						},
					},
					breadcrumbs([{ name: settings.title || "Shop", path: "/shop" }, ...trail.map((c) => ({ name: c.name, path: `/shop/${c.slug}` }))]),
				]}
			/>

			<div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
				{/* Categories */}
				<nav aria-label="Product categories" className="lg:sticky lg:top-24 lg:self-start">
					<h2 className="text-xs font-semibold uppercase tracking-widest text-stone-600 dark:text-stone-400">Categories</h2>
					<ul className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible">
						<li>
							<Link href="/shop" aria-current={!category ? "page" : undefined} className={catLink(!category)}>
								All products
							</Link>
						</li>
						{topLevel.map((c) => (
							<li key={c.id}>
								<Link href={`/shop/${c.slug}`} aria-current={category?.id === c.id ? "page" : undefined} className={catLink(trail.some((t) => t.id === c.id))}>
									{c.name}
									<span className="ml-1 text-xs opacity-70">{c.product_count}</span>
								</Link>
							</li>
						))}
					</ul>
				</nav>

				<div className="min-w-0">
					{/* Search / sort (GET form → URL) */}
					<form role="search" action={basePath} className="mb-6 flex flex-col gap-3 sm:flex-row">
						{values.tag && <input type="hidden" name="tag" value={values.tag} />}
						<div className="relative flex-1">
							<label htmlFor="shop-q" className="sr-only">
								Search products
							</label>
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" aria-hidden />
							<input
								id="shop-q"
								type="search"
								name="q"
								defaultValue={values.q}
								placeholder={`Search ${category ? category.name.toLowerCase() : "products"}…`}
								className="h-11 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-500 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
							/>
						</div>
						<label htmlFor="shop-sort" className="sr-only">
							Sort by
						</label>
						<select
							id="shop-sort"
							name="sort"
							defaultValue={values.sort}
							className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:[color-scheme:dark]"
						>
							{Object.entries(SHOP_SORTS).map(([value, s]) => (
								<option key={value} value={value}>
									{s.label}
								</option>
							))}
						</select>
						<button type="submit" className="h-11 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200">
							Apply
						</button>
					</form>

					{(children.length > 0 || activeTag || values.q) && (
						<div className="mb-6 flex flex-wrap items-center gap-2">
							{children.map((c) => (
								<Link key={c.id} href={`/shop/${c.slug}`} className="rounded-full border border-stone-300 px-3 py-1 text-sm font-medium text-stone-800 hover:bg-white dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-900">
									{c.name}
								</Link>
							))}
							{activeTag && <Chip href={hrefWithout(basePath, keep, "tag")} label={`Tag: ${activeTag.name}`} />}
							{values.q && <Chip href={hrefWithout(basePath, keep, "q")} label={`“${values.q}”`} />}
						</div>
					)}

					<p className="mb-4 text-sm text-stone-600 dark:text-stone-400" aria-live="polite">
						{total} product{total === 1 ? "" : "s"}
					</p>

					{products.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-amber-900/20 bg-white/60 px-6 py-16 text-center dark:border-white/15 dark:bg-stone-900/60">
							<p className="text-lg font-medium text-stone-800 dark:text-stone-200">No products found.</p>
							<p className="mt-1 text-stone-600 dark:text-stone-400">Try another search or category.</p>
						</div>
					) : (
						<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
							{products.map((p, i) => (
								<li key={p.id}>
									<ProductCard product={p} currency={settings.currency} priority={i < 2} />
								</li>
							))}
						</ul>
					)}

					<div className="mt-10">
						<Pagination page={values.page} perPage={SHOP_PER_PAGE} total={total} basePath={basePath} params={keep} />
					</div>
				</div>
			</div>
		</>
	);
}

const catLink = (active: boolean) =>
	cn(
		"block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
		active ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900" : "text-stone-700 hover:bg-stone-900/5 dark:text-stone-300 dark:hover:bg-white/10",
	);

function hrefWithout(base: string, keep: Record<string, string>, drop: string) {
	const qs = new URLSearchParams(Object.entries(keep).filter(([k]) => k !== drop)).toString();
	return qs ? `${base}?${qs}` : base;
}

function Chip({ href, label }: { href: string; label: string }) {
	return (
		<Link href={href} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-900 ring-1 ring-teal-200 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-100 dark:ring-teal-900">
			{label} <X className="h-3.5 w-3.5" aria-label="Remove filter" />
		</Link>
	);
}
