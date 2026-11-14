"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { purgeGroups } from "@/lib/cache";
import { text } from "@/lib/content-server";
import { createAdminClient } from "@/lib/supabase/admin";

const qs = (o: Record<string, string>) => new URLSearchParams(o).toString();
const isId = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
const cleanName = (formData: FormData) => text(formData, "name", 60).replace(/\s+/g, " ").slice(0, 40).trim();

/** Tags show on every content type, so a change refreshes all of them, the listings and the homepage. */
function refreshTagged() {
	purgeGroups(["blogs", "events", "promotions", "services", "portfolio", "listings", "home"]);
	for (const p of ["/admin/tags", "/admin/blogs", "/admin/events", "/admin/promotions", "/admin/services", "/admin/portfolio"]) revalidatePath(p);
}

/** Add a new tag, or rename one (?edit=<id>). Renaming to an existing name merges the two. */
export async function saveSharedTag(formData: FormData) {
	await requireAdmin();
	const id = text(formData, "id", 64);
	const name = cleanName(formData);
	if (!name) redirect(`/admin/tags?${qs({ error: "Tag name is required." })}`);
	const db = createAdminClient();

	if (id) {
		if (!isId(id)) redirect(`/admin/tags?${qs({ error: "Unknown tag." })}`);
		const { data: before } = await db.from("tags").select("name").eq("id", id).maybeSingle();
		const { data: keptId, error } = await db.rpc("tag_rename", { p_id: id, p_name: name });
		if (error) redirect(`/admin/tags?${qs({ edit: id, error: error.message })}`);
		const merged = keptId !== id;
		await audit({ kind: "admin", action: merged ? "tags.merge" : "tags.rename", entity: "tags", entityId: String(keptId), summary: `${before?.name ?? "?"} → ${name}` });
		refreshTagged();
		redirect(`/admin/tags?${qs({ notice: merged ? `Merged “${before?.name}” into “${name}”.` : `Tag renamed to “${name}” everywhere it's used.` })}`);
	}

	const { data, error } = await db.from("tags").insert({ name }).select("id").single();
	if (error) redirect(`/admin/tags?${qs({ error: error.code === "23505" ? `A tag called “${name}” already exists.` : error.message })}`);
	await audit({ kind: "admin", action: "tags.create", entity: "tags", entityId: data.id as string, summary: name });
	revalidatePath("/admin/tags");
	redirect(`/admin/tags?${qs({ notice: `Tag “${name}” created.` })}`);
}

/** Removes the tag from every blog, event, promotion, service and project, then deletes it. */
export async function deleteSharedTag(formData: FormData) {
	await requireAdmin();
	const id = text(formData, "id", 64);
	if (!isId(id)) redirect(`/admin/tags?${qs({ error: "Unknown tag." })}`);
	const db = createAdminClient();
	const { data: before } = await db.from("tags").select("name").eq("id", id).maybeSingle();
	const { error } = await db.rpc("tag_delete", { p_id: id });
	if (error) redirect(`/admin/tags?${qs({ error: error.message })}`);
	await audit({ kind: "admin", action: "tags.delete", entity: "tags", entityId: id, summary: before?.name ?? "" });
	refreshTagged();
	redirect(`/admin/tags?${qs({ notice: before ? `Tag “${before.name}” deleted.` : "Tag deleted." })}`);
}
