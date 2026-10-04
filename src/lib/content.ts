/** Helpers shared by every content type (blogs, events, promotions, services). */

export type ContentStatus = "draft" | "published";
/** Display state: a published row with a future publish date is "scheduled". */
export type ContentState = "draft" | "scheduled" | "published";

export type ContentTable = "blogs" | "events" | "promotions" | "services" | "products" | "product_categories" | "product_tags";

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
	return Math.max(1, Math.floor(Number(param(params, "page"))) || 1);
}
