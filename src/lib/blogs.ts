import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";

export type BlogStatus = "draft" | "published";

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
	"id" | "title" | "slug" | "excerpt" | "cover_image_url" | "cover_image_alt" | "tags" | "status" | "published_at" | "author_name" | "updated_at"
>;

const SUMMARY_COLUMNS = "id,title,slug,excerpt,cover_image_url,cover_image_alt,tags,status,published_at,author_name,updated_at";

export const BLOGS_PER_PAGE = 9;

export function slugify(input: string): string {
	return input
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80)
		.replace(/-+$/g, "");
}

/** Plain-text version of the Markdown body, for excerpts and descriptions. */
export function toPlainText(markdown: string): string {
	return markdown
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[#>*_`~-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function summarize(blog: Pick<Blog, "excerpt" | "content" | "meta_description">, max = 160): string {
	const text = blog.meta_description || blog.excerpt || toPlainText(blog.content);
	return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

export function readingMinutes(markdown: string): number {
	return Math.max(1, Math.round(toPlainText(markdown).split(" ").filter(Boolean).length / 220));
}

/* ----------------------------- Public (RLS) ----------------------------- */

export async function getPublishedBlogs(page = 1, perPage = BLOGS_PER_PAGE) {
	const from = (page - 1) * perPage;
	const { data, count, error } = await createPublicClient()
		.from("blogs")
		.select(SUMMARY_COLUMNS, { count: "exact" })
		.eq("status", "published")
		.order("published_at", { ascending: false })
		.range(from, from + perPage - 1);

	if (error) throw new Error(`Failed to load blogs: ${error.message}`);
	return { blogs: (data ?? []) as BlogSummary[], total: count ?? 0 };
}

/** Deduplicated per request so `generateMetadata` and the page share one query. */
export const getPublishedBlogBySlug = cache(async (slug: string): Promise<Blog | null> => {
	const { data, error } = await createPublicClient().from("blogs").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
	if (error) throw new Error(`Failed to load blog: ${error.message}`);
	return data as Blog | null;
});

export async function getAllPublishedSlugs() {
	const { data, error } = await createPublicClient()
		.from("blogs")
		.select("slug,updated_at")
		.eq("status", "published")
		.order("published_at", { ascending: false })
		.limit(5000);
	if (error) return [];
	return data as Pick<Blog, "slug" | "updated_at">[];
}

/* ------------------------- Admin (service role) ------------------------- */
// Callers must have passed requireAdmin().

export async function adminListBlogs({ q, status, page = 1, perPage = 20 }: { q?: string; status?: string; page?: number; perPage?: number }) {
	let query = createAdminClient().from("blogs").select(SUMMARY_COLUMNS, { count: "exact" }).order("updated_at", { ascending: false });

	if (status === "draft" || status === "published") query = query.eq("status", status);
	if (q) query = query.ilike("title", `%${q.replace(/[%_,()]/g, " ")}%`);

	const from = (page - 1) * perPage;
	const { data, count, error } = await query.range(from, from + perPage - 1);
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
	const [all, published] = await Promise.all([
		db.from("blogs").select("id", { count: "exact", head: true }),
		db.from("blogs").select("id", { count: "exact", head: true }).eq("status", "published"),
	]);
	if (all.error) throw new Error(`Failed to load blog stats: ${all.error.message}`);
	return { total: all.count ?? 0, published: published.count ?? 0, drafts: (all.count ?? 0) - (published.count ?? 0) };
}

export function formatDate(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string {
	if (!value) return "—";
	return new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", ...opts }).format(new Date(value));
}
