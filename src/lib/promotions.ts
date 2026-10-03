import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { adminGet, adminList, onlyLive } from "@/lib/content-server";
import type { ContentStatus } from "@/lib/content";

export type Promotion = {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	content: string;
	cover_image_url: string | null;
	cover_image_alt: string | null;
	tags: string[];
	discount_label: string | null;
	promo_code: string | null;
	starts_at: string | null;
	ends_at: string | null;
	terms: string | null;
	cta_label: string | null;
	cta_url: string | null;
	meta_title: string | null;
	meta_description: string | null;
	status: ContentStatus;
	published_at: string | null;
	created_at: string;
	updated_at: string;
};

export type PromotionSummary = Pick<
	Promotion,
	"id" | "title" | "slug" | "excerpt" | "cover_image_url" | "cover_image_alt" | "tags" | "discount_label" | "starts_at" | "ends_at" | "status" | "published_at" | "updated_at"
>;

const SUMMARY = "id,title,slug,excerpt,cover_image_url,cover_image_alt,tags,discount_label,starts_at,ends_at,status,published_at,updated_at";
export const PROMOTIONS_PER_PAGE = 9;

export type Validity = "active" | "upcoming" | "ended";

export function promotionValidity(p: Pick<Promotion, "starts_at" | "ends_at">): Validity {
	const now = Date.now();
	if (p.ends_at && new Date(p.ends_at).getTime() < now) return "ended";
	if (p.starts_at && new Date(p.starts_at).getTime() > now) return "upcoming";
	return "active";
}

function validityFilter(v: Validity | "current") {
	const now = new Date().toISOString();
	switch (v) {
		case "ended":
			return `ends_at.lt.${now}`;
		case "upcoming":
			return `starts_at.gt.${now}`;
		case "active":
			return `and(or(starts_at.is.null,starts_at.lte.${now}),or(ends_at.is.null,ends_at.gte.${now}))`;
		case "current": // active or upcoming
			return `ends_at.is.null,ends_at.gte.${now}`;
	}
}

export async function getPublicPromotions(show: "current" | "ended", page = 1, perPage = PROMOTIONS_PER_PAGE) {
	const from = (page - 1) * perPage;
	let query = onlyLive(createPublicClient().from("promotions").select(SUMMARY, { count: "exact" }));
	query = show === "ended" ? query.lt("ends_at", new Date().toISOString()) : query.or(validityFilter("current"));
	const { data, count, error } = await query
		.order(show === "ended" ? "ends_at" : "published_at", { ascending: false, nullsFirst: false })
		.range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load promotions: ${error.message}`);
	return { promotions: (data ?? []) as PromotionSummary[], total: count ?? 0 };
}

export const getPublicPromotionBySlug = cache(async (slug: string): Promise<Promotion | null> => {
	const { data, error } = await onlyLive(createPublicClient().from("promotions").select("*").eq("slug", slug)).maybeSingle();
	if (error) throw new Error(`Failed to load promotion: ${error.message}`);
	return data as Promotion | null;
});

export async function getPromotionSlugs() {
	const { data } = await onlyLive(createPublicClient().from("promotions").select("slug,updated_at")).limit(5000);
	return (data ?? []) as Pick<Promotion, "slug" | "updated_at">[];
}

/* ------------------------------ Admin ------------------------------ */

export const PROMOTION_SORTS = {
	updated: { column: "updated_at", ascending: false },
	ends: { column: "ends_at", ascending: true },
	title: { column: "title", ascending: true },
} as const;

export function adminListPromotions(opts: { q?: string; status?: string; validity?: string; sort?: string; page?: number; perPage?: number }) {
	const v = opts.validity as Validity;
	return adminList<PromotionSummary>("promotions", {
		columns: SUMMARY,
		q: opts.q,
		searchColumns: ["title", "promo_code", "discount_label"],
		state: opts.status,
		page: opts.page,
		perPage: opts.perPage,
		order: PROMOTION_SORTS[opts.sort as keyof typeof PROMOTION_SORTS] ?? PROMOTION_SORTS.updated,
		refine: (query) => {
			if (v === "ended") return query.lt("ends_at", new Date().toISOString());
			if (v === "upcoming") return query.gt("starts_at", new Date().toISOString());
			if (v === "active") return query.or(validityFilter("active"));
			return query;
		},
	});
}

export const adminGetPromotion = (id: string) => adminGet<Promotion>("promotions", id);
