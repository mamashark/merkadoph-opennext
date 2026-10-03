"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { commonFields, deleteRow, fetchExisting, optional, optionalUrl, resolvePublishing, revalidateContent, text, uniqueSlug, upsertRow } from "@/lib/content-server";

export async function saveService(formData: FormData) {
	const user = await requireAdmin();
	const id = text(formData, "id", 64) || undefined;
	const fields = commonFields(formData);
	if (!fields.title) throw new Error("Title is required.");

	const existing = await fetchExisting("services", id);
	const slug = await uniqueSlug("services", text(formData, "slug", 80) || fields.title, id);
	const { status, published_at, notice } = resolvePublishing(formData, existing);
	const sortOrder = Math.trunc(Number(formData.get("sort_order")));

	const savedId = await upsertRow(
		"services",
		id,
		{
			...fields,
			slug,
			status,
			published_at,
			category: optional(text(formData, "category", 60)),
			price_label: optional(text(formData, "price_label", 80)),
			cta_label: optional(text(formData, "cta_label", 40)),
			cta_url: optionalUrl(formData, "cta_url"),
			is_featured: formData.get("is_featured") === "on",
			sort_order: Number.isFinite(sortOrder) ? Math.max(-9999, Math.min(9999, sortOrder)) : 0,
		},
		{ author_id: user.id },
	);

	revalidateContent("/services", "/admin/services", [slug, existing?.slug]);
	redirect(`/admin/services/${savedId}/edit?notice=${notice}`);
}

export async function deleteService(formData: FormData) {
	await requireAdmin();
	const { slug, error } = await deleteRow("services", text(formData, "id", 64));
	if (error) redirect(`/admin/services?error=${encodeURIComponent(error)}`);
	revalidateContent("/services", "/admin/services", [slug]);
	redirect("/admin/services?notice=deleted");
}
