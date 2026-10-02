import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteBlog } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { adminListBlogs, formatDate } from "@/lib/blogs";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { FlashMessage } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { buttonClass, cardClass, cn, inputClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Blogs" };

const PER_PAGE = 20;
const notices: Record<string, string> = { deleted: "Post deleted." };
const filters = [
	{ label: "All", value: "" },
	{ label: "Published", value: "published" },
	{ label: "Drafts", value: "draft" },
];

export default async function BlogsAdminPage({ searchParams }: PageProps<"/admin/blogs">) {
	await requireAdmin();
	const params = await searchParams;
	const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
	const q = str("q").trim();
	const status = str("status");
	const page = Math.max(1, Number(str("page")) || 1);

	const { blogs, total } = await adminListBlogs({ q, status, page, perPage: PER_PAGE });
	const filterHref = (value: string) => {
		const qs = new URLSearchParams({ ...(q ? { q } : {}), ...(value ? { status: value } : {}) });
		return qs.size ? `/admin/blogs?${qs}` : "/admin/blogs";
	};

	return (
		<>
			<PageHeader
				title="Blogs"
				description="Create, edit and publish posts for the public blog."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Blogs" }]}
				actions={
					<Link href="/admin/blogs/new" className={buttonClass("primary")}>
						<Plus className="h-4 w-4" aria-hidden /> New post
					</Link>
				}
			/>

			<div className="space-y-4">
				<FlashMessage notice={notices[str("notice")]} error={str("error")} />

				<div className={cardClass}>
					<div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
							{filters.map((f) => (
								<Link
									key={f.label}
									href={filterHref(f.value)}
									className={cn("rounded-md px-3 py-1.5 font-medium", status === f.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900")}
								>
									{f.label}
								</Link>
							))}
						</div>
						<form role="search" className="relative sm:w-72">
							{status && <input type="hidden" name="status" value={status} />}
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
							<input type="search" name="q" defaultValue={q} placeholder="Search titles…" aria-label="Search posts" className={`${inputClass} pl-9`} />
						</form>
					</div>

					{blogs.length === 0 ? (
						<div className="flex flex-col items-center px-6 py-16 text-center">
							<span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
								<FileText className="h-6 w-6" aria-hidden />
							</span>
							<p className="mt-3 text-sm font-medium text-slate-800">{q || status ? "No posts match your filters" : "No posts yet"}</p>
							<p className="mt-1 text-sm text-slate-500">{q || status ? "Try a different search." : "Your first story is one click away."}</p>
							{!q && !status && (
								<Link href="/admin/blogs/new" className={buttonClass("primary", "md", "mt-5")}>
									<Plus className="h-4 w-4" aria-hidden /> Write a post
								</Link>
							)}
						</div>
					) : (
						<ul className="divide-y divide-slate-100">
							{blogs.map((blog) => (
								<li key={blog.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/60">
									<div className="hidden h-14 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100 sm:block">
										{blog.cover_image_url ? (
											// eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
											<img src={blog.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
										) : (
											<div className="flex h-full items-center justify-center text-slate-300">
												<FileText className="h-5 w-5" aria-hidden />
											</div>
										)}
									</div>
									<div className="min-w-0 flex-1">
										<Link href={`/admin/blogs/${blog.id}/edit`} className="block truncate font-medium text-slate-900 hover:text-teal-700">
											{blog.title}
										</Link>
										<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
											<span
												className={cn(
													"rounded-full px-2 py-0.5 font-medium",
													blog.status === "published" ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
												)}
											>
												{blog.status === "published" ? "Published" : "Draft"}
											</span>
											<span className="truncate">/blogs/{blog.slug}</span>
											<span>Updated {formatDate(blog.updated_at)}</span>
											{blog.author_name && <span className="hidden md:inline">by {blog.author_name}</span>}
										</div>
									</div>
									<div className="flex shrink-0 items-center gap-1.5">
										{blog.status === "published" && (
											<a
												href={`/blogs/${blog.slug}`}
												target="_blank"
												rel="noreferrer"
												className={buttonClass("secondary", "icon")}
												aria-label={`View ${blog.title}`}
												title="View live"
											>
												<ExternalLink className="h-4 w-4" aria-hidden />
											</a>
										)}
										<Link href={`/admin/blogs/${blog.id}/edit`} className={buttonClass("secondary", "icon")} aria-label={`Edit ${blog.title}`} title="Edit">
											<Pencil className="h-4 w-4" aria-hidden />
										</Link>
										<form action={deleteBlog}>
											<input type="hidden" name="id" value={blog.id} />
											<ConfirmButton
												message={`Delete “${blog.title}”? This cannot be undone.`}
												label="Delete post"
												variant="secondary"
												size="icon"
												className="hover:border-red-200 hover:bg-red-50 hover:text-red-600"
											>
												<Trash2 className="h-4 w-4" aria-hidden />
											</ConfirmButton>
										</form>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>

				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/blogs" params={{ ...(q ? { q } : {}), ...(status ? { status } : {}) }} />
			</div>
		</>
	);
}
