import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/** Anonymous, cookie-less client for public pages. Subject to RLS (published blogs only). */
export function createPublicClient() {
	return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}
