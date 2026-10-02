"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify, type BlogStatus } from "@/lib/blogs";

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);
const optional = (value: string) => value || null;

function readTags(raw: string): string[] {
	const tags = new Map<string, string>();
	for (const tag of raw.split(",")) {
		const t = tag.trim().replace(/\s+/g, " ").slice(0, 40);
		if (t && !tags.has(t.toLowerCase())) tags.set(t.toLowerCase(), t);
	}
	return Array.from(tags.values()).slice(0, 10);
}

function isHttpUrl(value: string) {
	try {
		return ["http:", "https:"].includes(new URL(value).protocol);
	} catch {
		return false;
	}
}

/** Appends -2, -3… until the slug is free (ignoring the post being edited). */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
	const db = createAdminClient();
	const { data } = await db.from("blogs").select("id,slug").like("slug", `${base}%`);
	const taken = new Set((data ?? []).filter((r) => r.id !== excludeId).map((r) => r.slug));
	if (!taken.has(base)) return base;
	for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

function revalidateBlog(slug?: string) {
	revalidatePath("/admin/blogs");
	revalidatePath("/admin");
	revalidatePath("/blogs");
	revalidatePath("/sitemap.xml");
	if (slug) revalidatePath(`/blogs/${slug}`);
}

export async function saveBlog(formData: FormData) {
	const user = await requireAdmin();
	const db = createAdminClient();

	const id = text(formData, "id", 64) || undefined;
	const title = text(formData, "title", 200);
	const intent = String(formData.get("intent") ?? "draft");
	if (!title) throw new Error("Title is required.");

	const existing = id ? (await db.from("blogs").select("slug,status,published_at").eq("id", id).maybeSingle()).data : null;
	if (id && !existing) throw new Error("That post no longer exists.");

	const slug = await uniqueSlug(slugify(text(formData, "slug", 80) || title) || "post", id);
	const status: BlogStatus = intent === "publish" ? "published" : intent === "unpublish" ? "draft" : ((existing?.status as BlogStatus) ?? "draft");

	const cover = text(formData, "cover_image_url", 1000);
	const values = {
		title,
		slug,
		excerpt: optional(text(formData, "excerpt", 500)),
		content: String(formData.get("content") ?? "").slice(0, 200_000),
		cover_image_url: cover && isHttpUrl(cover) ? cover : null,
		cover_image_alt: optional(text(formData, "cover_image_alt", 200)),
		meta_title: optional(text(formData, "meta_title", 70)),
		meta_description: optional(text(formData, "meta_description", 170)),
		tags: readTags(String(formData.get("tags") ?? "")),
		status,
		// Keep the original publish date when re-saving a published post.
		published_at: status === "published" ? (existing?.published_at ?? new Date().toISOString()) : null,
	};

	let savedId = id;
	if (id) {
		const { error } = await db.from("blogs").update(values).eq("id", id);
		if (error) throw new Error(`Couldn't save the post: ${error.message}`);
	} else {
		const { data, error } = await db
			.from("blogs")
			.insert({ ...values, author_id: user.id, author_name: user.name })
			.select("id")
			.single();
		if (error) throw new Error(`Couldn't create the post: ${error.message}`);
		savedId = data.id;
	}

	revalidateBlog(slug);
	if (existing?.slug && existing.slug !== slug) revalidatePath(`/blogs/${existing.slug}`);

	const notice = intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : id ? "saved" : "created";
	redirect(`/admin/blogs/${savedId}/edit?notice=${notice}`);
}

export async function deleteBlog(formData: FormData) {
	await requireAdmin();
	const id = text(formData, "id", 64);
	const db = createAdminClient();
	const { data } = await db.from("blogs").select("slug").eq("id", id).maybeSingle();
	const { error } = await db.from("blogs").delete().eq("id", id);
	if (error) redirect(`/admin/blogs?error=${encodeURIComponent(error.message)}`);
	revalidateBlog(data?.slug);
	redirect("/admin/blogs?notice=deleted");
}
