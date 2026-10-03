import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchTerm } from "@/lib/content";

// Service-role only. Callers must have passed requireAdmin().

export type ContactMessage = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	topic: string | null;
	message: string;
	status: "new" | "read" | "archived";
	created_at: string;
};

export async function listMessages({ q, status, page = 1, perPage = 20 }: { q?: string; status?: string; page?: number; perPage?: number }) {
	let query = createAdminClient().from("contact_messages").select("*", { count: "exact" });
	if (status === "new" || status === "read" || status === "archived") query = query.eq("status", status);
	else query = query.neq("status", "archived");
	const term = q ? searchTerm(q) : "";
	if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,topic.ilike.%${term}%,message.ilike.%${term}%`);
	const from = (page - 1) * perPage;
	const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load messages: ${error.message}`);
	return { rows: (data ?? []) as ContactMessage[], total: count ?? 0 };
}

export async function countNewMessages(): Promise<number> {
	const { count } = await createAdminClient().from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new");
	return count ?? 0;
}
