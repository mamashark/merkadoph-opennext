import "server-only";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { fromDateTimeInput } from "@/lib/datetime";
import { isHttpUrl, slugify, type ContentStatus, type ContentTable } from "@/lib/content";

// Server-side helpers shared by the content Server Actions. Callers must have passed requireAdmin().

export function text(formData: FormData, key: string, max: number): string {
	return String(formData.get(key) ?? "")
		.trim()
		.slice(0, max);
}

export function optional(value: string): string | null {
	return value || null;
}

export function optionalUrl(formData: FormData, key: string): string | null {
	const value = text(formData, key, 1000);
	return value && isHttpUrl(value) ? value : null;
}

export function readTags(raw: FormDataEntryValue | null): string[] {
	const tags = new Map<string, string>();
	for (const tag of String(raw ?? "").split(",")) {
		const t = tag.trim().replace(/\s+/g, " ").slice(0, 40);
		if (t && !tags.has(t.toLowerCase())) tags.set(t.toLowerCase(), t);
	}
	return Array.from(tags.values()).slice(0, 10);
}

/** Appends -2, -3… until the slug is free in `table` (ignoring the row being edited). */
export async function uniqueSlug(table: ContentTable, raw: string, excludeId?: string): Promise<string> {
	const base = slugify(raw) || "item";
	const { data } = await createAdminClient().from(table).select("id,slug").like("slug", `${base}%`);
	const taken = new Set((data ?? []).filter((r) => r.id !== excludeId).map((r) => r.slug as string));
	if (!taken.has(base)) return base;
	for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

export type Intent = "draft" | "publish" | "save" | "unpublish";

/**
 * Works out status + publish date from the pressed button and the "Publish date" field.
 * A publish date in the future keeps the row hidden until then (scheduled).
 */
export function resolvePublishing(formData: FormData, existing: { status: ContentStatus; published_at: string | null } | null) {
	const intent = String(formData.get("intent") ?? "draft") as Intent;
	const chosen = fromDateTimeInput(formData.get("published_at"));

	const status: ContentStatus = intent === "publish" ? "published" : intent === "unpublish" ? "draft" : (existing?.status ?? "draft");
	const published_at = chosen ?? (status === "published" ? (existing?.published_at ?? new Date().toISOString()) : (existing?.published_at ?? null));

	const notice = intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : existing ? "saved" : "created";
	return { status, published_at, notice };
}

/** Fields every content type shares. */
export function commonFields(formData: FormData) {
	return {
		title: text(formData, "title", 200),
		excerpt: optional(text(formData, "excerpt", 500)),
		content: String(formData.get("content") ?? "").slice(0, 200_000),
		cover_image_url: optionalUrl(formData, "cover_image_url"),
		cover_image_alt: optional(text(formData, "cover_image_alt", 200)),
		tags: readTags(formData.get("tags")),
		meta_title: optional(text(formData, "meta_title", 70)),
		meta_description: optional(text(formData, "meta_description", 170)),
	};
}

export function revalidateContent(publicBase: string, adminBase: string, slugs: Array<string | null | undefined> = []) {
	revalidatePath(adminBase);
	revalidatePath("/admin");
	revalidatePath(publicBase);
	revalidatePath("/sitemap.xml");
	for (const slug of new Set(slugs)) if (slug) revalidatePath(`${publicBase}/${slug}`);
}

// Minimal view of a PostgREST filter builder. Kept out of the generic constraint on purpose:
// constraining Q against Supabase's builder types makes TypeScript recurse too deeply.
type Filterable = { eq(column: string, value: unknown): Filterable; lte(column: string, value: unknown): Filterable; gt(column: string, value: unknown): Filterable };

/** Admin list filter by display state (draft / scheduled / published). Unknown values leave the query unchanged. */
export function filterByState<Q>(query: Q, state: string): Q {
	const q = query as unknown as Filterable;
	const now = new Date().toISOString();
	if (state === "draft") return q.eq("status", "draft") as unknown as Q;
	if (state === "published") return q.eq("status", "published").lte("published_at", now) as unknown as Q;
	if (state === "scheduled") return q.eq("status", "published").gt("published_at", now) as unknown as Q;
	return query;
}

/** Public visibility, mirroring the RLS policy (kept explicit so intent is clear in queries). */
export function onlyLive<Q>(query: Q): Q {
	return (query as unknown as Filterable).eq("status", "published").lte("published_at", new Date().toISOString()) as unknown as Q;
}

type ListOptions = {
	columns: string;
	q?: string;
	searchColumns: string[];
	state?: string;
	page?: number;
	perPage?: number;
	order: { column: string; ascending: boolean };
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped PostgREST builder
	refine?: (query: any) => any;
};

/** Paginated, searchable, filterable admin listing for any content table. */
export async function adminList<T>(table: ContentTable, { columns, q, searchColumns, state, page = 1, perPage = 20, order, refine }: ListOptions) {
	let query = filterByState(createAdminClient().from(table).select(columns, { count: "exact" }), state ?? "");
	const term = q ? q.replace(/[%_,()*\\]/g, " ").trim() : "";
	if (term) query = query.or(searchColumns.map((c) => `${c}.ilike.%${term}%`).join(","));
	if (refine) query = refine(query);

	const from = (page - 1) * perPage;
	const { data, count, error } = await query.order(order.column, { ascending: order.ascending, nullsFirst: false }).range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
	return { rows: (data ?? []) as T[], total: count ?? 0 };
}

export async function adminGet<T>(table: ContentTable, id: string): Promise<T | null> {
	const { data, error } = await createAdminClient().from(table).select("*").eq("id", id).maybeSingle();
	if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
	return data as T | null;
}

export async function adminCount(table: ContentTable, live = false): Promise<number> {
	const base = createAdminClient().from(table).select("id", { count: "exact", head: true });
	const { count, error } = await (live ? onlyLive(base) : base);
	if (error) throw new Error(`Failed to count ${table}: ${error.message}`);
	return count ?? 0;
}

export async function fetchExisting(table: ContentTable, id: string | undefined) {
	if (!id) return null;
	const { data } = await createAdminClient().from(table).select("slug,status,published_at").eq("id", id).maybeSingle();
	if (!data) throw new Error("That item no longer exists.");
	return data as { slug: string; status: ContentStatus; published_at: string | null };
}

/** Insert or update, returning the row id. */
export async function upsertRow(table: ContentTable, id: string | undefined, values: Record<string, unknown>, insertExtra: Record<string, unknown>) {
	const db = createAdminClient();
	if (id) {
		const { error } = await db.from(table).update(values).eq("id", id);
		if (error) throw new Error(`Couldn't save: ${error.message}`);
		return id;
	}
	const { data, error } = await db
		.from(table)
		.insert({ ...values, ...insertExtra })
		.select("id")
		.single();
	if (error) throw new Error(`Couldn't create: ${error.message}`);
	return data.id as string;
}

export async function deleteRow(table: ContentTable, id: string): Promise<{ slug?: string; error?: string }> {
	const db = createAdminClient();
	const { data } = await db.from(table).select("slug").eq("id", id).maybeSingle();
	const { error } = await db.from(table).delete().eq("id", id);
	return { slug: data?.slug as string | undefined, error: error?.message };
}
