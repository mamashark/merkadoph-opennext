import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { deleteBlog } from "../../actions";
import { BlogForm } from "../../blog-form";
import { requireAdmin } from "@/lib/auth";
import { adminGetBlog } from "@/lib/blogs";
import { contentState } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { DangerZone, saveNotices, UUID } from "@/components/admin/form-parts";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Edit post" };

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
					contentState(blog) === "published" && (
						<a href={`/blogs/${blog.slug}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
							<ExternalLink className="h-4 w-4" aria-hidden /> View live
						</a>
					)
				}
			/>
			<div className="mb-6">
				<FlashMessage notice={typeof notice === "string" ? saveNotices[notice] : undefined} />
			</div>
			<BlogForm key={blog.updated_at} blog={blog} />
			<DangerZone
				title="Delete this post"
				description="This permanently removes the post. Images stay in the media library."
				confirm={`Delete “${blog.title}”? This cannot be undone.`}
				action={deleteBlog}
				id={blog.id}
			/>
		</>
	);
}
