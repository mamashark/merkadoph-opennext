import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pin } from "lucide-react";
import { BLOGS_PER_PAGE, getBlogTags, getPublishedBlogByTitle, getPublishedBlogs, PINNED_BLOG_TITLE, type BlogSummary } from "@/lib/blogs";
import { pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { pageMetadata } from "@/lib/seo";
import { ChipFilter, ContentCard, EmptyNotice, PageIntro, Pill } from "@/components/site/content-card";
import { Pagination } from "@/components/admin/pagination";

// Renders per request (it reads the tag/page from the URL); the data itself comes from the cache.

const description = "Guides, stories and news from Merkado PH — roofing and home tips for Sweden, and life in our Filipino-Swedish community.";

/** Only known tags filter the list; anything else shows every post. */
async function readFilters(searchParams: PageProps<"/blogs">["searchParams"]) {
	const params = await searchParams;
	const tags = await getBlogTags().catch((): string[] => []);
	return { tags, tag: tags.includes(param(params, "tag")) ? param(params, "tag") : "", page: pageParam(params) };
}

const listHref = (tag: string, page = 1) => {
	const qs = new URLSearchParams({ ...(tag ? { tag } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString();
	return qs ? `/blogs?${qs}` : "/blogs";
};

export async function generateMetadata({ searchParams }: PageProps<"/blogs">): Promise<Metadata> {
	const { tag, page } = await readFilters(searchParams);
	return pageMetadata({ title: `Blog${tag ? `: ${tag}` : ""}${page > 1 ? ` — Page ${page}` : ""}`, description, path: listHref(tag, page) });
}

export default async function BlogsPage({ searchParams }: PageProps<"/blogs">) {
	const { tags, tag, page } = await readFilters(searchParams);
	// The pinned post leads page 1 and is left out of the paged list, so it never moves or repeats.
	const pinned = await getPublishedBlogByTitle(PINNED_BLOG_TITLE).catch(() => null);
	const { blogs, total } = await getPublishedBlogs(page, BLOGS_PER_PAGE, { tag: tag || undefined, excludeId: pinned?.id });
	if (page > 1 && blogs.length === 0) notFound();
	const showPinned = pinned && page === 1 && (!tag || pinned.tags.includes(tag));
	const lead = showPinned ? pinned : page === 1 ? blogs[0] : undefined;
	const rest = lead && !showPinned ? blogs.slice(1) : blogs;

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<PageIntro eyebrow="The Merkado PH Blog" title="Kwento mula sa Merkado" description={description} />

			{tags.length > 0 && <ChipFilter label="Filter posts by tag" allLabel="All posts" items={tags} current={tag} href={(t) => listHref(t)} />}

			{!lead && rest.length === 0 ? (
				<EmptyNotice
					title={tag ? `No posts tagged “${tag}” yet.` : "Our first stories are on the way."}
					description={tag ? "Try another tag, or browse all posts." : "Abangan! Check back soon."}
				/>
			) : (
				<>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{lead && (
							<div className="sm:col-span-2 lg:col-span-3">
								<BlogCard blog={lead} featured pinned={!!showPinned} priority />
							</div>
						)}
						{rest.map((blog, i) => (
							<BlogCard key={blog.id} blog={blog} priority={!lead && i === 0} />
						))}
					</div>
					<div className="mt-12">
						<Pagination page={page} perPage={BLOGS_PER_PAGE} total={total} basePath="/blogs" params={tag ? { tag } : {}} />
					</div>
				</>
			)}
		</main>
	);
}

function BlogCard({ blog, featured = false, pinned = false, priority = false }: { blog: BlogSummary; featured?: boolean; pinned?: boolean; priority?: boolean }) {
	return (
		<ContentCard
			href={`/blogs/${blog.slug}`}
			title={blog.title}
			excerpt={blog.excerpt}
			image={blog.cover_image_url}
			imageAlt={blog.cover_image_alt}
			eyebrow={blog.tags.slice(0, 2).join(" · ") || undefined}
			featured={featured}
			priority={priority}
			badge={
				pinned ? (
					<Pill tone="accent">
						<span className="inline-flex items-center gap-1">
							<Pin className="h-3.5 w-3.5 fill-current" aria-hidden /> Pinned
						</span>
					</Pill>
				) : undefined
			}
			meta={
				<>
					<time dateTime={blog.published_at ?? undefined}>{formatDate(blog.published_at, { dateStyle: "long" })}</time>
					{blog.author_name && <> · {blog.author_name}</>}
				</>
			}
		/>
	);
}
