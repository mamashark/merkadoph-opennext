import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getImpactYears, getPortfolioTags, getPublicPortfolios, PORTFOLIO_PER_PAGE, portfolioCover } from "@/lib/portfolio";
import { pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { absoluteUrl, breadcrumbs, pageMetadata } from "@/lib/seo";
import { ChipFilter, ContentCard, EmptyNotice, LinkTabs, PageIntro } from "@/components/site/content-card";
import { Pagination } from "@/components/admin/pagination";
import { JsonLd } from "@/components/site/json-ld";

// Renders per request (it reads the year/tag/page from the URL); the data itself comes from the cache.

/** /impact with the given filters (empty ones left out). */
const impactHref = (f: { year?: string; tag?: string; page?: number }) => {
	const q = new URLSearchParams();
	if (f.year) q.set("year", f.year);
	if (f.tag) q.set("tag", f.tag);
	if (f.page && f.page > 1) q.set("page", String(f.page));
	const qs = q.toString();
	return qs ? `/impact?${qs}` : "/impact";
};

const description = "Community projects by Merkado PH and friends: events, pop-ups and initiatives that brought people together, with photos and the story behind each one.";

export async function generateMetadata({ searchParams }: PageProps<"/impact">): Promise<Metadata> {
	const params = await searchParams;
	const tag = param(params, "tag");
	const years = await getImpactYears().catch(() => [] as string[]);
	const year = years.includes(param(params, "year")) ? param(params, "year") : "";
	const page = pageParam(params);
	const meta = await pageMetadata({
		title: `${tag || "Community Impact"}${year ? ` ${year}` : ""}${page > 1 ? ` — Page ${page}` : ""}`,
		description: year ? `What Merkado PH and the community did together in ${year}: events, markets and initiatives, with photos.` : description,
		path: impactHref({ year, page }),
	});
	// A year is its own page (indexed); tag filters are views of the same list, so they stay out of the index (seo.md A-3).
	return tag ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default async function PortfolioPage({ searchParams }: PageProps<"/impact">) {
	const params = await searchParams;
	const page = pageParam(params);
	const [tags, years] = await Promise.all([getPortfolioTags(), getImpactYears()]);
	const tag = tags.includes(param(params, "tag")) ? param(params, "tag") : "";
	const year = years.includes(param(params, "year")) ? param(params, "year") : "";
	const { portfolios, total } = await getPublicPortfolios(tag || undefined, page, PORTFOLIO_PER_PAGE, year || undefined);
	if (page > 1 && portfolios.length === 0) notFound();

	return (
		<main className="accent-impact mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "CollectionPage",
						name: year ? `Community Impact ${year}` : "Community Impact",
						description,
						url: absoluteUrl(impactHref({ year })),
						mainEntity: {
							"@type": "ItemList",
							itemListElement: portfolios.map((p, i) => ({ "@type": "ListItem", position: (page - 1) * PORTFOLIO_PER_PAGE + i + 1, url: absoluteUrl(`/impact/${p.slug}`), name: p.title })),
						},
					},
					breadcrumbs([{ name: "Community Impact", path: "/impact" }]),
				]}
			/>
			<PageIntro eyebrow="Community Impact" title={year ? `What we did together in ${year}` : "What we built together"} description={description} />

			{years.length > 0 && (
				<LinkTabs
					label="Years"
					current={year}
					tabs={[{ label: "All years", value: "", href: impactHref({ tag }) }, ...years.map((y) => ({ label: y, value: y, href: impactHref({ year: y, tag }) }))]}
				/>
			)}
			{tags.length > 1 && <ChipFilter label="Events and themes" allLabel="Everything" items={tags} current={tag} visible={10} href={(t) => impactHref({ year, tag: t })} />}

			{portfolios.length === 0 ? (
				<EmptyNotice
					title={year || tag ? "Nothing here yet for this filter." : "Our community projects are being put together."}
					description={year || tag ? "Try another year, or show everything." : "Abangan! New projects are coming soon."}
				/>
			) : (
				<>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{portfolios.map((p, i) => {
							const cover = portfolioCover(p);
							return (
								<ContentCard
									key={p.id}
									href={`/impact/${p.slug}`}
									title={p.title}
									excerpt={p.excerpt}
									image={cover?.url}
									imageAlt={cover?.alt}
									priority={i === 0}
									eyebrow={p.location ?? undefined}
									meta={
										<p>
											{p.images.length} photo{p.images.length === 1 ? "" : "s"}
											{p.completed_on ? ` · ${formatDate(p.completed_on, { day: "numeric", month: "long", year: "numeric" })}` : ""}
										</p>
									}
								/>
							);
						})}
					</div>
					<div className="mt-12">
						<Pagination tone="site" page={page} perPage={PORTFOLIO_PER_PAGE} total={total} basePath="/impact" params={{ ...(year && { year }), ...(tag && { tag }) }} />
					</div>
				</>
			)}
		</main>
	);
}
