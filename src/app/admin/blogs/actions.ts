"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { adminImpactSlugsForBlog } from "@/lib/portfolio";
import { commonFields, deleteRow, fetchExisting, mediaUrl, optional, readGallery, resolvePublishing, revalidateContent, text, uniqueSlug, upsertRow } from "@/lib/content-server";
import { isPhotoLayout, LAYOUT_SLOTS, MAX_SLIDESHOW, type BlogPhoto, type PhotoLayout } from "@/lib/blog-layout";

/** The A / B photo slots (media library URLs only); empty slots are skipped. */
function readLayoutPhotos(formData: FormData): BlogPhoto[] {
	return [0, 1]
		.map((i) => ({ url: mediaUrl(formData, `layout_url_${i}`), alt: text(formData, `layout_alt_${i}`, 200), caption: text(formData, `layout_caption_${i}`, 300) }))
		.filter((p): p is BlogPhoto => !!p.url);
}

/** What still blocks publishing under the approved layout rules, or null. */
function publishProblem(layout: PhotoLayout, photos: BlogPhoto[], slideshow: BlogPhoto[]): string | null {
	const shown = photos.slice(0, LAYOUT_SLOTS[layout]);
	if (layout === "B" && shown.length < 2) return "Layout B needs two photos. Pick both, or choose another layout.";
	if (shown.some((p) => !p.alt)) return `Add alt text to the ${layout === "A" ? "header photo" : "two photos"}: it describes the photo for screen readers and Google.`;
	const noCaption = slideshow.filter((p) => !p.caption).length;
	if (noCaption) return `Add a caption to ${noCaption === 1 ? "1 photo" : `${noCaption} photos`} in the photo row.`;
	return null;
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
	const photo_layout: PhotoLayout = isPhotoLayout(layoutRaw) ? layoutRaw : "A";
	const layout_photos = readLayoutPhotos(formData);
	// GalleryField sends the caption as `description`; alt may be left empty when the caption describes the photo.
	const slideshow: BlogPhoto[] = readGallery(formData.get("slideshow"), MAX_SLIDESHOW).map((g) => ({ url: g.url, alt: g.alt, caption: g.description.slice(0, 300) }));
	const video_url = mediaUrl(formData, "video_url");

	// Publish rules (approved mock-up). If one isn't met the post is still saved (as a draft, or keeping its current
	// status) so nothing typed is lost, and the message says what to fix.
	const problem = resolved.status === "published" ? publishProblem(photo_layout, layout_photos, slideshow) : null;
	const status = problem ? (existing?.status ?? "draft") : resolved.status;
	const published_at = problem ? (existing?.published_at ?? null) : resolved.published_at;

	const savedId = await upsertRow(
		"blogs",
		id,
		{
			...fields,
			slug,
			status,
			published_at,
			author_name: optional(text(formData, "author_name", 120)),
			photo_layout,
			layout_photos,
			slideshow,
			video_url,
			video_poster_url: video_url ? mediaUrl(formData, "video_poster_url") : null,
			video_transcript: video_url ? optional(text(formData, "video_transcript", 5000)) : null,
		},
		{ author_id: user.id },
	);

	revalidateContent("/blogs", "/admin/blogs", [slug, existing?.slug]);
	await revalidateLinkedImpact(savedId);
	redirect(`/admin/blogs/${savedId}/edit?${new URLSearchParams(problem ? { error: `Saved, but not published. ${problem}` } : { notice: resolved.notice ?? "saved" })}`);
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
