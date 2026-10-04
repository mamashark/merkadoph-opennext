import "server-only";
import { headers } from "next/headers";
import { secret } from "@/lib/secrets";

/** Minimum reCAPTCHA v3 score (0 = bot, 1 = human). Google recommends 0.5 as a starting point. */
export const RECAPTCHA_MIN_SCORE = 0.5;

export type RecaptchaAction = "contact" | "checkout" | "login";
export type RecaptchaResult = { ok: true; score: number | null } | { ok: false; reason: "missing-token" | "invalid" | "action-mismatch" | "low-score" | "unavailable"; score?: number };

/**
 * Verifies a reCAPTCHA v3 token server-side (Google siteverify).
 * If RECAPTCHA_SECRET_KEY isn't configured the check is skipped (so forms keep working),
 * with a warning in the logs; once configured it is enforced.
 */
export async function verifyRecaptcha(token: FormDataEntryValue | null, action: RecaptchaAction): Promise<RecaptchaResult> {
	let key: string;
	try {
		key = secret("RECAPTCHA_SECRET_KEY");
	} catch {
		console.warn("reCAPTCHA: RECAPTCHA_SECRET_KEY is not set — verification skipped.");
		return { ok: true, score: null };
	}

	const response = typeof token === "string" ? token.trim() : "";
	if (!response) return { ok: false, reason: "missing-token" };

	const h = await headers();
	const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
	try {
		const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ secret: key, response, ...(ip ? { remoteip: ip } : {}) }),
		});
		const data = (await res.json()) as { success: boolean; score?: number; action?: string; "error-codes"?: string[] };
		if (!data.success) return { ok: false, reason: "invalid" };
		if (data.action !== action) return { ok: false, reason: "action-mismatch", score: data.score };
		if ((data.score ?? 0) < RECAPTCHA_MIN_SCORE) return { ok: false, reason: "low-score", score: data.score };
		return { ok: true, score: data.score ?? null };
	} catch {
		// Google unreachable: don't lock real customers out.
		console.warn("reCAPTCHA: verification request failed — allowing the submission.");
		return { ok: true, score: null };
	}
}

export const RECAPTCHA_FAILED_MESSAGE = "We couldn't verify that you're human. Please try again — or contact us if this keeps happening.";
