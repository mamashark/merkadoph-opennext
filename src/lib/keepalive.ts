import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { latestOp, logOp } from "@/lib/ops";

/**
 * Supabase free projects pause after about 7 days without activity. A keep-alive runs a
 * small real query and writes a log row, which counts as activity.
 *
 * - Cron: Cloudflare runs it automatically twice a week (see wrangler.jsonc → triggers).
 * - Manual: the admin button, limited to once every 7 days.
 */
export const KEEPALIVE_CRON = "0 3 * * 1,4"; // 03:00 UTC every Monday and Thursday — keep in sync with wrangler.jsonc
export const KEEPALIVE_CRON_LABEL = "Mondays and Thursdays at 11:00 AM PH time";
export const MANUAL_COOLDOWN_MS = 7 * 24 * 3600 * 1000;

export async function runKeepAlive(source: "manual" | "cron", actorEmail: string | null) {
	const started = Date.now();
	try {
		const db = createAdminClient();
		const results = await Promise.all(
			(["blogs", "events", "promotions", "services"] as const).map((t) => db.from(t).select("id", { count: "exact", head: true })),
		);
		const failed = results.find((r) => r.error);
		if (failed?.error) throw new Error(failed.error.message);
		const counts = results.map((r) => r.count ?? 0);
		const duration = Date.now() - started;
		const message = `Database awake. Rows — blogs ${counts[0]}, events ${counts[1]}, promotions ${counts[2]}, services ${counts[3]}.`;
		await logOp({ kind: "keepalive", source, scope: "database", status: "success", message, duration_ms: duration, actor_email: actorEmail });
		return { ok: true as const, message, duration };
	} catch (err) {
		const duration = Date.now() - started;
		const message = err instanceof Error ? err.message : "Keep-alive failed.";
		// Logging can fail too if the database really is down; don't mask the original error.
		await logOp({ kind: "keepalive", source, scope: "database", status: "error", message, duration_ms: duration, actor_email: actorEmail }).catch(() => {});
		return { ok: false as const, message, duration };
	}
}

/** When the manual button is next allowed (null = available now). */
export async function nextManualAt(): Promise<Date | null> {
	const last = await latestOp("keepalive", { source: "manual", status: "success" });
	if (!last) return null;
	const next = new Date(new Date(last.created_at).getTime() + MANUAL_COOLDOWN_MS);
	return next.getTime() > Date.now() ? next : null;
}
