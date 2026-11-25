"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromDateTimeInput } from "@/lib/datetime";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeContent } from "@/lib/cache";
import { UUID } from "@/lib/validation";
import { slugify } from "@/lib/content";
import { commonFields, deleteRow, isMediaUrl, mediaUrl, optional, optionalLink, optionalUrl, revalidateContent, text, uniqueSlug, upsertRow } from "@/lib/content-server";
import {
	BULLETIN_TYPES,
	LANGUAGES,
	MEDIA_CONTACT_DOMAIN,
	MEDIA_TYPES,
	PRESS_PUBLISHING_OPEN,
	isOfficialEmbassyUrl,
	isPressType,
	TYPE_FIELDS,
	type BulletinStatus,
	type BulletinType,
} from "@/lib/bulletin-shared";
import type { Attachment } from "@/lib/bulletin";

/*
 * Bulletin Board admin actions. Every action calls requireAdmin() first (Strict rule 3); input is validated here
 * (Strict rule 5) and again by the database's checks. Errors go back as ?error=<code>; the pages map codes to
 * fixed text (BULLETIN_ERRORS), so a crafted link can't show made-up messages (Sig, 2026-11-25).
 */

type Intent = "draft" | "review" | "publish" | "save" | "unpublish" | "archive" | "restore";
const INTENTS: Intent[] = ["draft", "review", "publish", "save", "unpublish", "archive", "restore"];

const back = (id: string | undefined, error: string): never => redirect(`${id ? `/admin/bulletin/${id}/edit` : "/admin/bulletin/new"}?${new URLSearchParams({ error })}`);

const languageSchema = z.enum(LANGUAGES.map((l) => l.value) as [string, ...string[]]);
const dateOnly = (v: FormDataEntryValue | null) => {
	const s = String(v ?? "").trim();
	return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const uuidOrNull = (v: FormDataEntryValue | null) => {
	const s = String(v ?? "").trim();
	return UUID.test(s) ? s : null;
};

/** "Label | https://…" per line; only files in our media library are kept (Sig m3). */
function readAttachments(raw: FormDataEntryValue | null): Attachment[] | string {
	const out: Attachment[] = [];
	for (const line of String(raw ?? "").split("\n").map((l) => l.trim()).filter(Boolean)) {
		const [label, url] = line.includes("|") ? line.split("|").map((s) => s.trim()) : ["", line];
		if (!isMediaUrl(url)) return "attachment";
		out.push({ label: (label || "Download").slice(0, 120), url: new URL(url).href });
	}
	return out.length > 10 ? "attachments-max" : out;
}

export async function saveBulletinItem(formData: FormData) {
	const user = await requireAdmin();
	const id = uuidOrNull(formData.get("id")) ?? undefined;
	const intent = (INTENTS as string[]).includes(String(formData.get("intent"))) ? (String(formData.get("intent")) as Intent) : "draft";
	const fail = (msg: string) => back(id, msg);

	const fields = commonFields(formData);
	if (!fields.title) fail("title");

	const type = String(formData.get("content_type") ?? "") as BulletinType;
	if (!(BULLETIN_TYPES as readonly string[]).includes(type)) fail("type");
	const press = isPressType(type);

	const category_id = uuidOrNull(formData.get("category_id"));
	if (!category_id) fail("category");
	const db = createAdminClient();
	const { data: cat } = await db.from("bulletin_categories").select("id").eq("id", category_id!).maybeSingle();
	if (!cat) fail("category-gone");

	const language = languageSchema.safeParse(String(formData.get("language") ?? "en"));
	if (!language.success) fail("language");

	// Media library only for images (Sig m1); the form's MediaField sends Storage URLs.
	const cover_image_url = mediaUrl(formData, "cover_image_url");

	// Each type keeps only its own fields; the rest are cleared (Arvid M1), so a field typed before switching
	// type never shows up publicly. Validation runs only for the fields the type uses.
	const uses = (group: keyof typeof TYPE_FIELDS) => TYPE_FIELDS[group].includes(type);
	const sourceRaw = optionalUrl(formData, "source_url");
	const source_url = sourceRaw ? new URL(sourceRaw).href : null; // stored in parsed form (Sig)
	const publisher_id = uses("mediaSource") ? uuidOrNull(formData.get("publisher_id")) : null;
	const mediaTypeRaw = String(formData.get("media_type") ?? "");
	const media_type = uses("mediaSource") && (MEDIA_TYPES as readonly string[]).includes(mediaTypeRaw) ? mediaTypeRaw : null;
	const original_title = uses("mediaSource") ? optional(text(formData, "original_title", 300)) : null;
	const original_published_on = uses("pressDates") ? dateOnly(formData.get("original_published_on")) : null;
	const source_language = uses("pressDates") ? (languageSchema.safeParse(String(formData.get("source_language") ?? "")).data ?? null) : null;
	const source_verified_on = uses("pressDates") ? dateOnly(formData.get("source_verified_on")) : null;

	let media_contact: string | null = null;
	let attachments: Attachment[] = [];
	if (uses("pressRelease")) {
		const contactRaw = text(formData, "media_contact", 254).toLowerCase();
		if (contactRaw && !z.email().safeParse(contactRaw).success) fail("contact-email");
		if (contactRaw && !contactRaw.endsWith(`@${MEDIA_CONTACT_DOMAIN}`)) fail("contact-domain");
		media_contact = contactRaw || null;
		const read = readAttachments(formData.get("attachments"));
		if (typeof read === "string") fail(read);
		attachments = read as Attachment[];
	}

	let cta_label: string | null = null;
	let cta_url: string | null = null;
	if (uses("cta")) {
		const ctaRaw = text(formData, "cta_url", 1000);
		cta_url = optionalLink(formData, "cta_url");
		if (ctaRaw && !cta_url) fail("cta");
		cta_label = optional(text(formData, "cta_label", 40));
	}

	// Dates. Press items never expire (spec §4.7).
	const chosenPublish = fromDateTimeInput(formData.get("published_at"));
	const expires_at = press ? null : fromDateTimeInput(formData.get("expires_at"));

	// Status from the button pressed.
	const { data: existing } = id ? await db.from("bulletin_items").select("slug,status,published_at,archived_at").eq("id", id).maybeSingle() : { data: null };
	if (id && !existing) fail("gone");
	const prev = (existing?.status as BulletinStatus | undefined) ?? "draft";
	let status: BulletinStatus =
		intent === "publish" ? "published"
		: intent === "review" ? "in_review"
		: intent === "unpublish" || intent === "restore" || intent === "draft" ? (intent === "draft" && prev === "in_review" ? "in_review" : "draft")
		: intent === "archive" ? "archived"
		: prev;
	const at = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);
	let published_at = status === "published" ? (chosenPublish ?? existing?.published_at ?? new Date().toISOString()) : (chosenPublish ?? existing?.published_at ?? null);
	if (expires_at && published_at && at(expires_at) <= at(published_at)) fail("expiry");

	// Publishing rules. When one fails, the edits are still saved (as the previous, unpublished status) so nothing
	// typed is lost (Arvid M2); a live item that would break a rule is left untouched instead.
	let publishError: string | null = null;
	if (status === "published") {
		if (press && !PRESS_PUBLISHING_OPEN) publishError = "press-phase";
		else if (type === "media_coverage" && !(publisher_id && source_url && original_published_on && media_type)) publishError = "media-source";
		else if (type === "press_release" && !original_published_on) publishError = "press-date";
		else if (type === "embassy_update" && !(source_url && isOfficialEmbassyUrl(source_url))) publishError = "embassy-source";
		else if (cover_image_url && !fields.cover_image_alt) publishError = "alt";
		else if (expires_at && at(expires_at) <= Date.now()) publishError = "expiry-past";
	}
	if (publishError) {
		if (prev === "published") fail(publishError);
		status = prev === "archived" ? "draft" : prev;
		published_at = chosenPublish ?? existing?.published_at ?? null;
	}
	const archived_at = status === "archived" ? (existing?.archived_at ?? new Date().toISOString()) : null;

	const slug = await uniqueSlug("bulletin_items", text(formData, "slug", 80) || fields.title, id);

	const values = {
		title: fields.title,
		slug,
		excerpt: fields.excerpt,
		content: fields.content,
		content_type: type,
		category_id,
		tags: fields.tags,
		cover_image_url,
		cover_image_alt: fields.cover_image_alt,
		image_caption: optional(text(formData, "image_caption", 300)),
		image_credit: optional(text(formData, "image_credit", 200)),
		usage_rights: optional(text(formData, "usage_rights", 300)),
		language: language.data,
		author_name: optional(text(formData, "author_name", 120)),
		status,
		published_at,
		expires_at,
		archived_at,
		publisher_id,
		original_title,
		source_url,
		original_published_on,
		media_type,
		source_language,
		source_verified_on,
		media_contact,
		attachments,
		cta_label,
		cta_url,
		is_featured: formData.get("is_featured") === "on",
		is_pinned: formData.get("is_pinned") === "on",
		show_on_homepage: formData.get("show_on_homepage") === "on",
		show_in_bulletin: formData.get("show_in_bulletin") === "on",
		show_in_press: press && formData.get("show_in_press") === "on",
		display_priority: Math.max(-100, Math.min(100, Math.trunc(Number(formData.get("display_priority")) || 0))),
		event_id: uuidOrNull(formData.get("event_id")),
		portfolio_id: uuidOrNull(formData.get("portfolio_id")),
		meta_title: fields.meta_title,
		meta_description: fields.meta_description,
	};

	let savedId: string;
	try {
		savedId = await upsertRow("bulletin_items", id, values, { author_id: user.id });
	} catch (e) {
		console.error("[admin/bulletin] save", e instanceof Error ? e.message : e);
		return fail("save");
	}
	// Status changes get their own audit line, so publish / archive / restore can be told apart (Sig).
	if (status !== prev || !existing) {
		await audit({ kind: "admin", action: `bulletin_items.${status}`, entity: "bulletin_items", entityId: savedId, summary: `${fields.title} (${existing ? prev : "new"} → ${status})` });
	}

	revalidateContent("/bulletin", "/admin/bulletin", [slug, existing?.slug as string | undefined]);
	if (publishError) redirect(`/admin/bulletin/${savedId}/edit?error=${publishError}&notice=held`);
	const notice = { publish: "published", review: "review", unpublish: "unpublished", archive: "archived", restore: "restored", draft: existing ? "saved" : "created", save: "saved" }[intent];
	redirect(`/admin/bulletin/${savedId}/edit?notice=${notice}`);
}

export async function deleteBulletinItem(formData: FormData) {
	await requireAdmin();
	const id = uuidOrNull(formData.get("id"));
	if (!id) redirect("/admin/bulletin?error=delete-failed");
	const { slug, error } = await deleteRow("bulletin_items", id);
	if (error) {
		console.error("[admin/bulletin] delete", error);
		redirect("/admin/bulletin?error=delete-failed");
	}
	revalidateContent("/bulletin", "/admin/bulletin", [slug]);
	redirect("/admin/bulletin?notice=deleted");
}

/* ------------------------------ Categories ------------------------------ */

const categorySchema = z.object({
	name: z.string().trim().min(1, "Name is required.").max(60, "Use at most 60 characters."),
	description: z.string().trim().max(300).optional(),
	sort_order: z.coerce.number().int().min(-1000).max(1000).catch(0),
});
const RESERVED = new Set(["all", "community-offers"]);

export async function saveBulletinCategory(formData: FormData) {
	await requireAdmin();
	const id = uuidOrNull(formData.get("id"));
	const parsed = categorySchema.safeParse({ name: formData.get("name"), description: formData.get("description") ?? "", sort_order: formData.get("sort_order") });
	const fail = (e: string): never => redirect(`/admin/bulletin/categories?${new URLSearchParams({ error: e })}`);
	if (!parsed.success) fail("cat-name");
	const { name, description, sort_order } = parsed.data!;
	const db = createAdminClient();

	if (id) {
		const { error } = await db.from("bulletin_categories").update({ name, description: description || null, sort_order, is_active: formData.get("is_active") === "on" }).eq("id", id);
		if (error) fail(error.code === "23505" ? "cat-exists" : "cat-save");
		await audit({ kind: "admin", action: "bulletin_categories.update", entity: "bulletin_categories", entityId: id, summary: name });
	} else {
		const base = slugify(name);
		if (!base || RESERVED.has(base)) fail("cat-reserved");
		const slug = await uniqueSlug("bulletin_categories", base);
		const { data, error } = await db.from("bulletin_categories").insert({ name, slug, description: description || null, sort_order }).select("id").single();
		if (error) fail(error.code === "23505" ? "cat-exists" : "cat-save");
		await audit({ kind: "admin", action: "bulletin_categories.create", entity: "bulletin_categories", entityId: data!.id as string, summary: name });
	}
	purgeContent("bulletin");
	revalidatePath("/admin/bulletin/categories");
	redirect("/admin/bulletin/categories?notice=saved");
}

export async function deleteBulletinCategory(formData: FormData) {
	await requireAdmin();
	const id = uuidOrNull(formData.get("id"));
	if (!id) redirect("/admin/bulletin/categories?error=cat-delete");
	const db = createAdminClient();
	const { error } = await db.from("bulletin_categories").delete().eq("id", id);
	// 23503 = still used by items (on delete restrict).
	if (error) redirect(`/admin/bulletin/categories?${new URLSearchParams({ error: error.code === "23503" ? "cat-in-use" : "cat-delete" })}`);
	await audit({ kind: "admin", action: "bulletin_categories.delete", entity: "bulletin_categories", entityId: id });
	purgeContent("bulletin");
	revalidatePath("/admin/bulletin/categories");
	redirect("/admin/bulletin/categories?notice=deleted");
}

/* ------------------------------ Publishers ------------------------------ */

const publisherSchema = z.object({ name: z.string().trim().min(1, "Name is required.").max(120, "Use at most 120 characters.") });

export async function saveBulletinPublisher(formData: FormData) {
	await requireAdmin();
	const id = uuidOrNull(formData.get("id"));
	const fail = (e: string): never => redirect(`/admin/bulletin/publishers?${new URLSearchParams({ error: e })}`);
	const parsed = publisherSchema.safeParse({ name: formData.get("name") });
	if (!parsed.success) fail("pub-name");
	const name = parsed.data!.name;
	const logo_url = mediaUrl(formData, "logo_url"); // a logo we may use, uploaded to the media library
	const websiteRaw = text(formData, "website_url", 1000);
	const websiteParsed = optionalUrl(formData, "website_url");
	const website_url = websiteParsed ? new URL(websiteParsed).href : null;
	if (websiteRaw && !website_url) fail("pub-website");
	const db = createAdminClient();

	if (id) {
		const { error } = await db.from("bulletin_publishers").update({ name, logo_url, website_url }).eq("id", id);
		if (error) fail(error.code === "23505" ? "pub-exists" : "pub-save");
		await audit({ kind: "admin", action: "bulletin_publishers.update", entity: "bulletin_publishers", entityId: id, summary: name });
	} else {
		const slug = await uniqueSlug("bulletin_publishers", name);
		const { data, error } = await db.from("bulletin_publishers").insert({ name, slug, logo_url, website_url }).select("id").single();
		if (error) fail(error.code === "23505" ? "pub-exists" : "pub-save");
		await audit({ kind: "admin", action: "bulletin_publishers.create", entity: "bulletin_publishers", entityId: data!.id as string, summary: name });
	}
	purgeContent("bulletin");
	revalidatePath("/admin/bulletin/publishers");
	redirect("/admin/bulletin/publishers?notice=saved");
}

export async function deleteBulletinPublisher(formData: FormData) {
	await requireAdmin();
	const id = uuidOrNull(formData.get("id"));
	if (!id) redirect("/admin/bulletin/publishers?error=pub-delete");
	const { error } = await createAdminClient().from("bulletin_publishers").delete().eq("id", id);
	if (error) redirect(`/admin/bulletin/publishers?${new URLSearchParams({ error: error.code === "23503" ? "pub-in-use" : "pub-delete" })}`);
	await audit({ kind: "admin", action: "bulletin_publishers.delete", entity: "bulletin_publishers", entityId: id });
	purgeContent("bulletin");
	revalidatePath("/admin/bulletin/publishers");
	redirect("/admin/bulletin/publishers?notice=deleted");
}
