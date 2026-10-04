"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth-shared";
import { verifyRecaptcha } from "@/lib/recaptcha";

/** Only allow redirects back into the admin area, never to another origin. */
function safeNext(value: FormDataEntryValue | null): string {
	const next = typeof value === "string" ? value : "";
	return next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

export async function signIn(formData: FormData) {
	const email = String(formData.get("email") ?? "").trim().toLowerCase();
	const password = String(formData.get("password") ?? "");
	const next = safeNext(formData.get("next"));

	const back: (error: string) => never = (error) => redirect(`/login?${new URLSearchParams({ error, email, next })}`);

	if (!email || !password) back("missing");

	if (!(await verifyRecaptcha(formData.get("recaptcha_token"), "login")).ok) back("captcha");

	const supabase = await createClient();
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });

	if (error || !data.user) back("invalid");

	if (!isAdmin(data.user)) {
		await supabase.auth.signOut();
		back("forbidden");
	}

	redirect(next);
}

export async function signOut() {
	const supabase = await createClient();
	await supabase.auth.signOut();
	redirect("/login?notice=signed-out");
}
