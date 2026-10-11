"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth-shared";
import { getCurrentUser } from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { audit, securityEvent } from "@/lib/audit";
import { formFields, loginSchema, otpSchema } from "@/lib/validation";

/** Only allow redirects back into the admin area, never to another origin. */
function safeNext(value: string | null | undefined): string {
	const next = value ?? "";
	return next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

export async function signIn(formData: FormData) {
	const raw = formFields(formData, ["email", "password", "next"]);
	const email = raw.email.trim().toLowerCase().slice(0, 254);
	const next = safeNext(raw.next);
	const back: (error: string) => never = (error) => redirect(`/login?${new URLSearchParams({ error, email, next })}`);

	const parsed = loginSchema.safeParse(raw);
	if (!parsed.success) back("missing");

	// Brute-force protection: per IP and per account.
	const ip = await clientIp();
	if (!(await rateLimit("auth", "login", [ip, email]))) {
		await securityEvent("auth.rate_limited", "Login rate limit hit", { email });
		back("rate");
	}

	if (!(await verifyRecaptcha(formData.get("recaptcha_token"), "login")).ok) {
		await securityEvent("auth.captcha_failed", "Login reCAPTCHA check failed", { email });
		back("captcha");
	}

	const supabase = await createClient();
	const { data, error } = await supabase.auth.signInWithPassword({ email, password: raw.password });
	if (error || !data.user) {
		await securityEvent("auth.login_failed", "Wrong email or password", { email });
		back("invalid");
	}

	if (!isAdmin(data.user)) {
		await supabase.auth.signOut();
		await securityEvent("auth.login_forbidden", "Non-admin tried to sign in to the admin", { email });
		back("forbidden");
	}

	// Second step for admins with an authenticator app.
	const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
	if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect(`/login/mfa?${new URLSearchParams({ next })}`);

	await audit({ kind: "security", action: "auth.login", summary: "Signed in", actor: { id: data.user.id, email } });
	redirect(next);
}

/** Second login step: 6-digit code from the authenticator app. */
export async function verifyMfa(formData: FormData) {
	const next = safeNext(String(formData.get("next") ?? ""));
	const back = (error: string): never => redirect(`/login/mfa?${new URLSearchParams({ error, next })}`);

	const user = await getCurrentUser();
	if (!user) redirect("/login");

	if (!(await rateLimit("auth", "mfa", [user.id, await clientIp()]))) back("rate");

	const code = otpSchema.safeParse(formData.get("code") ?? "");
	if (!code.success) back("format");

	const supabase = await createClient();
	const { data: factors } = await supabase.auth.mfa.listFactors();
	const factor = factors?.totp.find((f) => f.status === "verified");
	if (!factor) redirect(next);

	const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.data! });
	if (error) {
		await securityEvent("auth.mfa_failed", "Wrong two-factor code", { email: user.email ?? null });
		back("code");
	}
	await audit({ kind: "security", action: "auth.login", summary: "Signed in (with two-factor)", actor: { id: user.id, email: user.email ?? null } });
	redirect(next);
}

export async function signOut() {
	const supabase = await createClient();
	const user = await getCurrentUser().catch(() => null);
	await supabase.auth.signOut();
	if (user) await audit({ kind: "security", action: "auth.logout", summary: "Signed out", actor: { id: user.id, email: user.email ?? null } });
	redirect("/login?notice=signed-out");
}
