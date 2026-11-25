/** Helpers shared by every content type (blogs, events, promotions, services). */

export type ContentStatus = "draft" | "published";
/** Display state: a published row with a future publish date is "scheduled". */
export type ContentState = "draft" | "scheduled" | "published";

/** One photo in a gallery (Community Impact entry, blog post), picked from the media library. */
export type GalleryImage = { url: string; alt: string; description: string };

/**
 * B32: a page past the end. PostgREST answers `.range()` beyond the last row with "Requested range not satisfiable"
 * (code PGRST103); that is an empty page, not a failure, so callers return no rows and the page shows its 404.
 */
export const pastEnd = (error: { code?: string } | null) => error?.code === "PGRST103";

/**
 * Sig F1 (2026-11-25): a cached loader must not STORE that empty page, or every ?page=N becomes a KV write. It throws
 * this instead (errors are never cached) and `cachedPaged()` (lib/cache.ts) turns it into the empty result outside
 * the cache.
 */
export class PastEndError extends Error {
	constructor() {
		super("Page past the end");
		this.name = "PastEndError";
	}
}
export const isPastEnd = (e: unknown) => e instanceof Error && e.name === "PastEndError";

/** Highest ?page= we look up; anything above is past the end of every list (defence in depth with F1). */
export const MAX_PAGE = 1000;

/** Distinct tags across rows, most used first (then A–Z): the filters show the common ones before "More tags". */
export function tagsByUse(rows: Array<{ tags?: string[] | null }>): string[] {
	const counts = new Map<string, number>();
	for (const r of rows) for (const t of r.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
	return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}

export type ContentTable = "blogs" | "events" | "promotions" | "services" | "portfolios" | "products" | "product_categories" | "product_tags";

export function contentState(row: { status: ContentStatus; published_at: string | null }): ContentState {
	if (row.status !== "published") return "draft";
	return row.published_at && new Date(row.published_at).getTime() > Date.now() ? "scheduled" : "published";
}

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

/** Plain-text version of Markdown, for excerpts and descriptions. */
export function toPlainText(markdown: string): string {
	return markdown
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[#>*_`~-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function summarize(row: { excerpt: string | null; content: string; meta_description: string | null }, max = 160): string {
	const text = row.meta_description || row.excerpt || toPlainText(row.content);
	return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

export function readingMinutes(markdown: string): number {
	return Math.max(1, Math.round(toPlainText(markdown).split(" ").filter(Boolean).length / 220));
}

export function isHttpUrl(value: string): boolean {
	try {
		return ["http:", "https:"].includes(new URL(value).protocol);
	} catch {
		return false;
	}
}

/** Escapes characters PostgREST treats specially inside `ilike` / `or` filters. */
export function searchTerm(q: string): string {
	return q.replace(/[%_,()*\\]/g, " ").trim();
}

/** Reads a string search param (Next passes string | string[] | undefined). */
export function param(params: Record<string, string | string[] | undefined>, key: string): string {
	const v = params[key];
	return typeof v === "string" ? v : "";
}

export function pageParam(params: Record<string, string | string[] | undefined>): number {
	return Math.min(MAX_PAGE + 1, Math.max(1, Math.floor(Number(param(params, "page"))) || 1));
}
