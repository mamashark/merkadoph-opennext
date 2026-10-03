import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOGS_PER_PAGE, getPublishedBlogs } from "@/lib/blogs";
import { pageParam } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { pageMetadata } from "@/lib/seo";
import { ContentCard, EmptyNotice, PageIntro } from "@/components/site/content-card";
import { Pagination } from "@/components/admin/pagination";

// Renders per request (it reads the tab/page from the URL); the data itself comes from the cache.

const description = "Guides, stories and news from Merkado PH — roofing and home tips for Sweden, and life in our Filipino-Swedish community.";

export async function generateMetadata({ searchParams }: PageProps<"/blogs">): Promise<Metadata> {
	const page = pageParam(await searchParams);
	return pageMetadata({ title: page > 1 ? `Blog — Page ${page}` : "Blog", description, path: page > 1 ? `/blogs?page=${page}` : "/blogs" });
}

export default async function BlogsPage({ searchParams }: PageProps<"/blogs">) {
	const page = pageParam(await searchParams);
	const { blogs, total } = await getPublishedBlogs(page);
	if (page > 1 && blogs.length === 0) notFound();

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<PageIntro eyebrow="The Merkado PH Blog" title="Kwento mula sa Merkado" description={description} />

			{blogs.length === 0 ? (
				<EmptyNotice title="Our first stories are on the way." description="Abangan! Check back soon." />
			) : (
				<>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{blogs.map((blog, i) => {
							const featured = page === 1 && i === 0;
							return (
								<div key={blog.id} className={featured ? "sm:col-span-2 lg:col-span-3" : undefined}>
									<ContentCard
										href={`/blogs/${blog.slug}`}
										title={blog.title}
										excerpt={blog.excerpt}
										image={blog.cover_image_url}
										imageAlt={blog.cover_image_alt}
										eyebrow={blog.tags.slice(0, 2).join(" · ") || undefined}
										featured={featured}
										priority={i === 0}
										meta={
											<>
												<time dateTime={blog.published_at ?? undefined}>{formatDate(blog.published_at, { dateStyle: "long" })}</time>
												{blog.author_name && <> · {blog.author_name}</>}
											</>
										}
									/>
								</div>
							);
						})}
					</div>
					<div className="mt-12">
						<Pagination page={page} perPage={BLOGS_PER_PAGE} total={total} basePath="/blogs" />
					</div>
				</>
			)}
		</main>
	);
}
