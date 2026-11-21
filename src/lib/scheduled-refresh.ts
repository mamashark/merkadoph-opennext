import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { CACHE_GROUPS, type ContentTag } from "@/lib/cache";

/**
 * Pages refresh once a day (CACHE_TTL), and saving content purges at once. What changes without anyone saving
 * (a scheduled post going live, an offer starting or ending, an event starting or ending) is caught here:
 * the 15-minute cron purges just that content type when one of those moments has passed since the last run.
 * Each purge is a few tag writes; nothing is re-rendered until someone visits.
 */
const WINDOW_MS = 20 * 60_000; // a little more than the 15-minute schedule, so nothing falls between runs

const CHECKS: { tag: ContentTag; table: string; columns: string[] }[] = [
	{ tag: "blogs", table: "blogs", columns: ["published_at"] },
	{ tag: "events", table: "events", columns: ["published_at", "starts_at", "ends_at"] },
	{ tag: "promotions", table: "promotions", columns: ["published_at", "starts_at", "ends_at"] },
	{ tag: "services", table: "services", columns: ["published_at"] },
	{ tag: "portfolio", table: "portfolios", columns: ["published_at"] },
];

/** Purges the content types with a scheduled moment in the last window. Returns which ones (for the cron log). */
export async function refreshDueContent(now = new Date()): Promise<ContentTag[]> {
	const db = createAdminClient();
	const from = new Date(now.getTime() - WINDOW_MS).toISOString();
	const to = now.toISOString();
	const due: ContentTag[] = [];
	for (const c of CHECKS) {
		const crossed = c.columns.map((col) => `and(${col}.gt.${from},${col}.lte.${to})`).join(",");
		const { count, error } = await db.from(c.table).select("id", { count: "exact", head: true }).eq("status", "published").or(crossed);
		if (!error && count) due.push(c.tag);
	}
	for (const tag of due) {
		revalidateTag(tag, { expire: 0 });
		for (const { path, type } of CACHE_GROUPS[tag].paths) {
			if (type) revalidatePath(path, type);
			else revalidatePath(path);
		}
	}
	// The homepage shows every content type.
	if (due.length) revalidatePath("/");
	return due;
}
