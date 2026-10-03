"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { CACHE_GROUP_IDS, CACHE_GROUPS, purgeAll, purgeGroups, type CacheGroupId } from "@/lib/cache";
import { logOp } from "@/lib/ops";

export async function purgeCache(formData: FormData) {
	const me = await requireAdmin();
	const target = String(formData.get("group") ?? "");
	const started = Date.now();

	let label: string;
	if (target === "all") {
		purgeAll();
		label = "Everything";
	} else if (CACHE_GROUP_IDS.includes(target as CacheGroupId)) {
		purgeGroups([target as CacheGroupId]);
		label = CACHE_GROUPS[target as CacheGroupId].label;
	} else {
		redirect(`/admin/cache?${new URLSearchParams({ error: "Unknown cache group." })}`);
	}

	await logOp({
		kind: "cache_purge",
		source: "manual",
		scope: label,
		status: "success",
		message: target === "all" ? "Purged all cached data and pages." : `Purged: ${CACHE_GROUPS[target as CacheGroupId].description}`,
		duration_ms: Date.now() - started,
		actor_email: me.email,
	}).catch(() => {}); // Purging must not fail just because the log table is missing.

	redirect(`/admin/cache?${new URLSearchParams({ notice: `${label} cache purged. Visitors get fresh pages on their next visit.` })}`);
}
