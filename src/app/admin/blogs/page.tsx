import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { deleteBlog } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { adminListBlogs } from "@/lib/blogs";
import { contentState, pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState, RowActions, Thumb } from "@/components/admin/row-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { STATE_FILTER } from "@/components/admin/filters";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass, cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Blogs" };

const PER_PAGE = 20;

export default async function BlogsAdminPage({ searchParams }: PageProps<"/admin/blogs">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), status: param(params, "status"), sort: param(params, "sort") };
	const page = pageParam(params);

	const { blogs, total } = await adminListBlogs({ ...values, page, perPage: PER_PAGE });
	const filtered = !!(values.q || values.status);

	return (
		<>
			<PageHeader
				title="Blogs"
				description="Create, schedule and publish posts for the public blog."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Blogs" }]}
				actions={
					<Link href="/admin/blogs/new" className={buttonClass("primary")}>
						<Plus className="h-4 w-4" aria-hidden /> New post
					</Link>
				}
			/>

			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice") === "deleted" ? "Post deleted." : undefined} error={param(params, "error")} />

				<div className={cardClass}>
					<ListToolbar
						basePath="/admin/blogs"
						values={values}
						searchPlaceholder="Search title or author…"
						filters={[STATE_FILTER]}
						sorts={[
							{ label: "Last updated", value: "" },
							{ label: "Publish date", value: "published" },
							{ label: "Date created", value: "created" },
							{ label: "Title A–Z", value: "title" },
						]}
					/>

					{blogs.length === 0 ? (
						<EmptyState
							icon={FileText}
							title={filtered ? "No posts match your filters" : "No posts yet"}
							description={filtered ? "Try a different search or filter." : "Your first story is one click away."}
							action={
								!filtered && (
									<Link href="/admin/blogs/new" className={buttonClass("primary")}>
										<Plus className="h-4 w-4" aria-hidden /> Write a post
									</Link>
								)
							}
						/>
					) : (
						<ul className="divide-y divide-slate-100 dark:divide-slate-800">
							{blogs.map((blog) => (
								<li key={blog.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
									<Thumb src={blog.cover_image_url} icon={FileText} />
									<div className="min-w-0 flex-1">
										<Link href={`/admin/blogs/${blog.id}/edit`} className="block truncate font-medium text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300">
											{blog.title}
										</Link>
										<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
											<StatusBadge row={blog} />
											{blog.author_name && <span>by {blog.author_name}</span>}
											<span>Published {formatDate(blog.published_at)}</span>
											<span className="hidden md:inline">Created {formatDate(blog.created_at)}</span>
											<span className="hidden md:inline">Updated {formatDate(blog.updated_at)}</span>
										</div>
									</div>
									<RowActions
										label={blog.title}
										id={blog.id}
										editHref={`/admin/blogs/${blog.id}/edit`}
										viewHref={contentState(blog) === "published" ? `/blogs/${blog.slug}` : null}
										deleteAction={deleteBlog}
									/>
								</li>
							))}
						</ul>
					)}
				</div>

				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/blogs" params={listParams(values)} />
			</div>
		</>
	);
}
