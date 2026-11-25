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

const SOCIAL_LABELS: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", linkedin: "LinkedIn" };

/**
 * Public site chrome (header with section navigation + footer), shared by (site)/* and the homepage.
 * Every page uses the site design system (globals.css `--site-*`, Kay 2026-11-25): the homepage's cream day page in
 * light mode and its night sky in dark mode, square corners, thin lines and Plex Mono labels, the same on every page.
 * Header: Merkado PH (home) · Highlights menu · Search ··· Get in touch (`contactHref`, else the homepage's contact section).
 * With `revealAt` (the homepage) the header has no logo and stays hidden until that section scrolls into view.
 */
export async function SiteShell({
	children,
	contactHref,
	revealAt,
}: {
	children: React.ReactNode;
	contactHref?: string;
	revealAt?: string;
	/** @deprecated No effect: every page has the same look. Only the old, unrendered home-page.tsx still passes it
	 *  (guidelines §8: that file isn't edited). */
	tone?: string;
}) {
	const [shop, seo] = await Promise.all([getShopSettings().catch(() => null), getSeoSettings()]);
	const shopEnabled = shop?.enabled ?? false;
	const social = socialLinks(seo);
	const addressLines = [seo.street, [seo.postal_code, seo.city].filter(Boolean).join(" ")].filter(Boolean);
	const analyticsToken = process.env.NODE_ENV === "production" ? seo.cf_analytics_token : "";
	return (
		<div className="flex min-h-dvh flex-col bg-site-bg text-site-ink">
			<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-site-surface focus:px-4 focus:py-2 focus:text-site-ink focus:outline-2 focus:outline-accent">
				Skip to content
			</a>
			{(() => {
				const bar = "border-b border-site-line bg-site-bg/90 backdrop-blur";
				const inner = (
					<div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
						<nav aria-label="Main" className="flex min-w-0 items-center gap-1 sm:gap-3">
							{!revealAt && (
								<Link href="/" className="flex shrink-0 items-center gap-2 pr-1 font-display text-[15px] font-bold tracking-tight text-site-ink">
									{/* The bag: dark lines on light backgrounds, white lines on dark ones. */}
									<Image src="/brand/mark.png" alt="" width={53} height={64} className="h-8 w-auto dark:hidden" priority />
									<Image src="/brand/mark-on-dark.png" alt="" width={53} height={64} className="hidden h-8 w-auto dark:block" priority />
									<span className="max-sm:sr-only">Merkado PH</span>
								</Link>
							)}
							<HighlightsMenu shop={shopEnabled} />
							<Link
								href="/search"
								className="flex min-h-10 items-center gap-1.5 border border-transparent px-2.5 font-label text-xs font-medium tracking-[0.1em] text-site-ink uppercase hover:border-site-line-2"
							>
								<span className="max-sm:sr-only">Search</span>
								<Search className="h-4 w-4" aria-hidden />
							</Link>
						</nav>
						<div className="ml-auto flex shrink-0 items-center gap-2">
							{shopEnabled && <CartButton />}
							<a
								href={contactHref ?? DEFAULT_CONTACT_HREF}
								className="inline-flex min-h-10 items-center whitespace-nowrap border border-site-ink bg-site-ink px-4 font-label text-xs font-medium tracking-[0.1em] text-site-bg uppercase transition-colors hover:bg-transparent hover:text-site-ink"
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
					<header className={`sticky top-0 z-30 ${bar}`}>{inner}</header>
				);
			})()}

			<div id="main" className="flex-1">
				{children}
			</div>

			<footer className="border-t border-site-line">
				<div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-site-ink-2 sm:grid-cols-3 sm:px-6">
					<div>
						<p className="font-display text-base font-bold text-site-ink">{seo.business_name}</p>
						<address className="mt-2 space-y-0.5 not-italic">
							{addressLines.map((line) => (
								<span key={line} className="block">
									{line}
								</span>
							))}
							{seo.phone && (
								<a href={`tel:${seo.phone.replace(/[^\d+]/g, "")}`} className="block hover:text-site-ink hover:underline">
									{seo.phone}
								</a>
							)}
							{seo.email && (
								<a href={`mailto:${seo.email}`} className="block hover:text-site-ink hover:underline">
									{seo.email}
								</a>
							)}
						</address>
					</div>
					<nav aria-label="Legal">
						<p className="font-label text-xs font-medium tracking-[0.14em] text-site-muted uppercase">Information</p>
						<ul className="mt-2 space-y-1">
							{Object.values(LEGAL_PAGES).map((p) => (
								<li key={p.path}>
									<Link href={p.path} className="hover:text-site-ink hover:underline">
										{p.title}
									</Link>
								</li>
							))}
							<li>
								<Link href="/blogs/rss.xml" className="hover:text-site-ink hover:underline" prefetch={false}>
									Blog RSS feed
								</Link>
							</li>
						</ul>
					</nav>
					{social.length > 0 && (
						<nav aria-label="Social media">
							<p className="font-label text-xs font-medium tracking-[0.14em] text-site-muted uppercase">Follow us</p>
							<ul className="mt-2 space-y-1">
								{social.map((s) => (
									<li key={s.network}>
										<a href={s.url} target="_blank" rel="noopener noreferrer me" className="hover:text-site-ink hover:underline">
											{SOCIAL_LABELS[s.network]}
											<span className="sr-only"> (opens in a new tab)</span>
										</a>
									</li>
								))}
							</ul>
						</nav>
					)}
				</div>
				<div className="border-t border-site-line">
					<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-center font-label text-xs text-site-muted sm:flex-row sm:flex-wrap sm:gap-x-6 sm:px-6">
						<p>
							© {new Date().getFullYear()} {seo.legal_name || seo.business_name}. All rights reserved.
						</p>
						<p className="font-medium text-site-ink-2">Merkado PH: Ang Bagong Yugto</p>
						{/* Site credit ("Designed & built by KLA", Kay 2026-11-25), linking to the public case study (Kay, 2026-11-25). */}
						<p>
							Designed &amp; built by KLA ·{" "}
							<Link href="/case-study" className="text-site-ink-2 underline decoration-site-line-2 underline-offset-4 hover:text-site-ink hover:decoration-current">
								How this site was built
							</Link>
						</p>
					</div>
				</div>
			</footer>
			<JsonLd data={siteJsonLd(seo)} />
			{analyticsToken && <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: analyticsToken })} />}
		</div>
	);
}
