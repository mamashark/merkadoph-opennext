import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { filterByState, onlyLive } from "@/lib/content-server";
import { searchTerm, type ContentStatus } from "@/lib/content";

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
	created_at: string;
	updated_at: string;
};

export type BlogSummary = Pick<
	Blog,
	"id" | "title" | "slug" | "excerpt" | "cover_image_url" | "cover_image_alt" | "tags" | "status" | "published_at" | "author_name" | "created_at" | "updated_at"
>;

const SUMMARY_COLUMNS = "id,title,slug,excerpt,cover_image_url,cover_image_alt,tags,status,published_at,author_name,created_at,updated_at";

export const BLOGS_PER_PAGE = 9;

/* ----------------------------- Public (RLS) ----------------------------- */

export async function getPublishedBlogs(page = 1, perPage = BLOGS_PER_PAGE) {
	const from = (page - 1) * perPage;
	const { data, count, error } = await onlyLive(createPublicClient().from("blogs").select(SUMMARY_COLUMNS, { count: "exact" }))
		.order("published_at", { ascending: false })
		.range(from, from + perPage - 1);

	if (error) throw new Error(`Failed to load blogs: ${error.message}`);
	return { blogs: (data ?? []) as BlogSummary[], total: count ?? 0 };
}

/** Deduplicated per request so `generateMetadata` and the page share one query. */
export const getPublishedBlogBySlug = cache(async (slug: string): Promise<Blog | null> => {
	const { data, error } = await onlyLive(createPublicClient().from("blogs").select("*").eq("slug", slug)).maybeSingle();
	if (error) throw new Error(`Failed to load blog: ${error.message}`);
	return data as Blog | null;
});

export async function getAllPublishedSlugs() {
	const { data, error } = await onlyLive(createPublicClient().from("blogs").select("slug,updated_at"))
		.order("published_at", { ascending: false })
		.limit(5000);
	if (error) return [];
	return data as Pick<Blog, "slug" | "updated_at">[];
}

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
	sort = "updated",
	page = 1,
	perPage = 20,
}: {
	q?: string;
	status?: string;
	sort?: string;
	page?: number;
	perPage?: number;
}) {
	const order = BLOG_SORTS[sort as keyof typeof BLOG_SORTS] ?? BLOG_SORTS.updated;
	let query = filterByState(createAdminClient().from("blogs").select(SUMMARY_COLUMNS, { count: "exact" }), status ?? "");

	const term = q ? searchTerm(q) : "";
	if (term) query = query.or(`title.ilike.%${term}%,author_name.ilike.%${term}%`);

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

export async function adminBlogCounts() {
	const db = createAdminClient();
	const [all, live] = await Promise.all([
		db.from("blogs").select("id", { count: "exact", head: true }),
		onlyLive(db.from("blogs").select("id", { count: "exact", head: true })),
	]);
	if (all.error) throw new Error(`Failed to load blog stats: ${all.error.message}`);
	return { total: all.count ?? 0, published: live.count ?? 0, drafts: (all.count ?? 0) - (live.count ?? 0) };
}
