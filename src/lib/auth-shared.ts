import type { User } from "@supabase/supabase-js";

/** Role stored in `app_metadata` (only settable with the service role, never by the user). */
export const ADMIN_ROLE = "admin";

export function isAdmin(user: Pick<User, "app_metadata"> | null | undefined): boolean {
	return user?.app_metadata?.role === ADMIN_ROLE;
}
