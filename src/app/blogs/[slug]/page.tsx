import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatDate, getPublishedBlogBySlug, readingMinutes, summarize } from "@/lib/blogs";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import { Markdown } from "@/components/blog/markdown";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/blogs/[slug]">): Promise<Metadata> {
	const blog = await getPublishedBlogBySlug((await params).slug);
	if (!blog) return { title: "Post not found", robots: { index: false } };

	const title = blog.meta_title || blog.title;
	const description = summarize(blog);
	const url = `/blogs/${blog.slug}`;
	const images = blog.cover_image_url ? [{ url: blog.cover_image_url, alt: blog.cover_image_alt || blog.title }] : undefined;

	return {
		title,
		description,
		alternates: { canonical: url },
		keywords: blog.tags,
		authors: blog.author_name ? [{ name: blog.author_name }] : undefined,
		openGraph: {
			type: "article",
			url,
			title,
			description,
			siteName: SITE_NAME,
			images,
			publishedTime: blog.published_at ?? undefined,
			modifiedTime: blog.updated_at,
			authors: blog.author_name ? [blog.author_name] : undefined,
			tags: blog.tags,
		},
		twitter: { card: images ? "summary_large_image" : "summary", title, description, images: images?.map((i) => i.url) },
	};
}

export default async function BlogPostPage({ params }: PageProps<"/blogs/[slug]">) {
	const blog = await getPublishedBlogBySlug((await params).slug);
	if (!blog) notFound();

	const url = `${SITE_URL}/blogs/${blog.slug}`;
	const jsonLd = [
		{
			"@context": "https://schema.org",
			"@type": "BlogPosting",
			headline: blog.title,
			description: summarize(blog),
			image: blog.cover_image_url ? [blog.cover_image_url] : undefined,
			datePublished: blog.published_at,
			dateModified: blog.updated_at,
			author: blog.author_name ? { "@type": "Person", name: blog.author_name } : { "@type": "Organization", name: SITE_NAME },
			publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.webp` } },
			mainEntityOfPage: { "@type": "WebPage", "@id": url },
			keywords: blog.tags.join(", ") || undefined,
		},
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: "Blog", item: `${SITE_URL}/blogs` },
				{ "@type": "ListItem", position: 2, name: blog.title, item: url },
			],
		},
	];

	return (
		<main>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

			<article>
				<header className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 sm:pt-16">
					<nav aria-label="Breadcrumb">
						<Link href="/blogs" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
							<ArrowLeft className="h-4 w-4" aria-hidden /> All stories
						</Link>
					</nav>
					{blog.tags.length > 0 && (
						<ul className="mt-6 flex flex-wrap gap-2" aria-label="Tags">
							{blog.tags.map((tag) => (
								<li key={tag} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-200">
									{tag}
								</li>
							))}
						</ul>
					)}
					<h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">{blog.title}</h1>
					{blog.excerpt && <p className="mt-4 text-lg leading-relaxed text-slate-600 sm:text-xl">{blog.excerpt}</p>}
					<p className="mt-6 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
						{blog.author_name && (
							<>
								<span className="font-medium text-slate-700">{blog.author_name}</span>
								<span aria-hidden>·</span>
							</>
						)}
						<time dateTime={blog.published_at ?? undefined}>{formatDate(blog.published_at, { dateStyle: "long" })}</time>
						<span aria-hidden>·</span>
						<span>{readingMinutes(blog.content)} min read</span>
					</p>
				</header>

				{blog.cover_image_url && (
					<figure className="mx-auto mt-10 max-w-5xl px-4 sm:px-6">
						<div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#f4ebd9]">
							<Image src={blog.cover_image_url} alt={blog.cover_image_alt || blog.title} fill priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
						</div>
						{blog.cover_image_alt && <figcaption className="mt-3 text-center text-sm text-slate-500">{blog.cover_image_alt}</figcaption>}
					</figure>
				)}

				<div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
					<Markdown content={blog.content} />
				</div>
			</article>

			<div className="mx-auto max-w-3xl border-t border-amber-900/10 px-4 py-10 sm:px-6">
				<Link href="/blogs" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800">
					<ArrowLeft className="h-4 w-4" aria-hidden /> Back to all stories
				</Link>
			</div>
		</main>
	);
}
