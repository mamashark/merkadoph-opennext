import "server-only";
import { cache } from "react";
import { cached } from "@/lib/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminGet, adminList, onlyLive } from "@/lib/content-server";
import type { ContentStatus } from "@/lib/content";

/** One project image from the media library, with its own description (shown on hover). */
export type PortfolioImage = { url: string; alt: string; description: string };

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
export const PORTFOLIO_PER_PAGE = 12;

/** Card image: the chosen cover, else the first project image. */
export function portfolioCover(p: Pick<Portfolio, "cover_image_url" | "cover_image_alt" | "images" | "title">): { url: string; alt: string } | null {
	if (p.cover_image_url) return { url: p.cover_image_url, alt: p.cover_image_alt || p.title };
	const first = p.images?.[0];
	return first ? { url: first.url, alt: first.alt || p.title } : null;
}

/** Newest first (by publish date). Optional tag filter. */
export const getPublicPortfolios = cached(async (tag: string | undefined, page: number = 1, perPage: number = PORTFOLIO_PER_PAGE) => {
	const from = (page - 1) * perPage;
	let query = onlyLive(createPublicClient().from("portfolios").select(SUMMARY, { count: "exact" }));
	if (tag) query = query.contains("tags", [tag]);
	const { data, count, error } = await query.order("published_at", { ascending: false }).range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load portfolio: ${error.message}`);
	return { portfolios: (data ?? []) as PortfolioSummary[], total: count ?? 0 };
}, "portfolio:getPublicPortfolios", ["portfolio"]);

/** Distinct tags of live projects (for the URL filter on /portfolio). */
export const getPortfolioTags = cached(async (): Promise<string[]> => {
	const { data } = await onlyLive(createPublicClient().from("portfolios").select("tags")).limit(1000);
	return Array.from(new Set((data ?? []).flatMap((r) => (r.tags as string[]) ?? []))).sort((a, b) => a.localeCompare(b));
}, "portfolio:getPortfolioTags", ["portfolio"]);

export const getPublicPortfolioBySlug = cache(
	cached(async (slug: string): Promise<Portfolio | null> => {
		const { data, error } = await onlyLive(createPublicClient().from("portfolios").select("*").eq("slug", slug)).maybeSingle();
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

/* ------------------------------ Admin ------------------------------ */

export const PORTFOLIO_SORTS = {
	newest: { column: "published_at", ascending: false },
	updated: { column: "updated_at", ascending: false },
	title: { column: "title", ascending: true },
} as const;

export function adminListPortfolios(opts: { q?: string; status?: string; tag?: string; sort?: string; page?: number; perPage?: number }) {
	return adminList<PortfolioSummary>("portfolios", {
		columns: SUMMARY,
		q: opts.q,
		searchColumns: ["title", "location", "excerpt"],
		state: opts.status,
		page: opts.page,
		perPage: opts.perPage,
		order: PORTFOLIO_SORTS[opts.sort as keyof typeof PORTFOLIO_SORTS] ?? PORTFOLIO_SORTS.updated,
		refine: (query) => (opts.tag ? query.contains("tags", [opts.tag]) : query),
	});
}

/** All tags used by any project (admin filter). */
export async function adminPortfolioTags(): Promise<string[]> {
	const { data } = await createAdminClient().from("portfolios").select("tags").limit(1000);
	return Array.from(new Set((data ?? []).flatMap((r) => (r.tags as string[]) ?? []))).sort((a, b) => a.localeCompare(b));
}

export const adminGetPortfolio = (id: string) => adminGet<Portfolio>("portfolios", id);
