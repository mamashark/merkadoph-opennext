import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { HighlightsMenu } from "./highlights-menu";
import { DEFAULT_CONTACT_HREF } from "./site-nav";
import { CartButton } from "@/components/shop/cart-button";
import { getShopSettings } from "@/lib/shop";
import { getSeoSettings, LEGAL_PAGES, siteJsonLd, socialLinks } from "@/lib/site-settings";
import { JsonLd } from "./json-ld";
import { RevealHeader } from "./reveal-header";
import { cn } from "@/lib/ui";

const SOCIAL_LABELS: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", linkedin: "LinkedIn" };

/**
 * Public site chrome (header with section navigation + footer), shared by (site)/* and the homepage.
 * Every page is #faf9f6 in light mode; `tone="home"` also uses the homepage's dark palette (see globals.css);
 * `tone="night"` matches the Highlights homepage (day sky in light mode, night sky in dark mode).
 * Header: Merkado PH (home) · Highlights menu · Search ··· Get in touch (`contactHref`, else the homepage's contact section).
 * With `revealAt` (the homepage) the header has no logo and stays hidden until that section scrolls into view.
 */
export async function SiteShell({
	children,
	contactHref,
	tone = "default",
	revealAt,
}: {
	children: React.ReactNode;
	contactHref?: string;
	tone?: "default" | "home" | "night";
	revealAt?: string;
}) {
	const home = tone === "home";
	const night = tone === "night";
	const [shop, seo] = await Promise.all([getShopSettings().catch(() => null), getSeoSettings()]);
	const shopEnabled = shop?.enabled ?? false;
	const social = socialLinks(seo);
	const addressLines = [seo.street, [seo.postal_code, seo.city].filter(Boolean).join(" ")].filter(Boolean);
	const analyticsToken = process.env.NODE_ENV === "production" ? seo.cf_analytics_token : "";
	return (
		<div className={cn("flex min-h-dvh flex-col text-stone-900 dark:text-stone-100", night ? "bg-[#f7f5ee] dark:bg-[#03051a]" : home ? "bg-home-bg" : "bg-[#faf9f6] dark:bg-stone-950")}>
			<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-stone-900">
				Skip to content
			</a>
			{(() => {
				const bar = cn("border-b border-amber-900/10 backdrop-blur dark:border-white/10", night ? "bg-[#f7f5ee]/90 dark:bg-[#03051a]/85" : home ? "bg-home-bg/90" : "bg-[#faf9f6]/90 dark:bg-stone-950/85");
				const inner = (
					<div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
						<nav aria-label="Main" className="flex min-w-0 items-center gap-1 sm:gap-3">
							{!revealAt && (
								<Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg pr-1 text-[15px] font-semibold tracking-tight text-stone-950 dark:text-white">
									{/* The bag: dark lines on light backgrounds, white lines on dark ones. */}
									<Image src="/brand/mark.png" alt="" width={53} height={64} className="h-8 w-auto dark:hidden" priority />
									<Image src="/brand/mark-on-dark.png" alt="" width={53} height={64} className="hidden h-8 w-auto dark:block" priority />
									<span className="max-sm:sr-only">Merkado PH</span>
								</Link>
							)}
							<HighlightsMenu shop={shopEnabled} />
							<Link
								href="/search"
								className="flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-stone-800 hover:bg-stone-900/5 dark:text-stone-200 dark:hover:bg-white/10"
							>
								<span className="max-sm:sr-only">Search</span>
								<Search className="h-4 w-4" aria-hidden />
							</Link>
						</nav>
						<div className="ml-auto flex shrink-0 items-center gap-2">
							{shopEnabled && <CartButton />}
							<a
								href={contactHref ?? DEFAULT_CONTACT_HREF}
								className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-stone-950 dark:hover:bg-teal-400"
							>
								<span className="max-[400px]:hidden">Get in touch</span>
								<span className="min-[401px]:hidden">Contact</span>
							</a>
						</div>
					</div>
				);
				return revealAt ? (
					<RevealHeader revealAt={revealAt} className={bar}>
						{inner}
					</RevealHeader>
				) : (
					<header className={cn("sticky top-0 z-30", bar)}>{inner}</header>
				);
			})()}

			<div id="main" className="flex-1">
				{children}
			</div>

			<footer className="border-t border-amber-900/10 dark:border-white/10">
				<div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-stone-700 dark:text-stone-300 sm:grid-cols-3 sm:px-6">
					<div>
						<p className="font-semibold text-stone-950 dark:text-white">{seo.business_name}</p>
						<address className="mt-2 space-y-0.5 not-italic">
							{addressLines.map((line) => (
								<span key={line} className="block">
									{line}
								</span>
							))}
							{seo.phone && (
								<a href={`tel:${seo.phone.replace(/[^d+]/g, "")}`} className="block hover:text-teal-800 hover:underline dark:hover:text-teal-300">
									{seo.phone}
								</a>
							)}
							{seo.email && (
								<a href={`mailto:${seo.email}`} className="block hover:text-teal-800 hover:underline dark:hover:text-teal-300">
									{seo.email}
								</a>
							)}
						</address>
					</div>
					<nav aria-label="Legal">
						<p className="font-semibold text-stone-950 dark:text-white">Information</p>
						<ul className="mt-2 space-y-1">
							{Object.values(LEGAL_PAGES).map((p) => (
								<li key={p.path}>
									<Link href={p.path} className="hover:text-teal-800 hover:underline dark:hover:text-teal-300">
										{p.title}
									</Link>
								</li>
							))}
							<li>
								<Link href="/blogs/rss.xml" className="hover:text-teal-800 hover:underline dark:hover:text-teal-300" prefetch={false}>
									Blog RSS feed
								</Link>
							</li>
						</ul>
					</nav>
					{social.length > 0 && (
						<nav aria-label="Social media">
							<p className="font-semibold text-stone-950 dark:text-white">Follow us</p>
							<ul className="mt-2 space-y-1">
								{social.map((s) => (
									<li key={s.network}>
										<a href={s.url} target="_blank" rel="noopener noreferrer me" className="hover:text-teal-800 hover:underline dark:hover:text-teal-300">
											{SOCIAL_LABELS[s.network]}
											<span className="sr-only"> (opens in a new tab)</span>
										</a>
									</li>
								))}
							</ul>
						</nav>
					)}
				</div>
				<div className="border-t border-amber-900/10 dark:border-white/10">
					<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-sm text-stone-600 dark:text-stone-400 sm:flex-row sm:px-6">
						<p>
							© {new Date().getFullYear()} {seo.legal_name || seo.business_name}. All rights reserved.
						</p>
						<p className="font-medium text-stone-700 dark:text-stone-300">Merkado PH: Bagong Yugto, coming soon! Abangan!</p>
					</div>
				</div>
			</footer>
			<JsonLd data={siteJsonLd(seo)} />
			{analyticsToken && <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: analyticsToken })} />}
		</div>
	);
}
