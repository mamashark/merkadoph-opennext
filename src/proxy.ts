import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdmin } from "@/lib/auth-shared";
import { safeEqual, STAGE_COOKIE, STAGE_COOKIE_MAX_AGE, STAGE_PARAM, stageGateEnabled, stageToken } from "@/lib/stage";

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/login") return authProxy(request);
	return stageGate(request);
}

/**
 * Public pages while the site is in "coming soon" mode (see src/lib/stage.ts).
 * Runs before the page cache, so cached pages are gated too.
 */
async function stageGate(request: NextRequest) {
	if (!stageGateEnabled()) return NextResponse.next();

	const { pathname, searchParams } = request.nextUrl;
	if (pathname === "/maintenance") return NextResponse.next();

	const key = process.env.STAGE_KEY;
	const given = searchParams.get(STAGE_PARAM);

	// ?staged=KEY → remember this browser, then continue on the clean URL. ?staged=off → forget it.
	if (given !== null) {
		const clean = request.nextUrl.clone();
		clean.searchParams.delete(STAGE_PARAM);
		if (given === "off") {
			const res = NextResponse.redirect(clean);
			res.cookies.delete(STAGE_COOKIE);
			return res;
		}
		if (key && safeEqual(given, key)) {
			const res = NextResponse.redirect(clean);
			res.cookies.set(STAGE_COOKIE, await stageToken(key), {
				httpOnly: true,
				secure: request.nextUrl.protocol === "https:",
				sameSite: "lax",
				path: "/",
				maxAge: STAGE_COOKIE_MAX_AGE,
			});
			return res;
		}
	}

	const cookie = request.cookies.get(STAGE_COOKIE)?.value;
	if (key && cookie && safeEqual(cookie, await stageToken(key))) {
		const res = NextResponse.next();
		// Staged pages must never be indexed.
		res.headers.set("X-Robots-Tag", "noindex, nofollow");
		return res;
	}

	// Locked: the homepage shows the maintenance page; every other public page goes back to it.
	if (pathname === "/") return NextResponse.rewrite(new URL("/maintenance", request.url));
	return NextResponse.redirect(new URL("/", request.url));
}

/**
 * Refreshes the Supabase session cookie and guards /admin.
 * This is the first line of defence only — the admin layout and every Server Action
 * re-check with `requireAdmin()`.
 */
async function authProxy(request: NextRequest) {
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

	if (pathname === "/admin" || pathname.startsWith("/admin/")) {
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
	// Every page except Next internals, API routes and files with an extension (images, robots.txt, sitemap.xml…).
	matcher: ["/((?!_next/|api/|.*\\.\\w+$).*)"],
};
