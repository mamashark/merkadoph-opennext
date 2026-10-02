import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { deleteBlog } from "../../actions";
import { BlogForm } from "../../blog-form";
import { requireAdmin } from "@/lib/auth";
import { adminGetBlog } from "@/lib/blogs";
import { PageHeader } from "@/components/admin/page-header";
import { FlashMessage } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { buttonClass, cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Edit post" };

const notices: Record<string, string> = {
	created: "Draft created.",
	saved: "Changes saved.",
	published: "Post published — it's now live on the blog.",
	unpublished: "Post reverted to draft and hidden from the blog.",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditBlogPage({ params, searchParams }: PageProps<"/admin/blogs/[id]/edit">) {
	await requireAdmin();
	const { id } = await params;
	const { notice } = await searchParams;
	if (!UUID.test(id)) notFound();

	const blog = await adminGetBlog(id);
	if (!blog) notFound();

	return (
		<>
			<PageHeader
				title={blog.title}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Blogs", href: "/admin/blogs" },
					{ label: "Edit" },
				]}
				actions={
					blog.status === "published" && (
						<a href={`/blogs/${blog.slug}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
							<ExternalLink className="h-4 w-4" aria-hidden /> View live
						</a>
					)
				}
			/>

			<div className="mb-6">
				<FlashMessage notice={typeof notice === "string" ? notices[notice] : undefined} />
			</div>

			<BlogForm key={blog.updated_at} blog={blog} />

			<section className={`${cardClass} mt-8 flex flex-col gap-4 border-red-200 p-5 sm:flex-row sm:items-center sm:justify-between`}>
				<div>
					<h2 className="text-sm font-semibold text-slate-900">Delete this post</h2>
					<p className="mt-0.5 text-sm text-slate-500">This permanently removes the post. Images stay in the media library.</p>
				</div>
				<form action={deleteBlog}>
					<input type="hidden" name="id" value={blog.id} />
					<ConfirmButton message={`Delete “${blog.title}”? This cannot be undone.`}>
						<Trash2 className="h-4 w-4" aria-hidden /> Delete post
					</ConfirmButton>
				</form>
			</section>
		</>
	);
}
