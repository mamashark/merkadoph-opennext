import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth-shared";

export { ADMIN_ROLE, isAdmin } from "@/lib/auth-shared";

export type SessionUser = {
	id: string;
	email: string;
	name: string;
	role: string;
};

function toSessionUser(user: User): SessionUser {
	const email = user.email ?? "";
	return {
		id: user.id,
		email,
		name: (user.user_metadata?.full_name as string | undefined) || email.split("@")[0],
		role: (user.app_metadata?.role as string | undefined) ?? "user",
	};
}

/** Verified current user (validated against Supabase Auth, not just the cookie). Cached per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
	const supabase = await createClient();
	const { data } = await supabase.auth.getUser();
	return data.user ?? null;
});

/**
 * Gate for every admin page and Server Action. The proxy already redirects anonymous
 * visitors, but actions can be invoked directly, so each one must call this too.
 */
export async function requireAdmin(): Promise<SessionUser> {
	const user = await getCurrentUser();
	if (!user) redirect("/login");
	if (!isAdmin(user)) redirect("/login?error=forbidden");
	return toSessionUser(user);
}
