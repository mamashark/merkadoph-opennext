"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { SUPABASE_URL } from "@/lib/env";
import { commonFields, deleteRow, fetchExisting, optional, resolvePublishing, revalidateContent, text, uniqueSlug, upsertRow } from "@/lib/content-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID, uuidSchema } from "@/lib/validation";
import type { PortfolioImage } from "@/lib/portfolio";
import { adminIsBlogMoved } from "@/lib/blogs";

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

/** The linked blog post's id, or null when the field is empty, malformed, the post doesn't exist, or its URL redirects
 *  elsewhere (`moved`: linking it would send "Read the story" back here). A database error stops the save instead,
 *  so a hiccup never silently removes an existing link. */
async function readBlogId(raw: FormDataEntryValue | null): Promise<{ id: string | null; moved: boolean }> {
	const parsed = uuidSchema.safeParse(String(raw ?? ""));
	if (!parsed.success) return { id: null, moved: false };
	const { data, error } = await createAdminClient().from("blogs").select("slug").eq("id", parsed.data).maybeSingle();
	if (error) throw new Error("Couldn't check the linked blog post. Try saving again.");
	if (!data) return { id: null, moved: false };
	const moved = await adminIsBlogMoved(String(data.slug)).catch(() => {
		throw new Error("Couldn't check the linked blog post. Try saving again.");
	});
	return moved ? { id: null, moved: true } : { id: parsed.data, moved: false };
}

/** The entry's current blog link (for refreshing the old post's page). Errors are logged, not fatal. */
async function currentBlogId(id: string): Promise<string | null> {
	const { data, error } = await createAdminClient().from("portfolios").select("blog_id").eq("id", id).maybeSingle();
	if (error) console.error("portfolio: couldn't read previous blog link", error.message);
	return (data?.blog_id as string | null | undefined) ?? null;
}

/** The linked post's page shows a "See the photos" card for this entry, so refresh it (old and new link). */
async function revalidateLinkedBlogs(ids: Array<string | null | undefined>) {
	const wanted = Array.from(new Set(ids.filter((v): v is string => !!v)));
	if (!wanted.length) return;
	const { data, error } = await createAdminClient().from("blogs").select("slug").in("id", wanted);
	if (error) console.error("portfolio: couldn't refresh linked blog pages", error.message);
	for (const row of data ?? []) revalidatePath(`/blogs/${row.slug}`);
}

export async function savePortfolio(formData: FormData) {
	const user = await requireAdmin();
	const id = text(formData, "id", 64) || undefined;
	const fields = commonFields(formData);
	if (!fields.title) throw new Error("Title is required.");

	const images = readImages(formData.get("images"));
	const existing = await fetchExisting("portfolios", id);
	const [link, previousBlogId] = await Promise.all([readBlogId(formData.get("blog_id")), id ? currentBlogId(id) : null]);
	const blog_id = link.id;
	const slug = await uniqueSlug("portfolios", text(formData, "slug", 80) || fields.title, id);
	const resolved = resolvePublishing(formData, existing);
	// Publish rules. If one isn't met we still save (as a draft, or keeping the current status) so nothing
	// typed is lost, and show what to fix — a thrown error would only show "Something went wrong" in production.
	const missingAlt = images.filter((img) => !img.alt).length;
	const problem =
		resolved.status !== "published"
			? null
			: !dateOnly(formData.get("completed_on"))
				? "Add the date it took place before publishing — it puts the entry under its year."
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
			blog_id,
		},
		{ author_id: user.id },
	);

	revalidateContent("/portfolio", "/admin/portfolio", [slug, existing?.slug]);
	await revalidateLinkedBlogs([blog_id, previousBlogId]);
	const linkProblem = link.moved ? "The related blog post was removed: its page redirects elsewhere (it was moved), so the link would lead back here. Pick another post." : null;
	const errors = [problem && `Saved, but not published. ${problem}`, linkProblem && (problem ? linkProblem : `Saved. ${linkProblem}`)].filter(Boolean).join(" ");
	redirect(`/admin/portfolio/${savedId}/edit?${new URLSearchParams(errors ? { error: errors } : { notice: notice ?? "saved" })}`);
}

export async function deletePortfolio(formData: FormData) {
	await requireAdmin();
	const id = text(formData, "id", 64);
	const linked = UUID.test(id) ? await currentBlogId(id) : null;
	const { slug, error } = await deleteRow("portfolios", id);
	if (error) redirect(`/admin/portfolio?error=${encodeURIComponent(error)}`);
	revalidateContent("/portfolio", "/admin/portfolio", [slug]);
	await revalidateLinkedBlogs([linked]);
	redirect("/admin/portfolio?notice=deleted");
}
