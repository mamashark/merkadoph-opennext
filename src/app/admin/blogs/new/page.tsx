import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { BlogForm } from "../blog-form";

export const metadata: Metadata = { title: "New post" };

export default async function NewBlogPage() {
	const me = await requireAdmin();

	return (
		<>
			<PageHeader
				title="New post"
				description="Write a story for the Merkado PH blog."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Blogs", href: "/admin/blogs" },
					{ label: "New post" },
				]}
			/>
			<BlogForm defaultAuthor={me.name} />
		</>
	);
}
