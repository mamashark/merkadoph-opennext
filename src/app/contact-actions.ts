"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { RECAPTCHA_FAILED_MESSAGE, verifyRecaptcha } from "@/lib/recaptcha";
import { RATE_LIMITED_MESSAGE, clientIp, rateLimit } from "@/lib/rate-limit";
import { securityEvent } from "@/lib/audit";
import { contactSchema, fieldErrors, formFields } from "@/lib/validation";

export type ContactState = {
	status: "idle" | "success" | "error";
	message?: string;
	errors?: Partial<Record<string, string>>;
	/** Echoed back on error so the form keeps what the visitor typed. */
	values?: Record<"name" | "email" | "phone" | "topic" | "message", string>;
};

const MIN_FILL_MS = 3000;

/** Public contact form. Stored in contact_messages (service role), read in Admin → Inbox. */
export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
	const field = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);

	// Spam traps: a hidden field humans leave empty, and a minimum time to fill the form.
	const startedAt = Number(formData.get("started_at"));
	if (field("company", 200) || (Number.isFinite(startedAt) && Date.now() - startedAt < MIN_FILL_MS)) {
		return { status: "success", message: "Thanks! We'll get back to you soon." };
	}

	const raw = formFields(formData, ["name", "email", "phone", "topic", "message"]);
	const values = { name: raw.name.slice(0, 120), email: raw.email.slice(0, 254), phone: raw.phone.slice(0, 40), topic: raw.topic.slice(0, 120), message: raw.message.slice(0, 5000) };
	const parsed = contactSchema.safeParse(raw);
	if (!parsed.success) {
		const errors = fieldErrors(parsed);
		return { status: "error", message: errors.phone ?? errors.topic ?? "Please check the highlighted fields.", errors, values };
	}
	const { name, email, phone, topic, message } = parsed.data;

	if (!(await rateLimit("forms", "contact", [await clientIp()]))) {
		await securityEvent("forms.rate_limited", "Contact form rate limit hit", { email });
		return { status: "error", message: RATE_LIMITED_MESSAGE, values };
	}

	const human = await verifyRecaptcha(formData.get("recaptcha_token"), "contact");
	if (!human.ok) {
		await securityEvent("forms.captcha_failed", "Contact form reCAPTCHA check failed", { email });
		return { status: "error", message: RECAPTCHA_FAILED_MESSAGE, values };
	}

	const { error } = await createAdminClient()
		.from("contact_messages")
		.insert({ name, email, phone: phone || null, topic: topic || null, message });
	if (error) return { status: "error", message: "Sorry, we couldn't send your message right now. Please try again in a moment.", values };

	revalidatePath("/admin/inbox");
	return { status: "success", message: `Salamat, ${name.split(" ")[0]}! Your message is in. We usually reply within 1–2 business days.` };
}
