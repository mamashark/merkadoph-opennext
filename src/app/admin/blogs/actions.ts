"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
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
	redirect(`/admin/blogs/${savedId}/edit?notice=${notice}`);
}

export async function deleteBlog(formData: FormData) {
	await requireAdmin();
	const { slug, error } = await deleteRow("blogs", text(formData, "id", 64));
	if (error) redirect(`/admin/blogs?error=${encodeURIComponent(error)}`);
	revalidateContent("/blogs", "/admin/blogs", [slug]);
	redirect("/admin/blogs?notice=deleted");
}
