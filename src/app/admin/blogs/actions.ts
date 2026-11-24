"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { adminImpactSlugsForBlog } from "@/lib/portfolio";
import { commonFields, deleteRow, fetchExisting, optional, resolvePublishing, revalidateContent, text, uniqueSlug, upsertRow } from "@/lib/content-server";

export async function saveBlog(formData: FormData) {
	const user = await requireAdmin();
	const id = text(formData, "id", 64) || undefined;
	const fields = commonFields(formData);
	if (!fields.title) throw new Error("Title is required.");

	const existing = await fetchExisting("blogs", id);
	const slug = await uniqueSlug("blogs", text(formData, "slug", 80) || fields.title, id);
	const { status, published_at, notice } = resolvePublishing(formData, existing);

	const savedId = await upsertRow(
		"blogs",
		id,
		{ ...fields, slug, status, published_at, author_name: optional(text(formData, "author_name", 120)) },
		{ author_id: user.id },
	);

	revalidateContent("/blogs", "/admin/blogs", [slug, existing?.slug]);
	await revalidateLinkedImpact(savedId);
	redirect(`/admin/blogs/${savedId}/edit?notice=${notice}`);
}

export async function deleteBlog(formData: FormData) {
	await requireAdmin();
	const id = text(formData, "id", 64);
	// Look up linked entries first: deleting the post clears their link (on delete set null).
	const impactSlugs = await adminImpactSlugsForBlog(id).catch((e) => (console.error("blogs: couldn't read linked entries", e), [] as string[]));
	const { slug, error } = await deleteRow("blogs", id);
	if (error) redirect(`/admin/blogs?error=${encodeURIComponent(error)}`);
	revalidateContent("/blogs", "/admin/blogs", [slug]);
	for (const s of impactSlugs) revalidatePath(`/impact/${s}`);
	redirect("/admin/blogs?notice=deleted");
}

/** Community Impact entries linked to this post show its title and link ("Read the story"): refresh their pages. */
async function revalidateLinkedImpact(blogId: string) {
	const slugs = await adminImpactSlugsForBlog(blogId).catch((e) => (console.error("blogs: couldn't read linked entries", e), [] as string[]));
	for (const s of slugs) revalidatePath(`/impact/${s}`);
}
