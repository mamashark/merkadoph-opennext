import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { findRedirect, recordRedirectHit } from "@/lib/redirect-lookup";
import { siteUrl } from "@/lib/env";
import { createServerClient } from "@supabase/ssr";
import { isAdmin } from "@/lib/auth-shared";
import { SESSION_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";
import { safeEqual, STAGE_COOKIE, STAGE_COOKIE_MAX_AGE, STAGE_PARAM, stageGateEnabled, stageToken } from "@/lib/stage";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
	const { pathname } = request.nextUrl;
	if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/login" || pathname.startsWith("/login/")) return authProxy(request);

	// Moved pages (Admin → SEO → Redirects, and automatic ones from slug changes). Query string is kept.
	const moved = pathname === "/" ? null : await findRedirect(pathname);
	if (moved) {
		// Internal targets are built on NEXT_PUBLIC_SITE_URL (reference.md), never on the request's host.
		const target = /^https?:\/\//.test(moved.to) ? new URL(moved.to) : siteUrl(moved.to);
		if (!/^https?:\/\//.test(moved.to)) request.nextUrl.searchParams.forEach((v, k) => target.searchParams.append(k, v));
		event.waitUntil(recordRedirectHit(pathname));
		return NextResponse.redirect(target, moved.status);
	}
	const gated = await stageGate(request);
	// Personal shop pages: keep the shopper's session fresh and never cache or index them.
	if (SHOPPER_PATH.test(pathname) && gated.headers.get("x-middleware-next") === "1") return shopperSession(request);
	return gated;
}

/** Account, cart, checkout, wishlist and auth-link routes (shop-reference.md §14). */
const SHOPPER_PATH = /^\/(account|cart|checkout|wishlist|auth)(\/|$)/;

/** Refreshes the Supabase session cookie (Server Components can't write cookies themselves). */
async function shopperSession(request: NextRequest) {
	let response = NextResponse.next({ request });
	const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
		cookieOptions: SESSION_COOKIE_OPTIONS,
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
	await supabase.auth.getUser();
	response.headers.set("Cache-Control", "private, no-store");
	response.headers.set("X-Robots-Tag", "noindex, nofollow");
	return response;
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
		const rest = new URLSearchParams(searchParams);
		rest.delete(STAGE_PARAM);
		const clean = siteUrl(`${pathname}${rest.size ? `?${rest}` : ""}`);
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
	// (A rewrite serves another page of this same request, so it stays on request.url.)
	if (pathname === "/") return NextResponse.rewrite(new URL("/maintenance", request.url));
	return NextResponse.redirect(siteUrl("/"));
}

/**
 * Refreshes the Supabase session cookie and guards /admin.
 * This is the first line of defence only — the admin layout and every Server Action
 * re-check with `requireAdmin()`.
 */
async function authProxy(request: NextRequest) {
	let response = NextResponse.next({ request });

	const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
		cookieOptions: SESSION_COOKIE_OPTIONS,
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
		const query = new URLSearchParams(params).toString();
		const res = NextResponse.redirect(siteUrl(`${path}${query ? `?${query}` : ""}`));
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
		// /admin will send them on to /login/mfa if a second factor is still pending.
		return redirectTo("/admin");
	}

	if (pathname === "/login" || pathname.startsWith("/login/")) {
		response.headers.set("Cache-Control", "private, no-store");
		response.headers.set("X-Robots-Tag", "noindex, nofollow");
	}

	return response;
}

export const config = {
	// Every page except Next internals, API routes and files with an extension (images, robots.txt, sitemap.xml…).
	matcher: ["/((?!_next/|api/|.*\\.\\w+$).*)"],
};
