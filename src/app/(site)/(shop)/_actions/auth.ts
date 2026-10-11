"use server";

import { redirect } from "next/navigation";
import { verifyRecaptcha, type RecaptchaAction } from "@/lib/recaptcha";
import { securityEvent } from "@/lib/audit";
import { formFields } from "@/lib/validation";
import * as auth from "@/server/shop/auth";
import { fail, type Result } from "@/server/shop/result";

/**
 * Website transport for the shopper auth service (shop-reference.md §13.1): parse the form,
 * check reCAPTCHA, call the service. Shaped for `useActionState(action, initial)`.
 * Business rules, validation and rate limits live in src/server/shop/auth.ts.
 */
export type FormResult<T = unknown> = (Result<T> & { values?: Record<string, string> }) | null;

async function human(formData: FormData, action: RecaptchaAction, email: string) {
	const check = await verifyRecaptcha(formData.get("recaptcha_token"), action);
	if (!check.ok) await securityEvent("auth.captcha_failed", `Shop ${action} reCAPTCHA check failed`, { email });
	return check.ok;
}

/** Echo typed values back on error — never passwords. */
const keep = (raw: Record<string, string>) => Object.fromEntries(Object.entries(raw).filter(([k]) => !k.includes("password")));

export async function registerAction(_prev: FormResult, formData: FormData): Promise<FormResult<{ message: string }>> {
	const raw = formFields(formData, ["first_name", "last_name", "email", "password"]);
	if (!(await human(formData, "register", raw.email))) return { ...fail("CAPTCHA"), values: keep(raw) };
	const res = await auth.register({ ...raw, marketing_opt_in: formData.get("marketing_opt_in") === "on" });
	return { ...res, values: res.ok ? undefined : keep(raw) };
}

export async function signInAction(_prev: FormResult, formData: FormData): Promise<FormResult<{ next: string }>> {
	const raw = formFields(formData, ["email", "password", "next"]);
	if (!(await human(formData, "shop_login", raw.email))) return { ...fail("CAPTCHA"), values: keep(raw) };
	const res = await auth.signIn(raw);
	if (res.ok) redirect(res.data.next);
	return { ...res, values: keep(raw) };
}

export async function signOutAction(): Promise<void> {
	await auth.signOut();
	redirect("/");
}

export async function requestPasswordResetAction(_prev: FormResult, formData: FormData): Promise<FormResult<{ message: string }>> {
	const raw = formFields(formData, ["email"]);
	if (!(await human(formData, "password_reset", raw.email))) return { ...fail("CAPTCHA"), values: raw };
	return auth.requestPasswordReset(raw);
}

export async function resendVerificationAction(_prev: FormResult, formData: FormData): Promise<FormResult<{ message: string }>> {
	const raw = formFields(formData, ["email"]);
	if (!(await human(formData, "resend_verification", raw.email))) return { ...fail("CAPTCHA"), values: raw };
	return auth.resendVerification(raw);
}

export async function resetPasswordAction(_prev: FormResult, formData: FormData): Promise<FormResult<null>> {
	const res = await auth.resetPassword(formFields(formData, ["password"]));
	if (res.ok) redirect("/account?notice=password-reset");
	return res;
}

export async function changePasswordAction(_prev: FormResult, formData: FormData): Promise<FormResult<null>> {
	return auth.changePassword(formFields(formData, ["current_password", "password"]));
}

export async function changeEmailAction(_prev: FormResult, formData: FormData): Promise<FormResult<{ message: string }>> {
	const raw = formFields(formData, ["email", "current_password"]);
	const res = await auth.changeEmail(raw);
	return { ...res, values: res.ok ? undefined : keep(raw) };
}
