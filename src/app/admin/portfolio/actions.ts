"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { SUPABASE_URL } from "@/lib/env";
import { commonFields, deleteRow, fetchExisting, optional, resolvePublishing, revalidateContent, text, uniqueSlug, upsertRow } from "@/lib/content-server";
import type { PortfolioImage } from "@/lib/portfolio";

const MAX_IMAGES = 40;
/** Only images from our media library (Supabase Storage) — they're what next/image is allowed to load. */
const MEDIA_PREFIX = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/`;

function readImages(raw: FormDataEntryValue | null): PortfolioImage[] {
	try {
		const parsed = JSON.parse(String(raw ?? "[]"));
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((g) => g && typeof g.url === "string" && g.url.startsWith(MEDIA_PREFIX) && g.url.length <= 1000)
			.slice(0, MAX_IMAGES)
			.map((g) => ({
				url: String(g.url),
				alt: String(g.alt ?? "").trim().slice(0, 200),
				description: String(g.description ?? "").trim().slice(0, 500),
			}));
	} catch {
		return [];
	}
}

/** "YYYY-MM-DD" or null. */
function dateOnly(value: FormDataEntryValue | null): string | null {
	const v = String(value ?? "").trim();
	return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
}

export async function savePortfolio(formData: FormData) {
	const user = await requireAdmin();
	const id = text(formData, "id", 64) || undefined;
	const fields = commonFields(formData);
	if (!fields.title) throw new Error("Title is required.");

	const images = readImages(formData.get("images"));
	const existing = await fetchExisting("portfolios", id);
	const slug = await uniqueSlug("portfolios", text(formData, "slug", 80) || fields.title, id);
	const resolved = resolvePublishing(formData, existing);
	// Publish rules. If one isn't met we still save (as a draft, or keeping the current status) so nothing
	// typed is lost, and show what to fix — a thrown error would only show "Something went wrong" in production.
	const missingAlt = images.filter((img) => !img.alt).length;
	const problem =
		resolved.status !== "published"
			? null
			: images.length === 0
				? "Add at least one image before publishing."
				: missingAlt
					? `Add alt text to ${missingAlt === 1 ? "1 image" : `${missingAlt} images`} before publishing — it describes the photo for screen readers and Google.`
					: null;
	const status = problem ? (existing?.status ?? "draft") : resolved.status;
	const published_at = problem ? (existing?.published_at ?? null) : resolved.published_at;
	const notice = problem ? null : resolved.notice;

	const savedId = await upsertRow(
		"portfolios",
		id,
		{
			...fields,
			slug,
			status,
			published_at,
			images,
			location: optional(text(formData, "location", 120)),
			completed_on: dateOnly(formData.get("completed_on")),
		},
		{ author_id: user.id },
	);

	revalidateContent("/portfolio", "/admin/portfolio", [slug, existing?.slug]);
	redirect(`/admin/portfolio/${savedId}/edit?${new URLSearchParams(problem ? { error: `Saved, but not published. ${problem}` } : { notice: notice ?? "saved" })}`);
}

export async function deletePortfolio(formData: FormData) {
	await requireAdmin();
	const { slug, error } = await deleteRow("portfolios", text(formData, "id", 64));
	if (error) redirect(`/admin/portfolio?error=${encodeURIComponent(error)}`);
	revalidateContent("/portfolio", "/admin/portfolio", [slug]);
	redirect("/admin/portfolio?notice=deleted");
}
