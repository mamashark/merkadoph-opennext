import "server-only";
import { cache } from "react";
import { cached } from "@/lib/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { filterByState, onlyLive } from "@/lib/content-server";
import { searchTerm, type ContentStatus } from "@/lib/content";
import type { BlogPhoto, PhotoLayout } from "@/lib/blog-layout";

export { slugify, toPlainText, summarize, readingMinutes } from "@/lib/content";
export { formatDate } from "@/lib/datetime";

export type BlogStatus = ContentStatus;

export type Blog = {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	content: string;
	cover_image_url: string | null;
	cover_image_alt: string | null;
	meta_title: string | null;
	meta_description: string | null;
	tags: string[];
	status: BlogStatus;
	published_at: string | null;
	author_id: string | null;
	author_name: string | null;
	/** Photo layout (migration 20261124120000): A = header photo, B = middle pair, none = text only. */
	photo_layout: PhotoLayout;
	/** The A / B photos, in order (A uses the first; none set = the cover image). */
	layout_photos: BlogPhoto[];
	/** The photo row ("Mga larawan"), placed by [[slideshow]] or at the end. */
	slideshow: BlogPhoto[];
	/** An MP4 / WebM in our Storage, with an optional poster still and transcript. */
	video_url: string | null;
	video_poster_url: string | null;
	video_transcript: string | null;
	created_at: string;
	updated_at: string;
};

export type BlogSummary = Pick<
	Blog,
	"id" | "title" | "slug" | "excerpt" | "cover_image_url" | "cover_image_alt" | "tags" | "status" | "published_at" | "author_name" | "created_at" | "updated_at"
>;

const SUMMARY_COLUMNS = "id,title,slug,excerpt,cover_image_url,cover_image_alt,tags,status,published_at,author_name,created_at,updated_at";

export const BLOGS_PER_PAGE = 9;
/** Posts tagged with this (Admin → Tags) are notices: they appear on the Bulletin Board (/bulletin) and the homepage Highlight. */
export const ANNOUNCEMENT_TAG = "Announcement";

/* ----------------------------- Public (RLS) ----------------------------- */

/** Pinned post: shown first on the homepage and /blogs, whatever gets published after it. */
export const PINNED_BLOG_TITLE = "Bagong yugto: the next chapter for Merkado PH";

/** `tag` filters (the /blogs?tag= filter); `excludeId` leaves out a post shown separately (the pinned one). */
export const getPublishedBlogs = cached(async (page: number = 1, perPage: number = BLOGS_PER_PAGE, opts: { tag?: string; excludeId?: string } = {}) => {
	const from = (page - 1) * perPage;
	let query = onlyLive(createPublicClient().from("blogs").select(SUMMARY_COLUMNS, { count: "exact" }));
	if (opts.tag) query = query.contains("tags", [opts.tag]);
	if (opts.excludeId) query = query.neq("id", opts.excludeId);
	const { data, count, error } = await query
		.order("published_at", { ascending: false })
		.range(from, from + perPage - 1);

	if (error) throw new Error(`Failed to load blogs: ${error.message}`);
	return { blogs: (data ?? []) as BlogSummary[], total: count ?? 0 };
}, "blogs:getPublishedBlogs", ["blogs"]);

/** Distinct tags of live posts, for the tag filter. */
export const getBlogTags = cached(async (): Promise<string[]> => {
	const { data } = await onlyLive(createPublicClient().from("blogs").select("tags")).limit(2000);
	return Array.from(new Set((data ?? []).flatMap((r) => (r.tags as string[] | null) ?? []))).sort((a, b) => a.localeCompare(b));
}, "blogs:getBlogTags", ["blogs"]);

/** A live post by its exact title (case-insensitive), e.g. one pinned on the homepage. */
export const getPublishedBlogByTitle = cached(async (title: string): Promise<BlogSummary | null> => {
	const pattern = title.replace(/[\\%_]/g, (c) => `\\${c}`);
	const { data, error } = await onlyLive(createPublicClient().from("blogs").select(SUMMARY_COLUMNS)).ilike("title", pattern).limit(1).maybeSingle();
	if (error) throw new Error(`Failed to load blog: ${error.message}`);
	return data as BlogSummary | null;
}, "blogs:getPublishedBlogByTitle", ["blogs"]);

/** Deduplicated per request so `generateMetadata` and the page share one query. */
export const getPublishedBlogBySlug = cache(cached(async (slug: string): Promise<Blog | null> => {
	const { data, error } = await onlyLive(createPublicClient().from("blogs").select("*").eq("slug", slug)).maybeSingle();
	if (error) throw new Error(`Failed to load blog: ${error.message}`);
	return data as Blog | null;
}, "blogs:getPublishedBlogBySlug", ["blogs"]));

/** A live post by id (the "Read the story" link on a Community Impact entry). Null if it's a draft, scheduled or gone. */
export const getLinkedBlog = cache(cached(async (id: string): Promise<BlogSummary | null> => {
	const { data, error } = await onlyLive(createPublicClient().from("blogs").select(SUMMARY_COLUMNS).eq("id", id)).maybeSingle();
	if (error) throw new Error(`Failed to load linked blog: ${error.message}`);
	return data as BlogSummary | null;
}, "blogs:getLinkedBlog", ["blogs"]));

export const getAllPublishedSlugs = cached(async () => {
	const { data, error } = await onlyLive(createPublicClient().from("blogs").select("slug,updated_at"))
		.order("published_at", { ascending: false })
		.limit(5000);
	if (error) return [];
	return data as Pick<Blog, "slug" | "updated_at">[];
}, "blogs:getAllPublishedSlugs", ["blogs"]);

/* ------------------------- Admin (service role) ------------------------- */
// Callers must have passed requireAdmin().

export const BLOG_SORTS = {
	updated: { column: "updated_at", ascending: false },
	published: { column: "published_at", ascending: false },
	created: { column: "created_at", ascending: false },
	title: { column: "title", ascending: true },
} as const;

export async function adminListBlogs({
	q,
	status,
	tag,
	sort = "updated",
	page = 1,
	perPage = 20,
}: {
	q?: string;
	status?: string;
	tag?: string;
	sort?: string;
	page?: number;
	perPage?: number;
}) {
	const order = BLOG_SORTS[sort as keyof typeof BLOG_SORTS] ?? BLOG_SORTS.updated;
	let query = filterByState(createAdminClient().from("blogs").select(SUMMARY_COLUMNS, { count: "exact" }), status ?? "");

	const term = q ? searchTerm(q) : "";
	if (term) query = query.or(`title.ilike.%${term}%,author_name.ilike.%${term}%`);
	if (tag) query = query.contains("tags", [tag]);

	const from = (page - 1) * perPage;
	const { data, count, error } = await query.order(order.column, { ascending: order.ascending, nullsFirst: false }).range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load blogs: ${error.message}`);
	return { blogs: (data ?? []) as BlogSummary[], total: count ?? 0 };
}

export async function adminGetBlog(id: string): Promise<Blog | null> {
	const { data, error } = await createAdminClient().from("blogs").select("*").eq("id", id).maybeSingle();
	if (error) throw new Error(`Failed to load blog: ${error.message}`);
	return data as Blog | null;
}

export type BlogOption = Pick<Blog, "id" | "title" | "slug" | "status" | "published_at"> & {
	/** Its /blogs/<slug> URL is a redirect source (e.g. moved to Community Impact), so linking to it would loop or leave the post. */
	moved: boolean;
};

const PICKER_LIMIT = 500;

/** Current slugs of posts whose /blogs/<slug> URL redirects elsewhere. Throws on error. */
async function redirectedBlogSlugs(): Promise<Set<string>> {
	const { data, error } = await createAdminClient().from("redirects").select("from_path").like("from_path", "/blogs/%").limit(5000);
	if (error) throw new Error(`Failed to load redirects: ${error.message}`);
	return new Set((data ?? []).map((r) => String(r.from_path).slice("/blogs/".length)));
}

/** True when the post's page redirects elsewhere, so it can't be the "Read the story" target. Throws on error. */
export async function adminIsBlogMoved(slug: string): Promise<boolean> {
	const { count, error } = await createAdminClient().from("redirects").select("id", { count: "exact", head: true }).eq("from_path", `/blogs/${slug}`);
	if (error) throw new Error(`Failed to check redirects: ${error.message}`);
	return (count ?? 0) > 0;
}

/**
 * Posts for the "Related blog post" picker on a Community Impact entry, newest first, each flagged `moved` when its
 * URL redirects. `currentId` (the entry's existing link) is always included, even past the limit, so opening and
 * saving the form never drops a link the list didn't load.
 */
export async function adminBlogOptions(currentId?: string | null): Promise<BlogOption[]> {
	const db = createAdminClient();
	const columns = "id,title,slug,status,published_at";
	const [{ data, error }, redirected] = await Promise.all([
		db.from("blogs").select(columns).order("published_at", { ascending: false, nullsFirst: true }).limit(PICKER_LIMIT),
		redirectedBlogSlugs(),
	]);
	if (error) throw new Error(`Failed to load blogs: ${error.message}`);
	const rows = (data ?? []) as Array<Omit<BlogOption, "moved">>;
	if (currentId && !rows.some((r) => r.id === currentId)) {
		const { data: current, error: currentError } = await db.from("blogs").select(columns).eq("id", currentId).maybeSingle();
		if (currentError) throw new Error(`Failed to load the linked blog: ${currentError.message}`);
		if (current) rows.push(current as Omit<BlogOption, "moved">);
	}
	return rows.map((r) => ({ ...r, moved: redirected.has(r.slug) }));
}

export async function adminBlogCounts() {
	const db = createAdminClient();
	const [all, live] = await Promise.all([
		db.from("blogs").select("id", { count: "exact", head: true }),
		onlyLive(db.from("blogs").select("id", { count: "exact", head: true })),
	]);
	if (all.error) throw new Error(`Failed to load blog stats: ${all.error.message}`);
	return { total: all.count ?? 0, published: live.count ?? 0, drafts: (all.count ?? 0) - (live.count ?? 0) };
}

/** Site search (/search): live rows whose title or summary contains `term` (already cleaned with searchTerm()). */
export const searchPublicBlogs = cached(async (term: string, limit: number = 8) => {
	const { data, error } = await onlyLive(createPublicClient().from("blogs").select("id,slug,title,excerpt,published_at"))
		.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`)
		.order("published_at", { ascending: false, nullsFirst: false })
		.limit(limit);
	if (error) throw new Error(`Failed to search blogs: ${error.message}`);
	return (data ?? []) as { id: string, slug: string, title: string, excerpt: string | null, published_at: string | null }[];
}, "blogs:search", ["blogs"]);
