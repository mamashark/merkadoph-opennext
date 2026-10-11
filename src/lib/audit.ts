import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { searchTerm } from "@/lib/content";

/**
 * Audit trail (security.md §9): admin changes ("admin") and security events ("security").
 * Never throws — a failed log must not break the action being logged. Don't put secrets or
 * full personal data in `details`.
 */
export type AuditEntry = {
	kind: "admin" | "security";
	action: string;
	entity?: string;
	entityId?: string | null;
	summary?: string;
	details?: Record<string, unknown>;
	/** Defaults to the signed-in user (if any). */
	actor?: { id: string | null; email: string | null };
};

export async function audit(entry: AuditEntry): Promise<void> {
	try {
		const [h, user] = await Promise.all([headers(), entry.actor ? Promise.resolve(null) : getCurrentUser().catch(() => null)]);
		const actor = entry.actor ?? { id: user?.id ?? null, email: user?.email ?? null };
		await createAdminClient()
			.from("audit_logs")
			.insert({
				kind: entry.kind,
				action: entry.action.slice(0, 80),
				actor_id: actor.id,
				actor_email: actor.email,
				entity: entry.entity?.slice(0, 60) ?? null,
				entity_id: entry.entityId?.slice(0, 120) ?? null,
				summary: entry.summary?.slice(0, 500) ?? null,
				details: entry.details ?? null,
				ip: h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
				user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
			});
	} catch (err) {
		console.error("audit log failed:", err instanceof Error ? err.message : err);
	}
}

/** Security event shorthand (failed logins, rate limits, captcha failures, bad signatures…). */
export type AuditRow = {
	id: string;
	kind: "admin" | "security";
	action: string;
	actor_email: string | null;
	entity: string | null;
	entity_id: string | null;
	summary: string | null;
	details: Record<string, unknown> | null;
	ip: string | null;
	user_agent: string | null;
	created_at: string;
};

/** Admin → Audit log. Service role; callers must have passed requireAdmin(). */
export async function listAuditLogs({ q, kind, area, sort = "", page = 1, perPage = 25 }: { q?: string; kind?: string; area?: string; sort?: string; page?: number; perPage?: number }) {
	let query = createAdminClient().from("audit_logs").select("*", { count: "exact" });
	if (kind === "admin" || kind === "security") query = query.eq("kind", kind);
	if (area && /^[a-z_]+$/.test(area)) query = query.like("action", `${area}.%`);
	const term = q ? searchTerm(q) : "";
	if (term) query = query.or(`action.ilike.%${term}%,summary.ilike.%${term}%,actor_email.ilike.%${term}%,ip.ilike.%${term}%,entity_id.ilike.%${term}%`);
	const from = (page - 1) * perPage;
	const [column, ascending] = sort === "oldest" ? ["created_at", true] : sort === "action" ? ["action", true] : sort === "actor" ? ["actor_email", true] : ["created_at", false];
	const { data, count, error } = await query.order(column as string, { ascending: ascending as boolean }).range(from, from + perPage - 1);
	if (error) throw new Error(error.message);
	return { rows: (data ?? []) as AuditRow[], total: count ?? 0 };
}

export function securityEvent(action: string, summary: string, details?: Record<string, unknown>) {
	return audit({ kind: "security", action, summary, details, actor: { id: null, email: typeof details?.email === "string" ? details.email : null } });
}
