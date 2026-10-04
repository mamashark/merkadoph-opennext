import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, PackageCheck, Ruler, Truck } from "lucide-react";
import { getProductBySlug, getRelatedProducts, getShopSettings } from "@/lib/shop";
import { summarize } from "@/lib/content";
import { availability, maxPurchasable, priceInfo, SCHEMA_AVAILABILITY, STOCK_LABELS } from "@/lib/pricing";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/datetime";
import { Markdown } from "@/components/blog/markdown";
import { JsonLd } from "@/components/site/json-ld";
import { AddToCart } from "@/components/shop/add-to-cart";
import { Price, ProductCard } from "@/components/shop/product-card";
import { cn } from "@/lib/ui";

// Cached as an ISR page; refreshed every 5 minutes or when the product/shop is saved or purged.
export const revalidate = 300;

/** No pages at build time; each one is rendered on its first visit and then served from the cache (ISR). */
export function generateStaticParams() {
	return [];
}

const describe = (p: { excerpt: string | null; content: string; meta_description: string | null }) => summarize(p);

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
	const product = await getProductBySlug((await params).slug);
	if (!product) return { title: "Product not found", robots: { index: false } };
	return pageMetadata({
		title: product.meta_title || product.title,
		description: describe(product),
		path: `/product/${product.slug}`,
		image: product.cover_image_url ? { url: product.cover_image_url, alt: product.cover_image_alt } : null,
		tags: product.tags.map((t) => t.name),
	});
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
	const [product, settings] = await Promise.all([getProductBySlug((await params).slug), getShopSettings()]);
	if (!product) notFound();

	const path = `/product/${product.slug}`;
	const { price, onSale, percentOff, saleEndsAt } = priceInfo(product);
	const stock = availability(product);
	const related = await getRelatedProducts(product.id, product.categories.map((c) => c.slug));
	const images = [...(product.cover_image_url ? [{ url: product.cover_image_url, alt: product.cover_image_alt || product.title }] : []), ...product.gallery.map((g) => ({ url: g.url, alt: g.alt || product.title }))];
	const dims = [product.length_cm, product.width_cm, product.height_cm].every((d) => d != null) ? `${product.length_cm} × ${product.width_cm} × ${product.height_cm} cm` : null;
	const primary = product.categories[0];

	return (
		<main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "Product",
						name: product.title,
						description: describe(product),
						url: absoluteUrl(path),
						image: images.map((i) => i.url),
						sku: product.sku ?? undefined,
						gtin: product.gtin ?? undefined,
						mpn: product.mpn ?? undefined,
						brand: { "@type": "Brand", name: product.brand || settings.brand || organization.name },
						category: product.categories.map((c) => c.name).join(" > ") || undefined,
						itemCondition: `https://schema.org/${product.condition === "new" ? "NewCondition" : product.condition === "used" ? "UsedCondition" : "RefurbishedCondition"}`,
						...(product.weight_kg != null ? { weight: { "@type": "QuantitativeValue", value: product.weight_kg, unitCode: "KGM" } } : {}),
						...(price != null
							? {
									offers: {
										"@type": "Offer",
										url: absoluteUrl(path),
										price: price.toFixed(2),
										priceCurrency: settings.currency,
										availability: SCHEMA_AVAILABILITY[stock],
										itemCondition: `https://schema.org/${product.condition === "new" ? "NewCondition" : product.condition === "used" ? "UsedCondition" : "RefurbishedCondition"}`,
										...(onSale && saleEndsAt ? { priceValidUntil: saleEndsAt.slice(0, 10) } : {}),
										seller: organization,
									},
								}
							: {}),
					},
					breadcrumbs([
						{ name: settings.title || "Shop", path: "/shop" },
						...(primary ? [{ name: primary.name, path: `/shop/${primary.slug}` }] : []),
						{ name: product.title, path },
					]),
				]}
			/>

			<nav aria-label="Breadcrumb" className="mb-6">
				<ol className="flex flex-wrap items-center gap-1 text-sm text-stone-600 dark:text-stone-400">
					<li>
						<Link href="/shop" className="hover:text-stone-950 dark:hover:text-white">
							{settings.title || "Shop"}
						</Link>
					</li>
					{primary && (
						<li className="flex items-center gap-1">
							<ChevronRight className="h-3.5 w-3.5" aria-hidden />
							<Link href={`/shop/${primary.slug}`} className="hover:text-stone-950 dark:hover:text-white">
								{primary.name}
							</Link>
						</li>
					)}
					<li className="flex items-center gap-1">
						<ChevronRight className="h-3.5 w-3.5" aria-hidden />
						<span aria-current="page" className="text-stone-900 dark:text-stone-100">
							{product.title}
						</span>
					</li>
				</ol>
			</nav>

			<div className="grid gap-10 lg:grid-cols-2">
				{/* Images */}
				<div className="space-y-3">
					<div className="relative aspect-square overflow-hidden rounded-2xl border border-amber-900/10 bg-[#f4ebd9] dark:border-white/10 dark:bg-stone-800">
						{images[0] ? (
							<Image src={images[0].url} alt={images[0].alt} fill preload sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
						) : (
							<div className="flex h-full items-center justify-center text-sm font-semibold tracking-widest text-amber-900/40" aria-hidden>
								MERKADO PH
							</div>
						)}
						{onSale && percentOff > 0 && <span className="absolute left-3 top-3 rounded-full bg-orange-600 px-3 py-1 text-sm font-bold text-white">−{percentOff}%</span>}
					</div>
					{images.length > 1 && (
						<ul className="grid grid-cols-4 gap-3" aria-label="More images">
							{images.slice(1).map((img, i) => (
								<li key={`${img.url}-${i}`} className="relative aspect-square overflow-hidden rounded-xl border border-amber-900/10 bg-[#f4ebd9] dark:border-white/10 dark:bg-stone-800">
									<a href={img.url} target="_blank" rel="noreferrer" aria-label={`Open image: ${img.alt}`}>
										<Image src={img.url} alt={img.alt} fill sizes="140px" className="object-cover" />
									</a>
								</li>
							))}
						</ul>
					)}
				</div>

				{/* Summary */}
				<div>
					{primary && <p className="text-sm font-semibold uppercase tracking-widest text-teal-800 dark:text-teal-300">{primary.name}</p>}
					<h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 dark:text-white sm:text-4xl">{product.title}</h1>
					<div className="mt-4">
						<Price product={product} currency={settings.currency} size="lg" />
						{onSale && saleEndsAt && <p className="mt-1 text-sm font-medium text-orange-700 dark:text-orange-400">Sale ends {formatDate(saleEndsAt, { dateStyle: "medium" })}</p>}
					</div>
					<p
						className={cn(
							"mt-3 inline-flex items-center gap-1.5 text-sm font-medium",
							stock === "instock" ? "text-teal-800 dark:text-teal-300" : stock === "onbackorder" ? "text-amber-800 dark:text-amber-300" : "text-stone-600 dark:text-stone-400",
						)}
					>
						<PackageCheck className="h-4 w-4" aria-hidden />
						{STOCK_LABELS[stock]}
						{product.manage_stock && stock === "instock" && (product.stock_quantity ?? 0) <= 5 && ` — only ${product.stock_quantity} left`}
					</p>
					{product.excerpt && <p className="mt-5 text-lg leading-relaxed text-stone-700 dark:text-stone-300">{product.excerpt}</p>}

					<div className="mt-6">
						<AddToCart
							id={product.id}
							slug={product.slug}
							title={product.title}
							price={price}
							image={product.cover_image_url}
							max={maxPurchasable(product)}
							available={stock !== "outofstock"}
						/>
					</div>

					<dl className="mt-8 divide-y divide-amber-900/10 border-y border-amber-900/10 text-sm dark:divide-white/10 dark:border-white/10">
						{product.sku && <Spec label="SKU" value={<span className="font-mono">{product.sku}</span>} />}
						{product.categories.length > 0 && (
							<Spec
								label={product.categories.length > 1 ? "Categories" : "Category"}
								value={product.categories.map((c, i) => (
									<span key={c.id}>
										{i > 0 && ", "}
										<Link href={`/shop/${c.slug}`} className="text-teal-800 hover:underline dark:text-teal-300">
											{c.name}
										</Link>
									</span>
								))}
							/>
						)}
						{product.tags.length > 0 && (
							<Spec
								label="Tags"
								value={product.tags.map((t, i) => (
									<span key={t.id}>
										{i > 0 && ", "}
										<Link href={`/shop?tag=${t.slug}`} className="text-teal-800 hover:underline dark:text-teal-300">
											{t.name}
										</Link>
									</span>
								))}
							/>
						)}
						{product.weight_kg != null && <Spec label="Weight" value={`${product.weight_kg} kg`} icon={Truck} />}
						{dims && <Spec label="Dimensions" value={dims} icon={Ruler} />}
					</dl>
				</div>
			</div>

			{product.content.trim() && (
				<section aria-labelledby="desc-title" className="mx-auto mt-16 max-w-3xl">
					<h2 id="desc-title" className="mb-6 text-2xl font-semibold text-stone-950 dark:text-white">
						Description
					</h2>
					<Markdown content={product.content} />
				</section>
			)}

			{related.length > 0 && (
				<section aria-labelledby="related-title" className="mt-16">
					<h2 id="related-title" className="mb-6 text-2xl font-semibold text-stone-950 dark:text-white">
						You may also like
					</h2>
					<ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						{related.map((p) => (
							<li key={p.id}>
								<ProductCard product={p} currency={settings.currency} headingLevel="h3" />
							</li>
						))}
					</ul>
				</section>
			)}
		</main>
	);
}

function Spec({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
	return (
		<div className="flex gap-4 py-3">
			<dt className="flex w-28 shrink-0 items-center gap-1.5 text-stone-600 dark:text-stone-400">
				{Icon && <Icon className="h-4 w-4" aria-hidden />}
				{label}
			</dt>
			<dd className="text-stone-900 dark:text-stone-100">{value}</dd>
		</div>
	);
}
