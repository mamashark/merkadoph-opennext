import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarCheck, Images, MapPin } from "lucide-react";
import { getPublicPortfolioBySlug, getRelatedPortfolios, portfolioCover } from "@/lib/portfolio";
import { summarize } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { BackFooter, Body, CtaLink, DetailHeader, Facts } from "@/components/site/detail";
import { ContentCard } from "@/components/site/content-card";
import { JsonLd } from "@/components/site/json-ld";
import { PortfolioImageGrid } from "@/components/portfolio/image-grid";

// Cached as an ISR page; refreshed every 5 minutes or when the project is saved / purged in Admin → Cache.
export const revalidate = 300;

/** No pages at build time; each one is rendered on its first visit and then served from the cache (ISR). */
export function generateStaticParams() {
	return [];
}

export async function generateMetadata({ params }: PageProps<"/portfolio/[slug]">): Promise<Metadata> {
	const project = await getPublicPortfolioBySlug((await params).slug);
	if (!project) return { title: "Project not found", robots: { index: false } };
	const cover = portfolioCover(project);
	return pageMetadata({
		title: project.meta_title || project.title,
		description: summarize(project),
		path: `/portfolio/${project.slug}`,
		image: cover,
		type: "article",
		publishedTime: project.published_at,
		modifiedTime: project.updated_at,
		tags: project.tags,
	});
}

export default async function PortfolioProjectPage({ params }: PageProps<"/portfolio/[slug]">) {
	const project = await getPublicPortfolioBySlug((await params).slug);
	if (!project) notFound();

	const path = `/portfolio/${project.slug}`;
	const related = await getRelatedPortfolios(project.id, 3).catch(() => []);
	const completed = project.completed_on ? formatDate(project.completed_on, { month: "long", year: "numeric" }) : null;

	return (
		<main>
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "CreativeWork",
						name: project.title,
						description: summarize(project),
						url: absoluteUrl(path),
						creator: organization,
						...(project.completed_on ? { dateCreated: project.completed_on } : {}),
						...(project.published_at ? { datePublished: project.published_at } : {}),
						dateModified: project.updated_at,
						...(project.location ? { locationCreated: { "@type": "Place", name: project.location } } : {}),
						keywords: project.tags.length ? project.tags.join(", ") : undefined,
						image: project.images.map((img) => ({ "@type": "ImageObject", contentUrl: img.url, caption: img.description || img.alt || undefined, description: img.alt || undefined })),
					},
					breadcrumbs([
						{ name: "Portfolio", path: "/portfolio" },
						{ name: project.title, path },
					]),
				]}
			/>

			<article>
				<DetailHeader backHref="/portfolio" backLabel="All projects" tags={project.tags} title={project.title} excerpt={project.excerpt} />

				<Facts
					facts={[
						{ icon: MapPin, label: "Location", value: project.location },
						{ icon: CalendarCheck, label: "Completed", value: completed },
						{ icon: Images, label: "Photos", value: project.images.length ? String(project.images.length) : null },
					]}
				>
					<CtaLink href="/#contact">Get a free quote</CtaLink>
				</Facts>

				<section aria-label="Project photos" className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
					<PortfolioImageGrid images={project.images} title={project.title} priorityFirst />
				</section>

				<Body content={project.content} />
			</article>

			{related.length > 0 && (
				<section aria-labelledby="more-projects" className="mx-auto max-w-6xl border-t border-amber-900/10 px-4 py-12 dark:border-white/10 sm:px-6">
					<h2 id="more-projects" className="text-2xl font-semibold tracking-tight text-stone-950 dark:text-white">
						More projects
					</h2>
					<div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{related.map((p) => {
							const cover = portfolioCover(p);
							return <ContentCard key={p.id} href={`/portfolio/${p.slug}`} title={p.title} excerpt={p.excerpt} image={cover?.url} imageAlt={cover?.alt} eyebrow={p.location ?? undefined} headingLevel="h3" />;
						})}
					</div>
				</section>
			)}

			<BackFooter href="/portfolio" label="Back to all projects" />
		</main>
	);
}
