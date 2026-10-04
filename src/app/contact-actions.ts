"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { RECAPTCHA_FAILED_MESSAGE, verifyRecaptcha } from "@/lib/recaptcha";

export type ContactState = {
	status: "idle" | "success" | "error";
	message?: string;
	errors?: Partial<Record<"name" | "email" | "message", string>>;
	/** Echoed back on error so the form keeps what the visitor typed. */
	values?: Record<"name" | "email" | "phone" | "topic" | "message", string>;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_FILL_MS = 3000;

/** Public contact form. Stored in contact_messages (service role), read in Admin → Inbox. */
export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
	const field = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);

	// Spam traps: a hidden field humans leave empty, and a minimum time to fill the form.
	const startedAt = Number(formData.get("started_at"));
	if (field("company", 200) || (Number.isFinite(startedAt) && Date.now() - startedAt < MIN_FILL_MS)) {
		return { status: "success", message: "Thanks! We'll get back to you soon." };
	}

	const name = field("name", 120);
	const email = field("email", 254).toLowerCase();
	const phone = field("phone", 40);
	const topic = field("topic", 120);
	const message = field("message", 5000);

	const errors: ContactState["errors"] = {};
	if (!name) errors.name = "Please enter your name.";
	if (!EMAIL.test(email)) errors.email = "Please enter a valid email address.";
	if (message.length < 10) errors.message = "Please tell us a bit more (at least 10 characters).";
	const values = { name, email, phone, topic, message };
	if (Object.keys(errors).length) return { status: "error", message: "Please check the highlighted fields.", errors, values };

	const human = await verifyRecaptcha(formData.get("recaptcha_token"), "contact");
	if (!human.ok) return { status: "error", message: RECAPTCHA_FAILED_MESSAGE, values };

	const { error } = await createAdminClient()
		.from("contact_messages")
		.insert({ name, email, phone: phone || null, topic: topic || null, message });
	if (error) return { status: "error", message: "Sorry, we couldn't send your message right now. Please try again in a moment.", values };

	revalidatePath("/admin/inbox");
	return { status: "success", message: `Salamat, ${name.split(" ")[0]}! Your message is in. We usually reply within 1–2 business days.` };
}
