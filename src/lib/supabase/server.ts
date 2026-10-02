import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/** Cookie-bound client for the signed-in user's session (Server Components, Server Actions, Route Handlers). */
export async function createClient() {
	const cookieStore = await cookies();

	return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
				} catch {
					// Called from a Server Component: cookies are read-only there. The proxy refreshes the session instead.
				}
			},
		},
	});
}
