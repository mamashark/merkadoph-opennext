import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";
import { secret } from "@/lib/secrets";

/**
 * Service-role client. Bypasses RLS — only call it after `requireAdmin()` has passed
 * (or from a secret-protected route), and never import it from a Client Component.
 */
export function createAdminClient() {
	return createClient(SUPABASE_URL, secret("SUPABASE_SERVICE_ROLE_KEY"), {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}
