import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchTerm } from "@/lib/content";

// Service-role only. Callers must have passed requireAdmin() or the cron secret check.

export type OpsKind = "keepalive" | "cache_purge";
export type OpsLog = {
	id: number;
	kind: OpsKind;
	source: "manual" | "cron";
	scope: string | null;
	status: "success" | "error";
	message: string | null;
	duration_ms: number | null;
	actor_email: string | null;
	created_at: string;
};

export async function logOp(entry: Omit<OpsLog, "id" | "created_at">): Promise<void> {
	await createAdminClient()
		.from("ops_logs")
		.insert({ ...entry, message: entry.message?.slice(0, 1000) ?? null });
}

export async function listOps(opts: { kind: OpsKind; q?: string; source?: string; status?: string; page?: number; perPage?: number }) {
	const { kind, q, source, status, page = 1, perPage = 20 } = opts;
	let query = createAdminClient().from("ops_logs").select("*", { count: "exact" }).eq("kind", kind);
	if (source === "manual" || source === "cron") query = query.eq("source", source);
	if (status === "success" || status === "error") query = query.eq("status", status);
	const term = q ? searchTerm(q) : "";
	if (term) query = query.or(`message.ilike.%${term}%,actor_email.ilike.%${term}%,scope.ilike.%${term}%`);
	const from = (page - 1) * perPage;
	const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load logs: ${error.message}`);
	return { rows: (data ?? []) as OpsLog[], total: count ?? 0 };
}

export async function latestOp(kind: OpsKind, filter: { source?: "manual" | "cron"; status?: "success" | "error" } = {}): Promise<OpsLog | null> {
	let query = createAdminClient().from("ops_logs").select("*").eq("kind", kind);
	if (filter.source) query = query.eq("source", filter.source);
	if (filter.status) query = query.eq("status", filter.status);
	const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
	return (data as OpsLog | null) ?? null;
}
