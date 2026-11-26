import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "*.supabase.co";
const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy (security.md §13). No nonces on purpose: Next.js 16 nonce CSP forces every
 * page to render per request, which would disable our ISR/page cache — so inline scripts are allowed,
 * while sources, framing, plugins, base URL and form targets stay locked down.
 */
const csp = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://static.cloudflareinsights.com",
	"style-src 'self' 'unsafe-inline'",
	`img-src 'self' data: blob: https://${supabaseHost}`,
	"font-src 'self' data:",
	// Blog videos / reels are files in our own Supabase Storage (the same host images come from). No third-party players.
	`media-src 'self' https://${supabaseHost}`,
	"connect-src 'self' https://www.google.com/recaptcha/ https://cloudflareinsights.com",
	"frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
	"frame-ancestors 'none'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"manifest-src 'self'",
	"worker-src 'self' blob:",
	"upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
	{ key: "Cross-Origin-Opener-Policy", value: "same-origin" },
	...(isProd
		? [
				{ key: "Content-Security-Policy", value: csp },
				{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
			]
		: []),
];

const nextConfig: NextConfig = {
	poweredByHeader: false,
	images: {
		// Press clippings use quality 90; Next only honours listed qualities (default [75]).
		qualities: [75, 90],
		remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
	},
	experimental: {
		// Media uploads go through Server Actions: 5 × 2 MB WebP, or one 20 MB blog video (upload-rules.ts), + form overhead.
		serverActions: { bodySizeLimit: "22mb" },
	},
	async headers() {
		return [{ source: "/:path*", headers: securityHeaders }];
	},
	// Portfolio became Community Impact (2026-11-19). Relative destinations, so they follow the site's own host.
	async redirects() {
		return [
			{ source: "/portfolio", destination: "/impact", permanent: true },
			{ source: "/portfolio/:slug", destination: "/impact/:slug", permanent: true },
		];
	},
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
