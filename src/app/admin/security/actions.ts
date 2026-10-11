"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { otpSchema } from "@/lib/validation";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** Step 1: create a TOTP factor and return its QR code + secret for the authenticator app. */
export async function startMfaEnrollment(): Promise<Result<{ factorId: string; qr: string; secret: string }>> {
	await requireAdmin();
	const supabase = await createClient();
	// Clear abandoned (unverified) attempts first.
	const { data: factors } = await supabase.auth.mfa.listFactors();
	for (const f of factors?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });

	const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
	if (error || !data) return { ok: false, error: error?.message ?? "Couldn't start two-factor setup." };
	return { ok: true, data: { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret } };
}

/** Step 2: confirm with a code from the app. Upgrades this session to aal2. */
export async function confirmMfaEnrollment(factorId: string, code: string): Promise<Result<null>> {
	const me = await requireAdmin();
	const parsed = otpSchema.safeParse(code);
	if (!parsed.success) return { ok: false, error: "Enter the 6-digit code from your app." };
	const supabase = await createClient();
	const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: parsed.data });
	if (error) return { ok: false, error: "That code didn't work. Wait for the next code and try again." };
	await audit({ kind: "security", action: "auth.mfa_enrolled", summary: "Two-factor authentication turned on", actor: { id: me.id, email: me.email } });
	revalidatePath("/admin", "layout");
	return { ok: true, data: null };
}

export async function removeMfa(formData: FormData) {
	const me = await requireAdmin(); // requires aal2 when a factor exists
	const supabase = await createClient();
	const { error } = await supabase.auth.mfa.unenroll({ factorId: String(formData.get("factorId") ?? "") });
	if (error) redirect(`/admin/security?${new URLSearchParams({ error: error.message })}`);
	await audit({ kind: "security", action: "auth.mfa_removed", summary: "Two-factor authentication removed", actor: { id: me.id, email: me.email } });
	revalidatePath("/admin", "layout");
	redirect("/admin/security?notice=Two-factor+authentication+removed.");
}

/** Revokes every session of this account (all browsers/devices). */
export async function signOutEverywhere() {
	const me = await requireAdmin();
	await audit({ kind: "security", action: "auth.logout_all", summary: "Signed out of all devices", actor: { id: me.id, email: me.email } });
	const supabase = await createClient();
	await supabase.auth.signOut({ scope: "global" });
	redirect("/login?notice=signed-out");
}
