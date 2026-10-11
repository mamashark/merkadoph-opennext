import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortfolioTags, getPublicPortfolios, PORTFOLIO_PER_PAGE, portfolioCover } from "@/lib/portfolio";
import { pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { absoluteUrl, breadcrumbs, pageMetadata } from "@/lib/seo";
import { ContentCard, EmptyNotice, LinkTabs, PageIntro } from "@/components/site/content-card";
import { Pagination } from "@/components/admin/pagination";
import { JsonLd } from "@/components/site/json-ld";

// Renders per request (it reads the tag/page from the URL); the data itself comes from the cache.

const description = "Roofs, renovations and builds we've finished across Sweden — photos and the story behind each project. See our work, then ask for a free quote.";

export async function generateMetadata({ searchParams }: PageProps<"/portfolio">): Promise<Metadata> {
	const params = await searchParams;
	const tag = param(params, "tag");
	const page = pageParam(params);
	const meta = await pageMetadata({
		title: `${tag ? `${tag} projects` : "Portfolio"}${page > 1 ? ` — Page ${page}` : ""}`,
		description,
		path: page > 1 ? `/portfolio?page=${page}` : "/portfolio",
	});
	// Tag filters are views of the same list: keep them out of the index (seo.md A-3).
	return tag ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default async function PortfolioPage({ searchParams }: PageProps<"/portfolio">) {
	const params = await searchParams;
	const page = pageParam(params);
	const tags = await getPortfolioTags();
	const tag = tags.includes(param(params, "tag")) ? param(params, "tag") : "";
	const { portfolios, total } = await getPublicPortfolios(tag || undefined, page);
	if (page > 1 && portfolios.length === 0) notFound();

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "CollectionPage",
						name: "Portfolio",
						description,
						url: absoluteUrl("/portfolio"),
						mainEntity: {
							"@type": "ItemList",
							itemListElement: portfolios.map((p, i) => ({ "@type": "ListItem", position: (page - 1) * PORTFOLIO_PER_PAGE + i + 1, url: absoluteUrl(`/portfolio/${p.slug}`), name: p.title })),
						},
					},
					breadcrumbs([{ name: "Portfolio", path: "/portfolio" }]),
				]}
			/>
			<PageIntro eyebrow="Portfolio" title="Projects we're proud of" description={description} />

			{tags.length > 1 && (
				<LinkTabs
					label="Project types"
					current={tag}
					tabs={[{ label: "All", value: "", href: "/portfolio" }, ...tags.map((t) => ({ label: t, value: t, href: `/portfolio?tag=${encodeURIComponent(t)}` }))]}
				/>
			)}

			{portfolios.length === 0 ? (
				<EmptyNotice title="Our portfolio is being put together." description="Abangan! New projects are coming soon." />
			) : (
				<>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{portfolios.map((p, i) => {
							const cover = portfolioCover(p);
							return (
								<ContentCard
									key={p.id}
									href={`/portfolio/${p.slug}`}
									title={p.title}
									excerpt={p.excerpt}
									image={cover?.url}
									imageAlt={cover?.alt}
									priority={i === 0}
									imageFit="contain"
									eyebrow={p.location ?? undefined}
									meta={
										<p>
											{p.images.length} photo{p.images.length === 1 ? "" : "s"}
											{p.completed_on ? ` · Completed ${formatDate(p.completed_on, { month: "long", year: "numeric" })}` : ""}
										</p>
									}
								/>
							);
						})}
					</div>
					<div className="mt-12">
						<Pagination page={page} perPage={PORTFOLIO_PER_PAGE} total={total} basePath="/portfolio" params={tag ? { tag } : {}} />
					</div>
				</>
			)}
		</main>
	);
}
