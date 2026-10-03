"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { fromDateTimeInput } from "@/lib/datetime";
import { commonFields, deleteRow, fetchExisting, optional, optionalUrl, resolvePublishing, revalidateContent, text, uniqueSlug, upsertRow } from "@/lib/content-server";

export async function savePromotion(formData: FormData) {
	const user = await requireAdmin();
	const id = text(formData, "id", 64) || undefined;
	const fields = commonFields(formData);
	if (!fields.title) throw new Error("Title is required.");

	const starts_at = fromDateTimeInput(formData.get("starts_at"));
	const ends_at = fromDateTimeInput(formData.get("ends_at"));
	if (starts_at && ends_at && ends_at < starts_at) throw new Error("The promotion can't end before it starts.");

	const existing = await fetchExisting("promotions", id);
	const slug = await uniqueSlug("promotions", text(formData, "slug", 80) || fields.title, id);
	const { status, published_at, notice } = resolvePublishing(formData, existing);

	const savedId = await upsertRow(
		"promotions",
		id,
		{
			...fields,
			slug,
			status,
			published_at,
			starts_at,
			ends_at,
			discount_label: optional(text(formData, "discount_label", 40)),
			promo_code: optional(text(formData, "promo_code", 40).toUpperCase()),
			terms: optional(text(formData, "terms", 4000)),
			cta_label: optional(text(formData, "cta_label", 40)),
			cta_url: optionalUrl(formData, "cta_url"),
		},
		{ author_id: user.id },
	);

	revalidateContent("/promotions", "/admin/promotions", [slug, existing?.slug]);
	redirect(`/admin/promotions/${savedId}/edit?notice=${notice}`);
}

export async function deletePromotion(formData: FormData) {
	await requireAdmin();
	const { slug, error } = await deleteRow("promotions", text(formData, "id", 64));
	if (error) redirect(`/admin/promotions?error=${encodeURIComponent(error)}`);
	revalidateContent("/promotions", "/admin/promotions", [slug]);
	redirect("/admin/promotions?notice=deleted");
}
