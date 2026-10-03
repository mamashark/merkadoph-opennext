"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { nextManualAt, runKeepAlive } from "@/lib/keepalive";
import { formatDate } from "@/lib/datetime";

export async function triggerKeepAlive() {
	const me = await requireAdmin();

	// Enforced here too, not only by the disabled button.
	const next = await nextManualAt();
	if (next) redirect(`/admin/supabase?${new URLSearchParams({ error: `Manual keep-alive is available again on ${formatDate(next.toISOString(), { dateStyle: "medium", timeStyle: "short" })}.` })}`);

	const result = await runKeepAlive("manual", me.email);
	revalidatePath("/admin/supabase");
	redirect(`/admin/supabase?${new URLSearchParams(result.ok ? { notice: `${result.message} (${result.duration} ms)` } : { error: result.message })}`);
}
