"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { LEGAL_PAGE_IDS, LEGAL_PAGES, SEO_FIELDS, SOCIAL_FIELDS, type LegalPageId, type SeoSettings } from "@/lib/site-settings";

const back = (path: string, params: Record<string, string>): never => redirect(`${path}?${new URLSearchParams(params)}`);

/* ------------------------------------------------------------------ */
/* SEO settings                                                         */
/* ------------------------------------------------------------------ */

const optionalUrl = z.union([z.literal(""), z.string().url().startsWith("https://", "Use a full https:// link.")]);
const seoSchema = z.object({
	email: z.union([z.literal(""), z.string().email("Enter a valid email address.")]),
	phone: z.string().regex(/^[\d\s()+\-.]*$/, "Use digits, spaces and + ( ) - only for the phone number."),
	latitude: z.union([z.literal(""), z.coerce.number().min(-90).max(90)]),
	longitude: z.union([z.literal(""), z.coerce.number().min(-180).max(180)]),
	country: z.union([z.literal(""), z.string().regex(/^[A-Za-z]{2}$/, "Country must be a 2-letter code, e.g. SE.")]),
	default_og_image: z.union([z.literal(""), z.string().regex(/^(https:\/\/|\/)/, "The share image must be an uploaded image or a path like /og-default.jpg.")]),
	// Verification tokens are put into <meta content="…">: keep them to safe characters.
	google_verification: z.string().regex(/^[\w\-]*$/, "Paste only the code from Google's meta tag (the content=\"…\" value)."),
	bing_verification: z.string().regex(/^[\w\-]*$/, "Paste only the code from Bing's meta tag (the content=\"…\" value)."),
	cf_analytics_token: z.string().regex(/^[a-f0-9]*$/i, "The Cloudflare Web Analytics token is a hex string."),
	...Object.fromEntries(SOCIAL_FIELDS.map((k) => [k, optionalUrl])),
});

export async function saveSeoSettings(formData: FormData) {
	await requireAdmin();
	const value = Object.fromEntries(SEO_FIELDS.map((k) => [k, String(formData.get(k) ?? "").trim().slice(0, k === "opening_hours" || k === "site_description" ? 600 : 300)])) as SeoSettings;
	const parsed = seoSchema.safeParse(value);
	if (!parsed.success) back("/admin/seo", { error: parsed.error.issues[0]?.message ?? "Please check the fields." });

	const { error } = await createAdminClient().from("site_settings").upsert({ key: "seo", value });
	if (error) back("/admin/seo", { error: error.message });
	await audit({ kind: "admin", action: "seo.settings", entity: "site_settings", entityId: "seo", summary: "SEO settings saved" });
	updateTag("seo");
	revalidatePath("/", "layout");
	back("/admin/seo", { notice: "SEO settings saved. Every public page now uses them." });
}

/* ------------------------------------------------------------------ */
/* Legal pages                                                          */
/* ------------------------------------------------------------------ */

export async function saveLegalPage(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("page") ?? "") as LegalPageId;
	if (!LEGAL_PAGE_IDS.includes(id)) back("/admin/seo/legal", { error: "Unknown page." });
	const body = String(formData.get("body") ?? "").slice(0, 60_000);

	const db = createAdminClient();
	const { data } = await db.from("site_settings").select("value").eq("key", "legal").maybeSingle();
	const value = { ...((data?.value as Record<string, unknown>) ?? {}), [id]: { body, updated_at: new Date().toISOString() } };
	const { error } = await db.from("site_settings").upsert({ key: "legal", value });
	if (error) back("/admin/seo/legal", { page: id, error: error.message });

	await audit({ kind: "admin", action: "legal.update", entity: "site_settings", entityId: id, summary: `${LEGAL_PAGES[id].title} updated` });
	updateTag("legal");
	revalidatePath(LEGAL_PAGES[id].path);
	revalidatePath("/sitemap.xml");
	back("/admin/seo/legal", { page: id, notice: `${LEGAL_PAGES[id].title} saved.` });
}

/* ------------------------------------------------------------------ */
/* Redirects                                                            */
/* ------------------------------------------------------------------ */

/** Normalises "/old-page/", "https://site/old?x" etc. to "/old-page" (redirects match on path only). */
function normalisePath(input: string): string {
	let p = input.trim();
	try {
		if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
	} catch {
		return "";
	}
	p = p.split(/[?#]/)[0];
	if (!p.startsWith("/")) p = `/${p}`;
	return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

const redirectSchema = z.object({
	from_path: z.string().min(2, "Enter the old path, e.g. /old-page.").max(500).regex(/^\/[^\s]*$/, "The old path must start with / and have no spaces."),
	to_path: z
		.string()
		.min(1, "Enter where it should go.")
		.max(1000)
		.regex(/^(\/[^\s]*|https:\/\/[^\s]+)$/, "The target must be a path like /services/roofing or a full https:// link."),
	status: z.coerce.number().refine((n) => [301, 302, 307, 308].includes(n), "Pick a redirect type."),
	note: z.string().max(300),
});

const BLOCKED_PREFIXES = ["/admin", "/login", "/api", "/_next"];

export async function saveRedirect(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") ?? "");
	const returnTo = String(formData.get("return") ?? "");
	const listUrl = (params: Record<string, string>) => `/admin/seo/redirects?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(returnTo)), ...params })}`;

	const raw = {
		from_path: normalisePath(String(formData.get("from_path") ?? "")),
		to_path: (() => {
			const t = String(formData.get("to_path") ?? "").trim();
			return /^https?:\/\//i.test(t) ? t : normalisePath(t);
		})(),
		status: String(formData.get("status") ?? "301"),
		note: String(formData.get("note") ?? "").trim(),
	};
	const parsed = redirectSchema.safeParse(raw);
	if (!parsed.success) redirect(listUrl({ error: parsed.error.issues[0]?.message ?? "Please check the fields.", ...(id ? { edit: id } : {}) }));
	const v = parsed.data!;
	if (BLOCKED_PREFIXES.some((p) => v.from_path === p || v.from_path.startsWith(`${p}/`))) redirect(listUrl({ error: "Admin, login and API paths can't be redirected." }));
	if (v.from_path === v.to_path) redirect(listUrl({ error: "The old and new paths are the same." }));

	const db = createAdminClient();
	const row = { from_path: v.from_path, to_path: v.to_path, status: v.status, note: v.note || null, source: "manual" };
	const { error } = id ? await db.from("redirects").update(row).eq("id", id) : await db.from("redirects").insert(row);
	if (error) redirect(listUrl({ error: error.code === "23505" ? `A redirect from ${v.from_path} already exists.` : error.message }));
	// Avoid chains: anything that pointed at the old path now points straight at the new target.
	await db.from("redirects").update({ to_path: v.to_path }).eq("to_path", v.from_path);

	await audit({ kind: "admin", action: id ? "redirects.update" : "redirects.create", entity: "redirects", entityId: id || null, summary: `${v.from_path} → ${v.to_path} (${v.status})` });
	redirect(listUrl({ notice: id ? "Redirect updated." : "Redirect added. It takes effect within a minute." }));
}

export async function deleteRedirect(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") ?? "");
	const returnTo = String(formData.get("return") ?? "");
	const db = createAdminClient();
	const { data } = await db.from("redirects").delete().eq("id", id).select("from_path,to_path").maybeSingle();
	if (data) await audit({ kind: "admin", action: "redirects.delete", entity: "redirects", entityId: id, summary: `Removed ${data.from_path} → ${data.to_path}` });
	redirect(`/admin/seo/redirects?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(returnTo)), notice: "Redirect removed." })}`);
}

