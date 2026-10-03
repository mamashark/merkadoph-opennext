"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const back = (formData: FormData, flash: Record<string, string>) => {
	// Return to the same filtered/paginated view.
	const qs = new URLSearchParams(String(formData.get("return") ?? ""));
	["notice", "error"].forEach((k) => qs.delete(k));
	Object.entries(flash).forEach(([k, v]) => qs.set(k, v));
	redirect(`/admin/inbox?${qs}`);
};

export async function setMessageStatus(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") ?? "");
	const status = String(formData.get("status") ?? "");
	if (!["new", "read", "archived"].includes(status)) back(formData, { error: "Unknown status." });
	const { error } = await createAdminClient().from("contact_messages").update({ status }).eq("id", id);
	revalidatePath("/admin/inbox");
	revalidatePath("/admin");
	back(formData, error ? { error: error.message } : { notice: status === "archived" ? "Message archived." : status === "read" ? "Marked as read." : "Marked as new." });
}

export async function deleteMessage(formData: FormData) {
	await requireAdmin();
	const { error } = await createAdminClient()
		.from("contact_messages")
		.delete()
		.eq("id", String(formData.get("id") ?? ""));
	revalidatePath("/admin/inbox");
	revalidatePath("/admin");
	back(formData, error ? { error: error.message } : { notice: "Message deleted." });
}
