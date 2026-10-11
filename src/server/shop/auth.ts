import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CUSTOMER_ROLE, isAdmin, isCustomer } from "@/lib/auth-shared";
import { SITE_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { audit, securityEvent } from "@/lib/audit";
import { changeEmailSchema, changePasswordSchema, emailOnlySchema, fieldErrors, newPasswordSchema, registerSchema, shopLoginSchema } from "@/lib/validation";
import { assertShopOpen, getCustomer, getShopperContext } from "./context";
import { clearGuestToken } from "./guest-token";
import { afterSignIn, safeShopNext } from "./transitions";
import { fail, internal, ok, type Result } from "./result";

/**
 * Shopper authentication (shop-reference.md §2, A2). Services validate and rate-limit themselves
 * so every transport (Server Actions now, maybe a REST API later) gets the same protection;
 * transports add bot checks (reCAPTCHA) on top.
 *
 * Answers never reveal whether an email has an account (security.md 1.8).
 */

const callback = (next: string) => `${SITE_URL}/auth/callback?${new URLSearchParams({ next })}`;
const CHECK_INBOX = "If that email can be used, we've sent a link to it. Check your inbox (and spam folder).";

async function limited(action: string, keys: string[]) {
	if (await rateLimit("auth", action, keys)) return false;
	await securityEvent("auth.rate_limited", `Shop ${action} rate limit hit`, { email: keys.find((k) => k.includes("@")) ?? null });
	return true;
}

/** Verifies a password without touching the visitor's session cookie. */
export async function passwordMatches(email: string, password: string): Promise<boolean> {
	const probe = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
	const { error } = await probe.auth.signInWithPassword({ email, password });
	if (error) return false;
	await probe.auth.signOut({ scope: "local" }); // drop the throwaway session
	return true;
}

/* ------------------------------------------------------------------ */

export type RegisterInput = { first_name: string; last_name: string; email: string; password: string; marketing_opt_in: boolean };

/** Creates a customer account and sends the verification email. Always answers the same way. */
export async function register(input: RegisterInput): Promise<Result<{ message: string }>> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	const parsed = registerSchema.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", undefined, fieldErrors(parsed));
	const v = parsed.data;
	if (await limited("register", [await clientIp(), v.email])) return fail("RATE_LIMITED");

	const supabase = await createClient();
	const { data, error } = await supabase.auth.signUp({
		email: v.email,
		password: v.password,
		options: { emailRedirectTo: callback("/account"), data: { full_name: `${v.first_name} ${v.last_name}`.trim() } },
	});
	if (error) {
		// Weak/leaked password is the only error worth showing; everything else stays generic.
		if (error.code === "weak_password") return fail("VALIDATION", undefined, { password: "Please choose a stronger password." });
		if (error.code === "over_email_send_rate_limit") return fail("RATE_LIMITED");
		if (error.code === "email_address_invalid") return fail("VALIDATION", undefined, { email: "Please enter a valid email address." });
		return internal("register", error);
	}

	// A brand-new user has identities; an existing email returns an obfuscated user without any.
	const user = data.user;
	if (user && (user.identities?.length ?? 0) > 0 && !user.app_metadata?.role) {
		const admin = createAdminClient();
		const { error: roleError } = await admin.auth.admin.updateUserById(user.id, { app_metadata: { role: CUSTOMER_ROLE } });
		if (roleError) return internal("register.role", roleError);
		const { error: profileError } = await admin.from("customer_profiles").upsert({
			id: user.id,
			first_name: v.first_name,
			last_name: v.last_name,
			marketing_opt_in: v.marketing_opt_in,
			marketing_opt_in_at: v.marketing_opt_in ? new Date().toISOString() : null,
		});
		if (profileError) return internal("register.profile", profileError);
		await audit({ kind: "security", action: "auth.customer_registered", entity: "customer", entityId: user.id, summary: "Customer account created", actor: { id: user.id, email: v.email } });
	}
	return ok({ message: CHECK_INBOX });
}

export type SignInInput = { email: string; password: string; next?: string };

/** Email + password sign-in for shoppers. Merges this device's guest data into the account. */
export async function signIn(input: SignInInput): Promise<Result<{ next: string }>> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	const parsed = shopLoginSchema.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", undefined, fieldErrors(parsed));
	const { email, password } = parsed.data;
	if (await limited("shop_login", [await clientIp(), email])) return fail("RATE_LIMITED");

	const guestTokenHash = (await getShopperContext()).guestTokenHash; // read before the session changes
	const supabase = await createClient();
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });
	if (error || !data.user) {
		if (error?.code === "email_not_confirmed") return fail("EMAIL_NOT_VERIFIED");
		await securityEvent("auth.shop_login_failed", "Shop sign-in failed", { email });
		return fail("VALIDATION", "Incorrect email or password.");
	}

	const user = data.user;
	if (!isCustomer(user) && !isAdmin(user)) {
		// Older accounts without a role: shoppers by default (never upgrades anyone to admin).
		if (!user.app_metadata?.role) await createAdminClient().auth.admin.updateUserById(user.id, { app_metadata: { role: CUSTOMER_ROLE } });
		else {
			await supabase.auth.signOut();
			return fail("FORBIDDEN", "This account can't sign in to the shop.");
		}
	}

	const customer = { id: user.id, email: user.email ?? email, emailVerified: !!user.email_confirmed_at, name: (user.user_metadata?.full_name as string) || email.split("@")[0], isAdmin: isAdmin(user) };
	await afterSignIn(customer, guestTokenHash);
	await clearGuestToken();
	await audit({ kind: "security", action: "auth.shop_login", summary: "Shopper signed in", actor: { id: user.id, email: customer.email } });
	return ok({ next: safeShopNext(input.next) });
}

/** Signs out this device only. The account's cart stays in the account; the device starts fresh. */
export async function signOut(): Promise<Result<null>> {
	const customer = await getCustomer();
	const supabase = await createClient();
	await supabase.auth.signOut({ scope: "local" });
	await clearGuestToken();
	if (customer) await audit({ kind: "security", action: "auth.shop_logout", summary: "Shopper signed out", actor: { id: customer.id, email: customer.email } });
	return ok(null);
}

/** "Forgot password": always the same answer, whether or not the account exists. */
export async function requestPasswordReset(input: { email: string }): Promise<Result<{ message: string }>> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	const parsed = emailOnlySchema.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", undefined, fieldErrors(parsed));
	if (await limited("password_reset", [await clientIp(), parsed.data.email])) return fail("RATE_LIMITED");
	const { error } = await (await createClient()).auth.resetPasswordForEmail(parsed.data.email, { redirectTo: callback("/account/reset-password") });
	if (error && error.code !== "over_email_send_rate_limit") console.error("[shop:requestPasswordReset]", error.message);
	return ok({ message: CHECK_INBOX });
}

/** Sends the verification email again (same answer for unknown emails). */
export async function resendVerification(input: { email: string }): Promise<Result<{ message: string }>> {
	const open = await assertShopOpen();
	if (!open.ok) return open;
	const parsed = emailOnlySchema.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", undefined, fieldErrors(parsed));
	if (await limited("resend_verification", [await clientIp(), parsed.data.email])) return fail("RATE_LIMITED");
	const { error } = await (await createClient()).auth.resend({ type: "signup", email: parsed.data.email, options: { emailRedirectTo: callback("/account") } });
	if (error && error.code !== "over_email_send_rate_limit") console.error("[shop:resendVerification]", error.message);
	return ok({ message: CHECK_INBOX });
}

/** Max age of a recovery sign-in that may set a new password without the old one. */
const RECOVERY_WINDOW_S = 15 * 60;

/**
 * Sets a new password from the "forgot password" link. Only allowed in a session that was
 * created by that link in the last 15 minutes — otherwise anyone signed in could skip the
 * current-password check of `changePassword`.
 */
export async function resetPassword(input: { password: string }): Promise<Result<null>> {
	const customer = await getCustomer();
	if (!customer) return fail("RECOVERY_REQUIRED");
	const parsed = newPasswordSchema.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", undefined, fieldErrors(parsed));

	// Proof of a recovery link: /auth/callback stamps app_metadata.recovery_at (server-only field), and this
	// session must have been created by that link (one-time-code sign-in at or after the stamp).
	const supabase = await createClient();
	const { data: userData } = await supabase.auth.getUser();
	const stampedAt = Number(userData.user?.app_metadata?.recovery_at ?? 0);
	const nowS = Date.now() / 1000;
	const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
	const viaLink = aal?.currentAuthenticationMethods?.some((m) => typeof m !== "string" && m.method === "otp" && m.timestamp >= stampedAt - 60);
	if (!userData.user || !stampedAt || nowS - stampedAt > RECOVERY_WINDOW_S || !viaLink) return fail("RECOVERY_REQUIRED");

	const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
	if (error) return error.code === "same_password" ? fail("VALIDATION", undefined, { password: "Choose a password you haven't used here before." }) : internal("resetPassword", error);
	await createAdminClient().auth.admin.updateUserById(userData.user.id, { app_metadata: { ...userData.user.app_metadata, recovery_at: null } });
	await supabase.auth.signOut({ scope: "others" });
	await audit({ kind: "security", action: "auth.password_reset", summary: "Password reset via email link", actor: { id: customer.id, email: customer.email } });
	return ok(null);
}

/** Signed-in password change: requires the current password; signs out other devices. */
export async function changePassword(input: { current_password: string; password: string }): Promise<Result<null>> {
	const customer = await getCustomer();
	if (!customer) return fail("AUTH_REQUIRED");
	const parsed = changePasswordSchema.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", undefined, fieldErrors(parsed));
	if (await limited("change_password", [customer.id])) return fail("RATE_LIMITED");
	if (!(await passwordMatches(customer.email, parsed.data.current_password))) {
		await securityEvent("auth.reauth_failed", "Wrong current password (change password)", { email: customer.email });
		return fail("VALIDATION", undefined, { current_password: "That isn't your current password." });
	}
	const supabase = await createClient();
	const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
	if (error) return error.code === "same_password" ? fail("VALIDATION", undefined, { password: "Choose a different password from your current one." }) : internal("changePassword", error);
	await supabase.auth.signOut({ scope: "others" });
	await audit({ kind: "security", action: "auth.password_changed", summary: "Password changed", actor: { id: customer.id, email: customer.email } });
	return ok(null);
}

/** Starts an email change: Supabase emails a confirmation link (to both addresses with secure email change). */
export async function changeEmail(input: { email: string; current_password: string }): Promise<Result<{ message: string }>> {
	const customer = await getCustomer();
	if (!customer) return fail("AUTH_REQUIRED");
	const parsed = changeEmailSchema.safeParse(input);
	if (!parsed.success) return fail("VALIDATION", undefined, fieldErrors(parsed));
	if (parsed.data.email === customer.email.toLowerCase()) return fail("VALIDATION", undefined, { email: "That's already your email address." });
	if (await limited("change_email", [customer.id])) return fail("RATE_LIMITED");
	if (!(await passwordMatches(customer.email, parsed.data.current_password))) {
		await securityEvent("auth.reauth_failed", "Wrong current password (change email)", { email: customer.email });
		return fail("VALIDATION", undefined, { current_password: "That isn't your current password." });
	}
	const { error } = await (await createClient()).auth.updateUser({ email: parsed.data.email }, { emailRedirectTo: callback("/account") });
	if (error) return error.code === "email_exists" ? ok({ message: CHECK_INBOX }) : internal("changeEmail", error);
	await audit({ kind: "security", action: "auth.email_change_requested", summary: "Email change requested", actor: { id: customer.id, email: customer.email } });
	return ok({ message: "We've sent a confirmation link. Your email changes once you click it." });
}
