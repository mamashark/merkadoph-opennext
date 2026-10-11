import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { secret } from "@/lib/secrets";

/**
 * Transactional email via Resend's REST API (fetch only — runs on Workers). shop-reference.md §8, A9.
 * - No RESEND_API_KEY (dev, or before the domain is set up): nothing is sent, the email is logged as "skipped".
 * - Every attempt is written to `email_log` (no message bodies — only who, what and the outcome).
 * - Never throws: an email problem must not break checkout or an admin action.
 */
export type EmailMessage = {
	template: string;
	to: string;
	subject: string;
	html: string;
	text: string;
	from: string;
	replyTo?: string | null;
	orderId?: string | null;
	/** Same key within 24 h = Resend sends once (protects against retries/double triggers). */
	idempotencyKey?: string;
};

export type SendResult = { status: "sent" | "failed" | "skipped"; id?: string; error?: string };

function apiKey(): string | null {
	try {
		return secret("RESEND_API_KEY");
	} catch {
		return null;
	}
}

async function log(m: EmailMessage, r: SendResult) {
	await createAdminClient()
		.from("email_log")
		.insert({ template: m.template, to_email: m.to.slice(0, 254), subject: m.subject.slice(0, 300), status: r.status, provider_id: r.id ?? null, error: r.error?.slice(0, 500) ?? null, order_id: m.orderId ?? null })
		.then(({ error }) => error && console.error("[email.log]", error.message));
}

/** True if this template was already sent for this order (don't send twice). */
export async function alreadySent(template: string, orderId: string): Promise<boolean> {
	const { count } = await createAdminClient().from("email_log").select("id", { count: "exact", head: true }).eq("template", template).eq("order_id", orderId).eq("status", "sent");
	return (count ?? 0) > 0;
}

export async function sendEmail(m: EmailMessage): Promise<SendResult> {
	let result: SendResult;
	const key = apiKey();
	if (!key || !m.from.includes("@")) {
		result = { status: "skipped", error: !key ? "RESEND_API_KEY not set" : "No sender address (Admin → Shop → Emails)" };
		console.info(`[email] skipped ${m.template} → ${m.to}: ${result.error}`);
	} else {
		try {
			const res = await fetch("https://api.resend.com/emails", {
				method: "POST",
				headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(m.idempotencyKey ? { "Idempotency-Key": m.idempotencyKey.slice(0, 256) } : {}) },
				body: JSON.stringify({ from: m.from, to: [m.to], subject: m.subject, html: m.html, text: m.text, ...(m.replyTo ? { reply_to: m.replyTo } : {}), tags: [{ name: "template", value: m.template.replace(/[^\w-]/g, "_") }] }),
			});
			const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
			result = res.ok ? { status: "sent", id: json.id } : { status: "failed", error: json.message ?? res.statusText };
		} catch (err) {
			result = { status: "failed", error: err instanceof Error ? err.message : "network error" };
		}
		if (result.status === "failed") console.error(`[email] ${m.template} → failed: ${result.error}`);
	}
	await log(m, result);
	return result;
}
