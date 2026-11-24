import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedBlogBySlug, readingMinutes, summarize } from "@/lib/blogs";
import { formatDate } from "@/lib/datetime";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { entryYear, getImpactEntriesForBlog, portfolioCover } from "@/lib/portfolio";
import { BackFooter, Companion } from "@/components/site/detail";
import { ArticleHeader, ArticleText, HeaderPhoto, PhotoPair } from "@/components/blog/article";
import { PhotoRow } from "@/components/blog/photo-row";
import { Reel } from "@/components/blog/reel";
import { plexMono } from "@/components/constellation/fonts";
import { countMarkers, LAYOUT_SLOTS, splitBody, type BlogPhoto } from "@/lib/blog-layout";
import { JsonLd } from "@/components/site/json-ld";

// Cached as an ISR page; refreshed once a day or when the content is saved / purged in Admin → Cache.
export const revalidate = 86400;

/** No pages at build time; each one is rendered on its first visit and then served from the cache (ISR). */
export function generateStaticParams() {
	return [];
}

export async function generateMetadata({ params }: PageProps<"/blogs/[slug]">): Promise<Metadata> {
	const blog = await getPublishedBlogBySlug((await params).slug);
	if (!blog) return { title: "Post not found", robots: { index: false } };

	return pageMetadata({
		title: blog.meta_title || blog.title,
		description: summarize(blog),
		path: `/blogs/${blog.slug}`,
		image: blog.cover_image_url ? { url: blog.cover_image_url, alt: blog.cover_image_alt } : null,
		type: "article",
		publishedTime: blog.published_at,
		modifiedTime: blog.updated_at,
		authors: blog.author_name ? [blog.author_name] : undefined,
		tags: blog.tags,
	});
}

export default async function BlogPostPage({ params }: PageProps<"/blogs/[slug]">) {
	const blog = await getPublishedBlogBySlug((await params).slug);
	if (!blog) notFound();

	const path = `/blogs/${blog.slug}`;
	const impact = await getImpactEntriesForBlog(blog.id).catch(() => []);
	// Layout (approved mock-up). A: one header photo, falling back to the cover image. B: the middle pair, placed by
	// [[photos]] or halfway. The photo row goes where [[slideshow]] is, or at the end.
	const layoutPhotos = (blog.layout_photos ?? []).slice(0, LAYOUT_SLOTS[blog.photo_layout ?? "A"] ?? 1);
	const cover: BlogPhoto | null = blog.cover_image_url ? { url: blog.cover_image_url, alt: blog.cover_image_alt || blog.title, caption: "" } : null;
	const headerPhoto = blog.photo_layout === "A" || !blog.photo_layout ? (layoutPhotos[0] ?? cover) : null;
	const slideshow = blog.slideshow ?? [];
	const parts = splitBody(blog.content, { pair: blog.photo_layout === "B" && layoutPhotos.length >= 2, slideshow: slideshow.length > 0 });
	// With no [[slideshow]] marker the row ends the article, so the video goes just before it.
	const rowAtEnd = slideshow.length > 0 && countMarkers(blog.content).slideshow === 0;
	const reel = blog.video_url ? <Reel src={blog.video_url} poster={blog.video_poster_url} transcript={blog.video_transcript} title={blog.title} /> : null;
	const kicker = blog.tags.find((t) => t.toLowerCase() !== "sample") ?? null;
	/** Cover, layout photos and row photos, for search results. */
	const ldImages = [...new Set([cover?.url, ...layoutPhotos.map((p) => p.url), ...slideshow.map((p) => p.url)].filter((u): u is string => !!u))].slice(0, 10);

	return (
		<main>
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "BlogPosting",
						headline: blog.title,
						description: summarize(blog),
						image: ldImages.length ? ldImages : undefined,
						datePublished: blog.published_at,
						dateModified: blog.updated_at,
						author: blog.author_name ? { "@type": "Person", name: blog.author_name } : organization,
						publisher: organization,
						mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(path) },
						keywords: blog.tags.join(", ") || undefined,
					},
					breadcrumbs([
						{ name: "Blogs", path: "/blogs" },
						{ name: blog.title, path },
					]),
				]}
			/>

			<article className={plexMono.variable}>
				<ArticleHeader kicker={kicker} title={blog.title} dek={blog.excerpt}>
					<p className="flex flex-wrap items-center gap-x-2 gap-y-1">
						{blog.author_name && (
							<>
								<span className="font-medium text-stone-800 dark:text-stone-200">{blog.author_name}</span>
								<span aria-hidden>·</span>
							</>
						)}
						{/* Kay (2026-11-24): author, the date the post first appeared, and reading time only; no "Updated" date. */}
						<time dateTime={blog.published_at ?? undefined}>{formatDate(blog.published_at, { dateStyle: "long" })}</time>
						<span aria-hidden>·</span>
						<span>{readingMinutes(blog.content)} min read</span>
					</p>
				</ArticleHeader>

				{headerPhoto && <HeaderPhoto photo={headerPhoto} />}

				{parts.map((part, i) =>
					part.kind === "text" ? (
						<ArticleText key={i} content={part.text} />
					) : part.kind === "photos" ? (
						<PhotoPair key={i} photos={layoutPhotos} />
					) : (
						<div key={i}>
							{rowAtEnd && reel}
							<PhotoRow photos={slideshow} />
						</div>
					),
				)}
				{!rowAtEnd && reel}
				<div className="h-14" aria-hidden />

				<Companion
					heading={impact.length > 1 ? "See the photos from these events" : "See the photos"}
					items={impact.map((p) => {
						const n = p.images?.length ?? 0;
						return {
							href: `/impact/${p.slug}`,
							title: p.title,
							excerpt: p.excerpt,
							image: portfolioCover(p),
							meta: ["Community Impact", entryYear(p), n ? `${n} photo${n === 1 ? "" : "s"}` : null].filter(Boolean).join(" · "),
						};
					})}
				/>
			</article>

			<BackFooter href="/blogs" label="Back to all stories" />
		</main>
	);
}
