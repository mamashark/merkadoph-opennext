"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { adminImpactSlugsForBlog } from "@/lib/portfolio";
import { blogPhotoSchema, commonFields, deleteRow, fetchExisting, mediaUrl, optional, readGallery, resolvePublishing, revalidateContent, text, uniqueSlug, upsertRow } from "@/lib/content-server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
	CAPTION_MAX,
	isPhotoLayout,
	MAX_SLIDESHOW,
	PROBLEM_PART,
	shownLayoutPhotos,
	type BlogPhoto,
	type PhotoLayout,
	type PublishProblem,
} from "@/lib/blog-layout";

/** The A / B photo slots (media library URLs only), by position: an empty slot is kept as an empty entry so the
 *  other slot never moves into its place; trailing empty slots are dropped. */
function readLayoutPhotos(formData: FormData): BlogPhoto[] {
	const slots = [0, 1].map((i) => {
		const r = blogPhotoSchema.safeParse({ url: formData.get(`layout_url_${i}`), alt: formData.get(`layout_alt_${i}`), caption: formData.get(`layout_caption_${i}`) });
		return r.success ? r.data : { url: "", alt: "", caption: "" };
	});
	while (slots.length && !slots[slots.length - 1].url) slots.pop();
	return slots;
}

type Media = { photo_layout: PhotoLayout; layout_photos: BlogPhoto[]; slideshow: BlogPhoto[]; video_url: string | null; video_poster_url: string | null; video_transcript: string | null };

/** What still blocks publishing under the approved rules (empty = none). */
function publishProblems(m: Media): PublishProblem[] {
	const problems: PublishProblem[] = [];
	const shown = shownLayoutPhotos(m.photo_layout, m.layout_photos);
	if (m.photo_layout === "B" && shown.length < 2) problems.push("layout-two");
	if (shown.some((p) => !p.alt)) problems.push("layout-alt");
	if (m.slideshow.some((p) => !p.caption)) problems.push("row-caption");
	if (m.video_url && !m.video_transcript) problems.push("video-transcript"); // Kay, 2026-11-25 (WCAG 1.2.2)
	return problems;
}

/** The media columns as they are now (for a live post whose new version breaks a rule). */
async function liveMedia(id: string): Promise<Media> {
	const { data, error } = await createAdminClient().from("blogs").select("photo_layout,layout_photos,slideshow,video_url,video_poster_url,video_transcript").eq("id", id).single();
	if (error || !data) throw new Error("Couldn't read the live version of this post. Try saving again.");
	return data as Media;
}

export async function saveBlog(formData: FormData) {
	const user = await requireAdmin();
	const id = text(formData, "id", 64) || undefined;
	const fields = commonFields(formData);
	if (!fields.title) throw new Error("Title is required.");

	const existing = await fetchExisting("blogs", id);
	const slug = await uniqueSlug("blogs", text(formData, "slug", 80) || fields.title, id);
	const resolved = resolvePublishing(formData, existing);

	const layoutRaw = text(formData, "photo_layout", 8);
	const video_url = mediaUrl(formData, "video_url");
	let media: Media = {
		photo_layout: isPhotoLayout(layoutRaw) ? layoutRaw : "A",
		layout_photos: readLayoutPhotos(formData),
		// GalleryField sends the caption as `description`; alt may be empty when the caption describes the photo.
		slideshow: readGallery(formData.get("slideshow"), MAX_SLIDESHOW).map((g) => ({ url: g.url, alt: g.alt, caption: g.description.slice(0, CAPTION_MAX) })),
		video_url,
		video_poster_url: video_url ? mediaUrl(formData, "video_poster_url") : null,
		video_transcript: video_url ? optional(text(formData, "video_transcript", 5000)) : null,
	};

	// Publish rules (approved mock-up + Kay 2026-11-25). Nothing typed is lost:
	// - a draft that can't be published yet is saved as a draft, with the reasons;
	// - a post that is already live stays live: each part that breaks a rule (layout photos, photo row, video) keeps
	//   its live version, everything else is saved, and the message says which parts weren't updated (Arvid M1).
	const problems = resolved.status === "published" ? publishProblems(media) : [];
	const wasLive = existing?.status === "published";
	let status = resolved.status, published_at = resolved.published_at;
	const kept = new Set<"layout" | "row" | "video">();
	if (problems.length && wasLive && id) {
		const live = await liveMedia(id);
		problems.forEach((p) => kept.add(PROBLEM_PART[p]));
		if (kept.has("layout")) media = { ...media, photo_layout: live.photo_layout, layout_photos: live.layout_photos };
		if (kept.has("row")) media = { ...media, slideshow: live.slideshow };
		if (kept.has("video")) media = { ...media, video_url: live.video_url, video_poster_url: live.video_poster_url, video_transcript: live.video_transcript };
	} else if (problems.length) {
		status = existing?.status ?? "draft";
		published_at = existing?.published_at ?? null;
	}

	const savedId = await upsertRow(
		"blogs",
		id,
		{
			...fields,
			slug,
			status,
			published_at,
			author_name: optional(text(formData, "author_name", 120)),
			...media,
		},
		{ author_id: user.id },
	);

	revalidateContent("/blogs", "/admin/blogs", [slug, existing?.slug]);
	await revalidateLinkedImpact(savedId);
	// Only fixed codes go in the URL; the edit page maps them to fixed messages.
	const qs = new URLSearchParams(
		!problems.length
			? { notice: resolved.notice ?? "saved" }
			: kept.size
				? { notice: "saved", kept: [...kept].join(","), problems: problems.join(",") }
				: { problems: problems.join(",") },
	);
	redirect(`/admin/blogs/${savedId}/edit?${qs}`);
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
