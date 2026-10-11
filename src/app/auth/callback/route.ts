import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";
import { getShopSettings } from "@/lib/shop";
import { audit } from "@/lib/audit";
import { getShopperContext } from "@/server/shop/context";
import { clearGuestToken } from "@/server/shop/guest-token";
import { afterSignIn, safeShopNext } from "@/server/shop/transitions";

/**
 * Landing route for links in Supabase Auth emails (shop-reference.md §2.2, §2.5):
 *   /auth/callback?token_hash=…&type=signup|email|recovery|email_change&next=/account
 * The token_hash form (set in Supabase → Auth → Email templates) works even when the link is
 * opened in another browser; `?code=` (PKCE) is accepted too.
 */
const TYPES = new Set<EmailOtpType>(["signup", "email", "recovery", "email_change", "invite", "magiclink"]);

export async function GET(request: NextRequest) {
	const url = request.nextUrl;
	const to = (path: string) => {
		const res = NextResponse.redirect(siteUrl(path));
		res.headers.set("Cache-Control", "private, no-store");
		res.headers.set("Referrer-Policy", "no-referrer"); // the URL carried a one-time token
		return res;
	};

	if (!(await getShopSettings().catch(() => null))?.enabled) return to("/");

	const type = url.searchParams.get("type") as EmailOtpType | null;
	const tokenHash = url.searchParams.get("token_hash");
	const code = url.searchParams.get("code");
	const guestTokenHash = (await getShopperContext()).guestTokenHash;
	const supabase = await createClient();

	let error: { message: string } | null = null;
	if (tokenHash && type && TYPES.has(type)) ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
	else if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
	else return to("/account/login?error=link");

	if (error) {
		console.error("[auth/callback]", error.message);
		return to(`/account/login?error=${type === "recovery" ? "reset-link" : "link"}`);
	}

	// Fresh session: per-request caches still say "signed out", so read the user from this client.
	const { data } = await supabase.auth.getUser();
	const user = data.user;
	if (user) {
		const customer = {
			id: user.id,
			email: user.email ?? "",
			emailVerified: !!user.email_confirmed_at,
			name: (user.user_metadata?.full_name as string) || "",
			isAdmin: user.app_metadata?.role === "admin",
		};
		// Mark this as a password-recovery sign-in (checked by resetPassword; only the service role can write app_metadata).
		if (type === "recovery") await createAdminClient().auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, recovery_at: Math.floor(Date.now() / 1000) } });
		await afterSignIn(customer, guestTokenHash);
		await clearGuestToken();
		if (type === "signup" || type === "email") await audit({ kind: "security", action: "auth.email_verified", summary: "Customer email verified", actor: { id: user.id, email: user.email ?? null } });
	}

	if (type === "recovery") return to("/account/reset-password");
	if (type === "email_change") return to("/account?notice=email-changed");
	return to(safeShopNext(url.searchParams.get("next")));
}
