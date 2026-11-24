import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarCheck, Images, MapPin } from "lucide-react";
import Link from "next/link";
import { entryYear, getPublicPortfolioBySlug, getRelatedPortfolios, getSameEventOtherYears, portfolioCover } from "@/lib/portfolio";
import { summarize } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { getLinkedBlog } from "@/lib/blogs";
import { BackFooter, Body, Companion, DetailHeader, Facts } from "@/components/site/detail";
import { ContentCard } from "@/components/site/content-card";
import { JsonLd } from "@/components/site/json-ld";
import { PhotoTable } from "@/components/portfolio/photo-table";

// Cached as an ISR page; refreshed once a day or when the project is saved / purged in Admin → Cache.
export const revalidate = 86400;

/** No pages at build time; each one is rendered on its first visit and then served from the cache (ISR). */
export function generateStaticParams() {
	return [];
}

export async function generateMetadata({ params }: PageProps<"/impact/[slug]">): Promise<Metadata> {
	const project = await getPublicPortfolioBySlug((await params).slug);
	if (!project) return { title: "Project not found", robots: { index: false } };
	const cover = portfolioCover(project);
	return pageMetadata({
		title: project.meta_title || project.title,
		description: summarize(project),
		path: `/impact/${project.slug}`,
		image: cover,
		type: "article",
		publishedTime: project.published_at,
		modifiedTime: project.updated_at,
		tags: project.tags,
	});
}

export default async function PortfolioProjectPage({ params }: PageProps<"/impact/[slug]">) {
	const project = await getPublicPortfolioBySlug((await params).slug);
	if (!project) notFound();

	const path = `/impact/${project.slug}`;
	const year = entryYear(project);
	// The same event in other years (shared tag, e.g. "Spring Market"); otherwise other recent entries.
	const sameEvent = await getSameEventOtherYears(project.id, project.tags, 6).catch(() => []);
	const related = sameEvent.length ? sameEvent : await getRelatedPortfolios(project.id, 3).catch(() => []);
	const story = project.blog_id ? await getLinkedBlog(project.blog_id).catch(() => null) : null;
	const date = project.completed_on ? formatDate(project.completed_on, { day: "numeric", month: "long", year: "numeric" }) : null;

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
						{ name: "Community Impact", path: "/impact" },
						{ name: project.title, path },
					]),
				]}
			/>

			<article>
				<DetailHeader backHref={year ? `/impact?year=${year}` : "/impact"} backLabel={year ? `Community Impact ${year}` : "Community Impact"} tags={project.tags} title={project.title} excerpt={project.excerpt} />

				<Facts
					facts={[
						{ icon: MapPin, label: "Location", value: project.location },
						{ icon: CalendarCheck, label: "Date", value: date },
						{ icon: Images, label: "Photos", value: project.images.length ? String(project.images.length) : null },
					]}
				/>

				<section aria-label="Photos" className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
					<PhotoTable images={project.images} title={project.title} priorityFirst />
				</section>

				<Body content={project.content} />

				{story && (
					<Companion
						heading="Read the story"
						items={[
							{
								href: `/blogs/${story.slug}`,
								title: story.title,
								excerpt: story.excerpt,
								image: story.cover_image_url ? { url: story.cover_image_url, alt: "" } : null,
								meta: story.author_name ? `Blog · ${story.author_name}` : "Blog",
							},
						]}
					/>
				)}
			</article>

			{related.length > 0 && (
				<section aria-labelledby="more-projects" className="mx-auto max-w-6xl border-t border-amber-900/10 px-4 py-12 dark:border-white/10 sm:px-6">
					<div className="flex flex-wrap items-baseline justify-between gap-3">
						<h2 id="more-projects" className="text-2xl font-semibold tracking-tight text-stone-950 dark:text-white">
							{sameEvent.length ? "The same event in other years" : "More from Community Impact"}
						</h2>
						{year && (
							<Link href={`/impact?year=${year}`} className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline dark:text-teal-300">
								Everything from {year} →
							</Link>
						)}
					</div>
					<div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{related.map((p) => {
							const cover = portfolioCover(p);
							return <ContentCard key={p.id} href={`/impact/${p.slug}`} title={p.title} excerpt={p.excerpt} image={cover?.url} imageAlt={cover?.alt} eyebrow={[entryYear(p), p.location].filter(Boolean).join(" · ") || undefined} headingLevel="h3" />;
						})}
					</div>
				</section>
			)}

			<BackFooter href={year ? `/impact?year=${year}` : "/impact"} label={year ? `Back to Community Impact ${year}` : "Back to Community Impact"} />
		</main>
	);
}
