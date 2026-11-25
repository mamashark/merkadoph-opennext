import "server-only";
import { cache } from "react";
import { cached, cachedPaged } from "@/lib/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminGet, adminList } from "@/lib/content-server";
import { PastEndError, pastEnd, searchTerm } from "@/lib/content";
import type { BulletinStatus, BulletinType, MediaType } from "@/lib/bulletin-shared";

/**
 * Bulletin Board + Press & Media data layer (Kay's spec, 2026-11-25). One record per item (public.bulletin_items),
 * shown on /bulletin, its own page and the homepage. Offers come from public.promotions (src/lib/promotions.ts).
 *
 * Public reads use the anon key with column-level grants: every query lists its columns (select("*") is refused).
 * RLS hides drafts, items in review, archived, scheduled and expired items; liveOnly() repeats that so the intent
 * is visible in the query. Categories are joined with !inner, so items in a hidden category drop out too.
 */

export type BulletinCategory = { id: string; name: string; slug: string; description: string | null; sort_order: number; is_active: boolean };
export type BulletinPublisher = { id: string; name: string; slug: string; logo_url: string | null; website_url: string | null };
export type Attachment = { label: string; url: string };

export type BulletinItem = {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	content: string;
	content_type: BulletinType;
	category_id: string;
	tags: string[];
	cover_image_url: string | null;
	cover_image_alt: string | null;
	image_caption: string | null;
	image_credit: string | null;
	usage_rights: string | null;
	language: string;
	author_name: string | null;
	status: BulletinStatus;
	published_at: string | null;
	expires_at: string | null;
	archived_at: string | null;
	publisher_id: string | null;
	original_title: string | null;
	source_url: string | null;
	original_published_on: string | null;
	media_type: MediaType | null;
	source_language: string | null;
	source_verified_on: string | null;
	media_contact: string | null;
	attachments: Attachment[];
	cta_label: string | null;
	cta_url: string | null;
	is_featured: boolean;
	is_pinned: boolean;
	show_on_homepage: boolean;
	show_in_bulletin: boolean;
	show_in_press: boolean;
	display_priority: number;
	event_id: string | null;
	portfolio_id: string | null;
	meta_title: string | null;
	meta_description: string | null;
	created_at: string;
	updated_at: string;
};

/** What a public card shows. */
export type BulletinCard = Pick<
	BulletinItem,
	| "id"
	| "title"
	| "slug"
	| "excerpt"
	| "content_type"
	| "tags"
	| "cover_image_url"
	| "cover_image_alt"
	| "published_at"
	| "expires_at"
	| "is_featured"
	| "is_pinned"
	| "source_url"
	| "original_published_on"
	| "media_type"
	| "cta_label"
	| "cta_url"
> & { category: { name: string; slug: string }; publisher: { name: string; slug: string; logo_url: string | null } | null };

/** A public page: everything public, plus its relations. Internal columns are never selected. */
export type BulletinPage = BulletinCard &
	Pick<
		BulletinItem,
		| "content"
		| "image_caption"
		| "image_credit"
		| "language"
		| "author_name"
		| "original_title"
		| "source_language"
		| "media_contact"
		| "attachments"
		| "meta_title"
		| "meta_description"
		| "updated_at"
	> & { event: { title: string; slug: string } | null; project: { title: string; slug: string } | null };

const CARD =
	"id,title,slug,excerpt,content_type,tags,cover_image_url,cover_image_alt,published_at,expires_at,is_featured,is_pinned,source_url,original_published_on,media_type,cta_label,cta_url,category:bulletin_categories!inner(name,slug),publisher:bulletin_publishers(name,slug,logo_url)";
const PAGE = `${CARD},content,image_caption,image_credit,language,author_name,original_title,source_language,media_contact,attachments,meta_title,meta_description,updated_at,event:events(title,slug),project:portfolios(title,slug)`;

export const BULLETIN_PER_PAGE = 12;

type Filterable = { eq(c: string, v: unknown): Filterable; lte(c: string, v: unknown): Filterable; or(f: string): Filterable };
/** Live = published, publish time reached, not expired (mirrors the RLS policy). */
function liveOnly<Q>(query: Q): Q {
	const now = new Date().toISOString();
	return (query as unknown as Filterable).eq("status", "published").lte("published_at", now).or(`expires_at.is.null,expires_at.gt.${now}`) as unknown as Q;
}

/* ------------------------------ Public ------------------------------ */

/** Active categories in display order (the /bulletin filters). */
export const getBulletinCategories = cached(async (): Promise<BulletinCategory[]> => {
	const { data, error } = await createPublicClient().from("bulletin_categories").select("id,name,slug,description,sort_order,is_active").order("sort_order").order("name");
	if (error) throw new Error(`Failed to load bulletin categories: ${error.message}`);
	return (data ?? []) as BulletinCategory[];
}, "bulletin:categories", ["bulletin"]);

/** The Bulletin Board list: pinned first, then priority, then newest. `category` is a category slug ("" = all). */
export const getPublicBulletin = cachedPaged(
	async (category: string, q: string, page: number = 1, perPage: number = BULLETIN_PER_PAGE) => {
		const from = (page - 1) * perPage;
		let query = liveOnly(createPublicClient().from("bulletin_items").select(CARD, { count: "exact" })).eq("show_in_bulletin", true);
		if (category) query = query.eq("category.slug", category);
		const term = searchTerm(q);
		if (term) query = query.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`);
		const { data, count, error } = await query
			.order("is_pinned", { ascending: false })
			.order("display_priority", { ascending: false })
			.order("published_at", { ascending: false })
			.range(from, from + perPage - 1);
		if (error) {
			if (pastEnd(error)) throw new PastEndError();
			throw new Error(`Failed to load the Bulletin Board: ${error.message}`);
		}
		return { items: (data ?? []) as unknown as BulletinCard[], total: count ?? 0 };
	},
	"bulletin:list",
	["bulletin"],
	{ items: [] as BulletinCard[], total: 0 },
);

/** Featured items: the large cards at the top of /bulletin. */
export const getFeaturedBulletin = cached(async (limit: number = 3): Promise<BulletinCard[]> => {
	const { data, error } = await liveOnly(createPublicClient().from("bulletin_items").select(CARD))
		.eq("show_in_bulletin", true)
		.eq("is_featured", true)
		.order("display_priority", { ascending: false })
		.order("published_at", { ascending: false })
		.limit(limit);
	if (error) throw new Error(`Failed to load featured notices: ${error.message}`);
	return (data ?? []) as unknown as BulletinCard[];
}, "bulletin:featured", ["bulletin"]);

/**
 * The homepage preview: items chosen for the homepage first (by priority), then the newest live items to fill
 * up to `limit`. Unpublished, scheduled and expired items never appear (RLS).
 */
export const getHomeBulletin = cached(async (limit: number = 4): Promise<BulletinCard[]> => {
	const db = createPublicClient();
	const chosen = await liveOnly(db.from("bulletin_items").select(CARD))
		.eq("show_on_homepage", true)
		.order("display_priority", { ascending: false })
		.order("published_at", { ascending: false })
		.limit(limit);
	if (chosen.error) throw new Error(`Failed to load homepage notices: ${chosen.error.message}`);
	const picked = (chosen.data ?? []) as unknown as BulletinCard[];
	if (picked.length >= limit) return picked;
	const recent = await liveOnly(db.from("bulletin_items").select(CARD))
		.eq("show_in_bulletin", true)
		.order("is_pinned", { ascending: false })
		.order("published_at", { ascending: false })
		.limit(limit + picked.length);
	const seen = new Set(picked.map((p) => p.id));
	const fill = ((recent.data ?? []) as unknown as BulletinCard[]).filter((r) => !seen.has(r.id));
	return [...picked, ...fill].slice(0, limit);
}, "bulletin:home", ["bulletin"]);

export const getPublicBulletinBySlug = cache(
	cached(async (slug: string): Promise<BulletinPage | null> => {
		const { data, error } = await liveOnly(createPublicClient().from("bulletin_items").select(PAGE).eq("slug", slug)).maybeSingle();
		if (error) throw new Error(`Failed to load notice: ${error.message}`);
		return data as unknown as BulletinPage | null;
	}, "bulletin:bySlug", ["bulletin"]),
);

/** Live items with a /bulletin page, for the sitemap. */
export const getBulletinSlugs = cached(async () => {
	const { data } = await liveOnly(createPublicClient().from("bulletin_items").select("slug,updated_at,category:bulletin_categories!inner(slug)")).eq("show_in_bulletin", true).limit(5000);
	return ((data ?? []) as unknown as { slug: string; updated_at: string }[]).map(({ slug, updated_at }) => ({ slug, updated_at }));
}, "bulletin:slugs", ["bulletin"]);

/* ------------------------------ Admin ------------------------------ */

export const BULLETIN_SORTS = {
	updated: { column: "updated_at", ascending: false },
	published: { column: "published_at", ascending: false },
	title: { column: "title", ascending: true },
	priority: { column: "display_priority", ascending: false },
} as const;

export type BulletinAdminRow = Pick<
	BulletinItem,
	"id" | "title" | "slug" | "content_type" | "status" | "published_at" | "expires_at" | "cover_image_url" | "is_pinned" | "is_featured" | "show_on_homepage" | "updated_at"
> & { category: { name: string } | null };

const ADMIN_ROW = "id,title,slug,content_type,status,published_at,expires_at,cover_image_url,is_pinned,is_featured,show_on_homepage,updated_at,category:bulletin_categories(name)";

export function adminListBulletin(opts: { q?: string; state?: string; type?: string; category?: string; sort?: string; page?: number; perPage?: number }) {
	return adminList<BulletinAdminRow>("bulletin_items", {
		columns: ADMIN_ROW,
		q: opts.q,
		searchColumns: ["title", "excerpt", "original_title"],
		state: "", // bulletin states differ from the shared draft/published model; filtered below
		page: opts.page,
		perPage: opts.perPage,
		order: BULLETIN_SORTS[opts.sort as keyof typeof BULLETIN_SORTS] ?? BULLETIN_SORTS.updated,
		refine: (query) => {
			const now = new Date().toISOString();
			let q = query;
			if (opts.type) q = q.eq("content_type", opts.type);
			if (opts.category) q = q.eq("category_id", opts.category);
			switch (opts.state) {
				case "draft":
				case "in_review":
				case "archived":
					return q.eq("status", opts.state);
				case "scheduled":
					return q.eq("status", "published").gt("published_at", now);
				case "published":
					return q.eq("status", "published").lte("published_at", now).or(`expires_at.is.null,expires_at.gt.${now}`);
				case "expired":
					return q.eq("status", "published").lte("expires_at", now);
				default:
					return q;
			}
		},
	});
}

export const adminGetBulletin = (id: string) => adminGet<BulletinItem>("bulletin_items", id);

/** Every category (also hidden ones) with how many items use it. */
export async function adminBulletinCategories(): Promise<(BulletinCategory & { items: number })[]> {
	const db = createAdminClient();
	const { data, error } = await db.from("bulletin_categories").select("id,name,slug,description,sort_order,is_active,bulletin_items(count)").order("sort_order").order("name");
	if (error) throw new Error(`Failed to load categories: ${error.message}`);
	return (data ?? []).map(({ bulletin_items, ...c }) => ({ ...(c as BulletinCategory), items: (bulletin_items as unknown as { count: number }[])[0]?.count ?? 0 }));
}

/** Every publisher with how many items use it. */
export async function adminBulletinPublishers(): Promise<(BulletinPublisher & { items: number })[]> {
	const db = createAdminClient();
	const { data, error } = await db.from("bulletin_publishers").select("id,name,slug,logo_url,website_url,bulletin_items(count)").order("name");
	if (error) throw new Error(`Failed to load publishers: ${error.message}`);
	return (data ?? []).map(({ bulletin_items, ...p }) => ({ ...(p as BulletinPublisher), items: (bulletin_items as unknown as { count: number }[])[0]?.count ?? 0 }));
}

/** Choices for the editor's relation fields (newest first). */
export async function adminRelationChoices(): Promise<{ events: { id: string; title: string }[]; projects: { id: string; title: string }[] }> {
	const db = createAdminClient();
	const [events, projects] = await Promise.all([
		db.from("events").select("id,title").order("starts_at", { ascending: false, nullsFirst: false }).limit(300),
		db.from("portfolios").select("id,title").order("completed_on", { ascending: false, nullsFirst: false }).limit(300),
	]);
	return { events: (events.data ?? []) as { id: string; title: string }[], projects: (projects.data ?? []) as { id: string; title: string }[] };
}
