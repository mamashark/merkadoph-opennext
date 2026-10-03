"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { fromDateTimeInput } from "@/lib/datetime";
import { commonFields, deleteRow, fetchExisting, optional, optionalUrl, resolvePublishing, revalidateContent, text, uniqueSlug, upsertRow } from "@/lib/content-server";

export async function saveEvent(formData: FormData) {
	const user = await requireAdmin();
	const id = text(formData, "id", 64) || undefined;
	const fields = commonFields(formData);
	if (!fields.title) throw new Error("Title is required.");

	const starts_at = fromDateTimeInput(formData.get("starts_at"));
	const ends_at = fromDateTimeInput(formData.get("ends_at"));
	if (!starts_at) throw new Error("Start date and time are required.");
	if (ends_at && ends_at < starts_at) throw new Error("The event can't end before it starts.");

	const existing = await fetchExisting("events", id);
	const slug = await uniqueSlug("events", text(formData, "slug", 80) || fields.title, id);
	const { status, published_at, notice } = resolvePublishing(formData, existing);

	const savedId = await upsertRow(
		"events",
		id,
		{
			...fields,
			slug,
			status,
			published_at,
			starts_at,
			ends_at,
			venue_name: optional(text(formData, "venue_name", 200)),
			venue_address: optional(text(formData, "venue_address", 300)),
			map_url: optionalUrl(formData, "map_url"),
			organizer: optional(text(formData, "organizer", 120)),
			price_info: optional(text(formData, "price_info", 120)),
			registration_url: optionalUrl(formData, "registration_url"),
		},
		{ author_id: user.id },
	);

	revalidateContent("/events", "/admin/events", [slug, existing?.slug]);
	redirect(`/admin/events/${savedId}/edit?notice=${notice}`);
}

export async function deleteEvent(formData: FormData) {
	await requireAdmin();
	const { slug, error } = await deleteRow("events", text(formData, "id", 64));
	if (error) redirect(`/admin/events?error=${encodeURIComponent(error)}`);
	revalidateContent("/events", "/admin/events", [slug]);
	redirect("/admin/events?notice=deleted");
}
