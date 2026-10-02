import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOGS_PER_PAGE, getPublishedBlogs } from "@/lib/blogs";
import { SITE_NAME } from "@/lib/env";
import { BlogCard } from "@/components/blog/blog-card";
import { Pagination } from "@/components/admin/pagination";

// Always render from the database so newly published posts appear immediately.
export const dynamic = "force-dynamic";

const description = "Stories, updates and guides from Merkado PH — the Filipino marketplace, rebuilt for the way we shop today.";

export async function generateMetadata({ searchParams }: PageProps<"/blogs">): Promise<Metadata> {
	const page = Number((await searchParams).page) || 1;
	const title = page > 1 ? `Blog — Page ${page}` : "Blog";
	return {
		title,
		description,
		alternates: { canonical: page > 1 ? `/blogs?page=${page}` : "/blogs" },
		openGraph: { type: "website", title: `${title} | ${SITE_NAME}`, description, url: "/blogs", siteName: SITE_NAME },
		twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description },
	};
}

export default async function BlogsPage({ searchParams }: PageProps<"/blogs">) {
	const page = Math.max(1, Number((await searchParams).page) || 1);
	const { blogs, total } = await getPublishedBlogs(page);
	if (page > 1 && blogs.length === 0) notFound();

	const [featured, ...rest] = page === 1 ? blogs : [undefined, ...blogs];

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<header className="mb-10 max-w-2xl">
				<p className="text-sm font-semibold uppercase tracking-widest text-teal-700">The Merkado PH Blog</p>
				<h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Kwento mula sa Merkado</h1>
				<p className="mt-3 text-lg text-slate-600">{description}</p>
			</header>

			{blogs.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-amber-900/20 bg-white/60 px-6 py-20 text-center">
					<p className="text-lg font-medium text-slate-800">Our first stories are on the way.</p>
					<p className="mt-1 text-slate-500">Abangan! Check back soon.</p>
				</div>
			) : (
				<>
					{featured && (
						<div className="mb-8">
							<BlogCard blog={featured} featured />
						</div>
					)}
					{rest.length > 0 && (
						<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{rest.map((blog) => blog && <BlogCard key={blog.id} blog={blog} />)}
						</div>
					)}
					<div className="mt-12">
						<Pagination page={page} perPage={BLOGS_PER_PAGE} total={total} basePath="/blogs" />
					</div>
				</>
			)}
		</main>
	);
}
