import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedBlogBySlug, readingMinutes, summarize } from "@/lib/blogs";
import { formatDate } from "@/lib/datetime";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { BackFooter, Body, CoverFigure, DetailHeader } from "@/components/site/detail";
import { JsonLd } from "@/components/site/json-ld";

// Cached as an ISR page; refreshed every 5 minutes or when the content is saved / purged in Admin → Cache.
export const revalidate = 300;

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
	const edited = blog.published_at && new Date(blog.updated_at).getTime() - new Date(blog.published_at).getTime() > 24 * 3600 * 1000;

	return (
		<main>
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "BlogPosting",
						headline: blog.title,
						description: summarize(blog),
						image: blog.cover_image_url ? [blog.cover_image_url] : undefined,
						datePublished: blog.published_at,
						dateModified: blog.updated_at,
						author: blog.author_name ? { "@type": "Person", name: blog.author_name } : organization,
						publisher: organization,
						mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(path) },
						keywords: blog.tags.join(", ") || undefined,
					},
					breadcrumbs([
						{ name: "Blog", path: "/blogs" },
						{ name: blog.title, path },
					]),
				]}
			/>

			<article>
				<DetailHeader backHref="/blogs" backLabel="All stories" tags={blog.tags} title={blog.title} excerpt={blog.excerpt}>
					<p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600 dark:text-stone-400">
						{blog.author_name && (
							<>
								<span className="font-medium text-stone-800 dark:text-stone-200">{blog.author_name}</span>
								<span aria-hidden>·</span>
							</>
						)}
						<span>
							Published <time dateTime={blog.published_at ?? undefined}>{formatDate(blog.published_at, { dateStyle: "long" })}</time>
						</span>
						{edited && (
							<>
								<span aria-hidden>·</span>
								<span>
									Updated <time dateTime={blog.updated_at}>{formatDate(blog.updated_at, { dateStyle: "long" })}</time>
								</span>
							</>
						)}
						<span aria-hidden>·</span>
						<span>{readingMinutes(blog.content)} min read</span>
					</p>
				</DetailHeader>

				<CoverFigure src={blog.cover_image_url} alt={blog.cover_image_alt || blog.title} caption={blog.cover_image_alt} />
				<Body content={blog.content} />
			</article>

			<BackFooter href="/blogs" label="Back to all stories" />
		</main>
	);
}
