import "server-only";
import { cache } from "react";
import { cached, cachedPaged } from "@/lib/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminGet, adminList, onlyLive } from "@/lib/content-server";
import { PastEndError, pastEnd, tagsByUse, type ContentStatus, type GalleryImage } from "@/lib/content";

/** One project image from the media library, with its own description (shown on hover). */
export type PortfolioImage = GalleryImage;

export type Portfolio = {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	content: string;
	cover_image_url: string | null;
	cover_image_alt: string | null;
	images: PortfolioImage[];
	location: string | null;
	completed_on: string | null;
	tags: string[];
	/** The blog post that tells this entry's story (shown as "Read the story" on both pages). */
	blog_id: string | null;
	meta_title: string | null;
	meta_description: string | null;
	status: ContentStatus;
	published_at: string | null;
	created_at: string;
	updated_at: string;
};

export type PortfolioSummary = Pick<
	Portfolio,
	"id" | "title" | "slug" | "excerpt" | "cover_image_url" | "cover_image_alt" | "images" | "location" | "completed_on" | "tags" | "status" | "published_at" | "updated_at"
>;

const SUMMARY = "id,title,slug,excerpt,cover_image_url,cover_image_alt,images,location,completed_on,tags,status,published_at,updated_at";
/** Public detail page columns (no author_id). */
const DETAIL = `${SUMMARY},content,blog_id,meta_title,meta_description,created_at`;
export const PORTFOLIO_PER_PAGE = 12;

/** Card image: the chosen cover, else the first project image. */
export function portfolioCover(p: Pick<Portfolio, "cover_image_url" | "cover_image_alt" | "images" | "title">): { url: string; alt: string } | null {
	if (p.cover_image_url) return { url: p.cover_image_url, alt: p.cover_image_alt || p.title };
	const first = p.images?.[0];
	return first ? { url: first.url, alt: first.alt || p.title } : null;
}

/** The year an entry took place ("2025"), from its date. Entries without a date have no year. */
export const entryYear = (p: Pick<Portfolio, "completed_on">) => p.completed_on?.slice(0, 4) ?? null;

/** Newest first (by the date it took place, then publish date). Optional tag and year filters. */
export const getPublicPortfolios = cachedPaged(async (tag: string | undefined, page: number = 1, perPage: number = PORTFOLIO_PER_PAGE, year?: string) => {
	const from = (page - 1) * perPage;
	let query = onlyLive(createPublicClient().from("portfolios").select(SUMMARY, { count: "exact" }));
	if (tag) query = query.contains("tags", [tag]);
	if (year && /^\d{4}$/.test(year)) query = query.gte("completed_on", `${year}-01-01`).lte("completed_on", `${year}-12-31`);
	const { data, count, error } = await query
		.order("completed_on", { ascending: false, nullsFirst: false })
		.order("published_at", { ascending: false })
		.range(from, from + perPage - 1);
	if (error) {
		if (pastEnd(error)) throw new PastEndError();
		throw new Error(`Failed to load portfolio: ${error.message}`);
	}
	return { portfolios: (data ?? []) as PortfolioSummary[], total: count ?? 0 };
}, "portfolio:getPublicPortfolios", ["portfolio"], { portfolios: [] as PortfolioSummary[], total: 0 });

/** Every live entry with a date, newest first: the Community Impact years on the homepage (one cached read). */
export const getImpactTimeline = cached(async (): Promise<PortfolioSummary[]> => {
	const { data, error } = await onlyLive(createPublicClient().from("portfolios").select(SUMMARY))
		.not("completed_on", "is", null)
		.order("completed_on", { ascending: false })
		.limit(300);
	if (error) throw new Error(`Failed to load Community Impact years: ${error.message}`);
	return (data ?? []) as PortfolioSummary[];
}, "portfolio:getImpactTimeline", ["portfolio"]);

/** Years that have at least one live entry, newest first (for the /impact year filter). */
export const getImpactYears = cached(async (): Promise<string[]> => {
	const { data } = await onlyLive(createPublicClient().from("portfolios").select("completed_on")).not("completed_on", "is", null).limit(1000);
	return Array.from(new Set((data ?? []).map((r) => String(r.completed_on).slice(0, 4)))).sort((a, b) => b.localeCompare(a));
}, "portfolio:getImpactYears", ["portfolio"]);

/** Distinct tags of live projects (for the URL filter on /portfolio). */
export const getPortfolioTags = cached(async (): Promise<string[]> => {
	const { data } = await onlyLive(createPublicClient().from("portfolios").select("tags")).limit(1000);
	return tagsByUse((data ?? []) as Array<{ tags: string[] | null }>);
}, "portfolio:getPortfolioTags", ["portfolio"]);

export const getPublicPortfolioBySlug = cache(
	cached(async (slug: string): Promise<Portfolio | null> => {
		const { data, error } = await onlyLive(createPublicClient().from("portfolios").select(DETAIL).eq("slug", slug)).maybeSingle();
		if (error) throw new Error(`Failed to load project: ${error.message}`);
		return data as Portfolio | null;
	}, "portfolio:getPublicPortfolioBySlug", ["portfolio"]),
);

export const getPortfolioSlugs = cached(async () => {
	const { data } = await onlyLive(createPublicClient().from("portfolios").select("slug,updated_at")).limit(5000);
	return (data ?? []) as Pick<Portfolio, "slug" | "updated_at">[];
}, "portfolio:getPortfolioSlugs", ["portfolio"]);

/** Other recent projects for the "More projects" strip on a project page. */
export const getRelatedPortfolios = cached(async (excludeId: string, limit: number = 3): Promise<PortfolioSummary[]> => {
	const { data } = await onlyLive(createPublicClient().from("portfolios").select(SUMMARY)).neq("id", excludeId).order("published_at", { ascending: false }).limit(limit);
	return (data ?? []) as PortfolioSummary[];
}, "portfolio:getRelatedPortfolios", ["portfolio"]);

/** The same event in other years: live entries sharing a tag (e.g. "Spring Market"), by date, newest first. */
export const getSameEventOtherYears = cached(async (excludeId: string, tags: string[], limit: number = 6): Promise<PortfolioSummary[]> => {
	if (!tags.length) return [];
	const { data } = await onlyLive(createPublicClient().from("portfolios").select(SUMMARY))
		.neq("id", excludeId)
		.overlaps("tags", tags.slice(0, 10))
		.order("completed_on", { ascending: false, nullsFirst: false })
		.limit(limit);
	return (data ?? []) as PortfolioSummary[];
}, "portfolio:getSameEventOtherYears", ["portfolio"]);

/** Live entries linked to a blog post (the "See the photos" card on the post), newest event first. Throws so errors aren't cached; callers catch. */
export const getImpactEntriesForBlog = cache(
	cached(async (blogId: string): Promise<PortfolioSummary[]> => {
		const { data, error } = await onlyLive(createPublicClient().from("portfolios").select(SUMMARY))
			.eq("blog_id", blogId)
			.order("completed_on", { ascending: false, nullsFirst: false })
			.limit(4);
		if (error) throw new Error(`Failed to load linked entries: ${error.message}`);
		return (data ?? []) as PortfolioSummary[];
	}, "portfolio:getImpactEntriesForBlog", ["portfolio"]),
);

/* ------------------------------ Admin ------------------------------ */

export const PORTFOLIO_SORTS = {
	date: { column: "completed_on", ascending: false },
	newest: { column: "published_at", ascending: false },
	updated: { column: "updated_at", ascending: false },
	title: { column: "title", ascending: true },
} as const;

export function adminListPortfolios(opts: { q?: string; status?: string; tag?: string; year?: string; sort?: string; page?: number; perPage?: number }) {
	const year = opts.year && /^\d{4}$/.test(opts.year) ? opts.year : opts.year === "none" ? "none" : "";
	return adminList<PortfolioSummary>("portfolios", {
		columns: SUMMARY,
		q: opts.q,
		searchColumns: ["title", "location", "excerpt"],
		state: opts.status,
		page: opts.page,
		perPage: opts.perPage,
		order: PORTFOLIO_SORTS[opts.sort as keyof typeof PORTFOLIO_SORTS] ?? PORTFOLIO_SORTS.updated,
		refine: (query) => {
			let q = opts.tag ? query.contains("tags", [opts.tag]) : query;
			if (year === "none") q = q.is("completed_on", null);
			else if (year) q = q.gte("completed_on", `${year}-01-01`).lte("completed_on", `${year}-12-31`);
			return q;
		},
	});
}

/** Years with any entry (published or not), newest first, for the admin year filter. */
export async function adminPortfolioYears(): Promise<string[]> {
	const { data } = await createAdminClient().from("portfolios").select("completed_on").not("completed_on", "is", null).limit(1000);
	return Array.from(new Set((data ?? []).map((r) => String(r.completed_on).slice(0, 4)))).sort((a, b) => b.localeCompare(a));
}

/** All tags used by any project (admin filter). */
export async function adminPortfolioTags(): Promise<string[]> {
	const { data } = await createAdminClient().from("portfolios").select("tags").limit(1000);
	return Array.from(new Set((data ?? []).flatMap((r) => (r.tags as string[]) ?? []))).sort((a, b) => a.localeCompare(b));
}

export const adminGetPortfolio = (id: string) => adminGet<Portfolio>("portfolios", id);

/** Site search (/search): live rows whose title or summary contains `term` (already cleaned with searchTerm()). */
export const searchPublicPortfolios = cached(async (term: string, limit: number = 8) => {
	const { data, error } = await onlyLive(createPublicClient().from("portfolios").select("id,slug,title,excerpt,completed_on"))
		.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`)
		.order("completed_on", { ascending: false, nullsFirst: false })
		.limit(limit);
	if (error) throw new Error(`Failed to search portfolios: ${error.message}`);
	return (data ?? []) as { id: string, slug: string, title: string, excerpt: string | null, completed_on: string | null }[];
}, "portfolio:search", ["portfolio"]);

/** Slugs of every entry (any status) linked to a blog post, so saving or deleting the post can refresh their pages. */
export async function adminImpactSlugsForBlog(blogId: string): Promise<string[]> {
	const { data, error } = await createAdminClient().from("portfolios").select("slug").eq("blog_id", blogId).limit(50);
	if (error) throw new Error(`Failed to load linked entries: ${error.message}`);
	return (data ?? []).map((r) => String(r.slug));
}
