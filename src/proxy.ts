import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdmin } from "@/lib/auth-shared";

/**
 * Refreshes the Supabase session cookie on matched requests and guards /admin.
 * This is the first line of defence only — the admin layout and every Server Action
 * re-check with `requireAdmin()`.
 */
export async function proxy(request: NextRequest) {
	let response = NextResponse.next({ request });

	const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
				response = NextResponse.next({ request });
				cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
			},
		},
	});

	// getUser() validates the token with Supabase Auth; do not swap for getSession() here.
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { pathname, search } = request.nextUrl;

	const redirectTo = (path: string, params: Record<string, string> = {}) => {
		const url = request.nextUrl.clone();
		url.pathname = path;
		url.search = new URLSearchParams(params).toString();
		const res = NextResponse.redirect(url);
		// Carry any refreshed auth cookies across the redirect.
		response.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
		return res;
	};

	const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

	if (isAdminRoute) {
		if (!user) return redirectTo("/login", { next: pathname + search });
		if (!isAdmin(user)) return redirectTo("/login", { error: "forbidden" });

		response.headers.set("Cache-Control", "private, no-store");
		response.headers.set("X-Robots-Tag", "noindex, nofollow");
	}

	if (pathname === "/login" && isAdmin(user)) {
		return redirectTo("/admin");
	}

	return response;
}

export const config = {
	matcher: ["/admin", "/admin/:path*", "/login"],
};
