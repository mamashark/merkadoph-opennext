import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminGet, adminList, onlyLive } from "@/lib/content-server";
import type { ContentStatus } from "@/lib/content";

export type Service = {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	content: string;
	cover_image_url: string | null;
	cover_image_alt: string | null;
	tags: string[];
	category: string | null;
	price_label: string | null;
	cta_label: string | null;
	cta_url: string | null;
	is_featured: boolean;
	sort_order: number;
	meta_title: string | null;
	meta_description: string | null;
	status: ContentStatus;
	published_at: string | null;
	created_at: string;
	updated_at: string;
};

export type ServiceSummary = Pick<
	Service,
	| "id"
	| "title"
	| "slug"
	| "excerpt"
	| "cover_image_url"
	| "cover_image_alt"
	| "tags"
	| "category"
	| "price_label"
	| "is_featured"
	| "sort_order"
	| "status"
	| "published_at"
	| "updated_at"
>;

const SUMMARY = "id,title,slug,excerpt,cover_image_url,cover_image_alt,tags,category,price_label,is_featured,sort_order,status,published_at,updated_at";
export const SERVICES_PER_PAGE = 12;

export async function getPublicServices(category: string | undefined, page = 1, perPage = SERVICES_PER_PAGE) {
	const from = (page - 1) * perPage;
	let query = onlyLive(createPublicClient().from("services").select(SUMMARY, { count: "exact" }));
	if (category) query = query.eq("category", category);
	const { data, count, error } = await query
		.order("is_featured", { ascending: false })
		.order("sort_order", { ascending: true })
		.order("title", { ascending: true })
		.range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load services: ${error.message}`);
	return { services: (data ?? []) as ServiceSummary[], total: count ?? 0 };
}

/** Distinct categories of live services (public) or of all services (admin). */
export async function getServiceCategories(scope: "public" | "admin" = "public"): Promise<string[]> {
	const base = (scope === "admin" ? createAdminClient() : createPublicClient()).from("services").select("category").not("category", "is", null);
	const { data } = await (scope === "admin" ? base : onlyLive(base)).limit(1000);
	return Array.from(new Set((data ?? []).map((r) => r.category as string))).sort((a, b) => a.localeCompare(b));
}

export const getPublicServiceBySlug = cache(async (slug: string): Promise<Service | null> => {
	const { data, error } = await onlyLive(createPublicClient().from("services").select("*").eq("slug", slug)).maybeSingle();
	if (error) throw new Error(`Failed to load service: ${error.message}`);
	return data as Service | null;
});

export async function getServiceSlugs() {
	const { data } = await onlyLive(createPublicClient().from("services").select("slug,updated_at")).limit(5000);
	return (data ?? []) as Pick<Service, "slug" | "updated_at">[];
}

/* ------------------------------ Admin ------------------------------ */

export const SERVICE_SORTS = {
	order: { column: "sort_order", ascending: true },
	updated: { column: "updated_at", ascending: false },
	title: { column: "title", ascending: true },
} as const;

export function adminListServices(opts: { q?: string; status?: string; category?: string; featured?: string; sort?: string; page?: number; perPage?: number }) {
	return adminList<ServiceSummary>("services", {
		columns: SUMMARY,
		q: opts.q,
		searchColumns: ["title", "category"],
		state: opts.status,
		page: opts.page,
		perPage: opts.perPage,
		order: SERVICE_SORTS[opts.sort as keyof typeof SERVICE_SORTS] ?? SERVICE_SORTS.order,
		refine: (query) => {
			let q = query;
			if (opts.category) q = q.eq("category", opts.category);
			if (opts.featured === "yes") q = q.eq("is_featured", true);
			if (opts.featured === "no") q = q.eq("is_featured", false);
			return q;
		},
	});
}

export const adminGetService = (id: string) => adminGet<Service>("services", id);
