import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { BULLETIN_PER_PAGE, getBulletinCategories, getFeaturedBulletin, getPublicBulletin, type BulletinCard } from "@/lib/bulletin";
import { OFFERS_SLUG, TYPE_LABEL, issuedBy } from "@/lib/bulletin-shared";
import { getPublicPromotions, PROMOTIONS_PER_PAGE, type PromotionSummary } from "@/lib/promotions";
import { EMBASSY_LINKS } from "@/lib/businesses";
import { pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { pageMetadata } from "@/lib/seo";
import { ContentCard, EmptyNotice, LinkTabs, PageIntro } from "@/components/site/content-card";
import { Pagination } from "@/components/admin/pagination";

// Renders per request (it reads the filters from the URL); the data itself comes from the cache.

const TITLE = "Ano’ng latest na chismis?";
const description =
	"The good kind of chismis. Embassy updates, community announcements, media features, opportunities and special offers from friends of Merkado PH.";

type Filters = { category: string; q: string; page: number };

async function readFilters(searchParams: PageProps<"/bulletin">["searchParams"]): Promise<Filters & { categoryName: string | null; categoryDescription: string | null }> {
	const params = await searchParams;
	const categories = await getBulletinCategories().catch(() => []);
	const raw = param(params, "category");
	// Only known values are accepted (guidelines §0.5); anything else shows everything.
	const known = raw === OFFERS_SLUG ? "Community Offers" : (categories.find((c) => c.slug === raw)?.name ?? null);
	const category = known ? raw : "";
	const q = param(params, "q").trim().slice(0, 80);
	const categoryDescription = categories.find((c) => c.slug === category)?.description ?? null;
	return { category, q: category === OFFERS_SLUG ? "" : q, page: pageParam(params), categoryName: known, categoryDescription };
}

const listHref = ({ category, q, page }: Partial<Filters>) => {
	const qs = new URLSearchParams({ ...(category ? { category } : {}), ...(q ? { q } : {}), ...(page && page > 1 ? { page: String(page) } : {}) }).toString();
	return qs ? `/bulletin?${qs}` : "/bulletin";
};

export async function generateMetadata({ searchParams }: PageProps<"/bulletin">): Promise<Metadata> {
	const { category, q, page, categoryName, categoryDescription } = await readFilters(searchParams);
	const label = categoryName ? `: ${categoryName}` : "";
	const meta = pageMetadata({ title: `Bulletin Board${label}${page > 1 ? ` — Page ${page}` : ""}`, description: categoryDescription || description, path: listHref({ category, page }) });
	// Search results aren't indexed (thin, endless variations).
	return q ? { ...meta, robots: { index: false, follow: true } } : meta;
}

const card = (n: BulletinCard, featured = false) => (
	<ContentCard
		key={n.id}
		href={`/bulletin/${n.slug}`}
		title={n.title}
		excerpt={n.excerpt}
		image={n.cover_image_url}
		imageAlt={n.cover_image_alt}
		eyebrow={[n.is_pinned ? "Pinned" : null, n.category.name].filter(Boolean).join(" · ")}
		meta={
			<>
				{issuedBy(n)} · 
				<time dateTime={n.published_at ?? undefined}>{formatDate(n.published_at, { dateStyle: "long" })}</time>
				{n.expires_at && <> · until {formatDate(n.expires_at, { dateStyle: "medium" })}</>}
			</>
		}
		badge={n.content_type === "embassy_update" ? TYPE_LABEL.embassy_update : undefined}
		featured={featured}
		headingLevel="h3"
	/>
);

const offerCard = (p: PromotionSummary) => (
	<ContentCard
		key={p.id}
		href={`/promotions/${p.slug}`}
		title={p.title}
		excerpt={p.excerpt}
		image={p.cover_image_url}
		imageAlt={p.cover_image_alt}
		eyebrow={["Community Offer", p.discount_label].filter(Boolean).join(" · ")}
		meta={p.ends_at ? <>Until {formatDate(p.ends_at, { dateStyle: "long" })}</> : undefined}
		headingLevel="h3"
	/>
);

export default async function BulletinPage({ searchParams }: PageProps<"/bulletin">) {
	const { category, q, page, categoryName } = await readFilters(searchParams);
	const offersOnly = category === OFFERS_SLUG;
	const overview = !category && !q && page === 1;

	const [categories, list, featured, offers] = await Promise.all([
		getBulletinCategories().catch(() => []),
		offersOnly ? null : getPublicBulletin(category, q, page, BULLETIN_PER_PAGE).catch(() => ({ items: [] as BulletinCard[], total: 0 })),
		overview ? getFeaturedBulletin(3).catch(() => [] as BulletinCard[]) : Promise.resolve([] as BulletinCard[]),
		offersOnly || overview ? getPublicPromotions("current", offersOnly ? page : 1, offersOnly ? PROMOTIONS_PER_PAGE : 3).catch(() => ({ promotions: [] as PromotionSummary[], total: 0 })) : null,
	]);
	const shown = offersOnly ? offers!.promotions.length : list!.items.length;
	if (page > 1 && shown === 0) notFound();

	const featuredIds = new Set(featured.map((f) => f.id));
	const items = (list?.items ?? []).filter((n) => !featuredIds.has(n.id));
	const total = offersOnly ? offers!.total : list!.total;
	const resultText = q ? `${total} ${total === 1 ? "result" : "results"} for “${q}”` : categoryName ? `${total} in ${categoryName}` : "";

	return (
		<main className="accent-bulletin mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<PageIntro eyebrow="Bulletin Board" title={TITLE} description={description} />

			{EMBASSY_LINKS.length > 0 && (
				<aside aria-labelledby="embassy-title" className="mb-10 border border-site-line bg-site-surface p-5">
					<h2 id="embassy-title" className="font-semibold text-site-ink">
						Philippine Embassy in Sweden
					</h2>
					<p className="mt-1 text-sm text-site-ink-2">For consular services and official announcements, always check the Embassy&rsquo;s own channels.</p>
					<ul className="mt-3 flex flex-wrap gap-3">
						{EMBASSY_LINKS.map((l) => (
							<li key={l.href}>
								<a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-site-line-2 px-4 font-label text-xs font-medium tracking-[0.1em] text-site-ink uppercase transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
									{l.label} ↗<span className="sr-only"> (opens in a new tab)</span>
								</a>
							</li>
						))}
					</ul>
				</aside>
			)}

			<LinkTabs
				label="Category"
				current={category}
				tabs={[
					{ label: "All updates", value: "", href: listHref({ q }) },
					...categories.map((c) => ({ label: c.name, value: c.slug, href: listHref({ category: c.slug, q }) })),
					{ label: "Community Offers", value: OFFERS_SLUG, href: listHref({ category: OFFERS_SLUG }) },
				]}
			/>

			{!offersOnly && (
				<form action="/bulletin" method="get" role="search" className="mt-6 flex max-w-xl gap-2">
					{category && <input type="hidden" name="category" value={category} />}
					<label htmlFor="bulletin-q" className="sr-only">
						Search the Bulletin Board
					</label>
					<input
						id="bulletin-q"
						name="q"
						type="search"
						defaultValue={q}
						maxLength={80}
						placeholder="Search notices…"
						className="min-h-11 w-full border border-site-line-2 bg-site-surface px-3 text-site-ink placeholder:text-site-muted focus-visible:outline-2 focus-visible:outline-accent"
					/>
					<button type="submit" className="inline-flex min-h-11 items-center gap-2 border border-site-ink bg-site-ink px-4 font-label text-xs font-medium tracking-[0.1em] text-site-bg uppercase hover:bg-accent hover:border-accent">
						<Search className="h-4 w-4" aria-hidden /> Search
					</button>
				</form>
			)}

			{/* Announced when the filters change (spec §14). */}
			<p className="mt-4 text-sm text-site-muted empty:hidden" aria-live="polite">
				{resultText}
			</p>

			{featured.length > 0 && (
				<section aria-labelledby="featured-title" className="mt-10">
					<h2 id="featured-title" className="sr-only">
						Featured
					</h2>
					<div className="grid gap-6 lg:grid-cols-2">{featured.map((n) => card(n, true))}</div>
				</section>
			)}

			{!offersOnly && (
				<section aria-labelledby="updates-title" className="mt-10">
					<h2 id="updates-title" className="text-2xl font-semibold tracking-tight text-site-ink">
						{categoryName ?? "Latest updates"}
					</h2>
					{items.length === 0 && featured.length === 0 ? (
						<EmptyNotice
							title={q ? "Nothing matches that search." : "Nothing here right now."}
							description={q ? "Try another word, or browse all updates." : "Embassy updates, community notices and opportunities will appear here."}
						/>
					) : (
						<div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((n) => card(n))}</div>
					)}
					{list!.total > BULLETIN_PER_PAGE && (
						<div className="mt-12">
							<Pagination tone="site" page={page} perPage={BULLETIN_PER_PAGE} total={list!.total} basePath="/bulletin" params={{ ...(category ? { category } : {}), ...(q ? { q } : {}) }} />
						</div>
					)}
				</section>
			)}

			{offers && (
				<section aria-labelledby="offers-title" className="mt-14">
					<h2 id="offers-title" className="text-2xl font-semibold tracking-tight text-site-ink">
						Offers from friends of Merkado PH
					</h2>
					{offers.promotions.length === 0 ? (
						<EmptyNotice title="No offers right now." description="Partner offers will appear here when there are any." />
					) : (
						<>
							<div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{offers.promotions.map(offerCard)}</div>
							{offersOnly ? (
								<div className="mt-12">
									<Pagination tone="site" page={page} perPage={PROMOTIONS_PER_PAGE} total={offers.total} basePath="/bulletin" params={{ category: OFFERS_SLUG }} />
								</div>
							) : (
								offers.total > offers.promotions.length && (
									<p className="mt-6">
										<a href={listHref({ category: OFFERS_SLUG })} className="font-semibold text-accent hover:underline">
											All {offers.total} offers →
										</a>
									</p>
								)
							)}
						</>
					)}
				</section>
			)}
		</main>
	);
}
