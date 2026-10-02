import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SUPABASE_URL } from "@/lib/env";

/**
 * The service role key is a Cloudflare secret: on the deployed Worker it is copied into
 * process.env; under `next dev` it comes from `.dev.vars` via the Cloudflare context.
 * It is deliberately not kept in any .env file, because OpenNext bundles those into the Worker.
 */
function serviceRoleKey(): string {
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? (getCloudflareContext().env as Record<string, unknown>).SUPABASE_SERVICE_ROLE_KEY;
	if (typeof key !== "string" || !key) throw new Error("Missing secret: SUPABASE_SERVICE_ROLE_KEY");
	return key;
}

/**
 * Service-role client. Bypasses RLS — only call it after `requireAdmin()` has passed,
 * and never import it from a Client Component.
 */
export function createAdminClient() {
	return createClient(SUPABASE_URL, serviceRoleKey(), {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}
