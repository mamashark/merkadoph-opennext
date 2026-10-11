import Image from "next/image";
import Link from "next/link";
import { NavLinks } from "./nav-links";
import { CartButton } from "@/components/shop/cart-button";
import { getShopSettings } from "@/lib/shop";
import { getSeoSettings, LEGAL_PAGES, siteJsonLd, socialLinks } from "@/lib/site-settings";
import { JsonLd } from "./json-ld";
import { cn } from "@/lib/ui";

const SOCIAL_LABELS: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", linkedin: "LinkedIn" };

/**
 * Public site chrome (header with section navigation + footer), shared by (site)/* and the homepage.
 * Every page is #faf9f6 in light mode; `tone="home"` also uses the homepage's dark palette (see globals.css).
 */
export async function SiteShell({ children, contactHref, tone = "default" }: { children: React.ReactNode; contactHref?: string; tone?: "default" | "home" }) {
	const home = tone === "home";
	const [shop, seo] = await Promise.all([getShopSettings().catch(() => null), getSeoSettings()]);
	const shopEnabled = shop?.enabled ?? false;
	const social = socialLinks(seo);
	const addressLines = [seo.street, [seo.postal_code, seo.city].filter(Boolean).join(" ")].filter(Boolean);
	const analyticsToken = process.env.NODE_ENV === "production" ? seo.cf_analytics_token : "";
	return (
		<div className={cn("flex min-h-dvh flex-col text-stone-900 dark:text-stone-100", home ? "bg-home-bg" : "bg-[#faf9f6] dark:bg-stone-950")}>
			<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-stone-900">
				Skip to content
			</a>
			<header
				className={cn("sticky top-0 z-30 border-b border-amber-900/10 backdrop-blur dark:border-white/10", home ? "bg-home-bg/90" : "bg-[#faf9f6]/90 dark:bg-stone-950/85")}
			>
				<div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
					<Link href="/" aria-label="Merkado PH home" className="w-fit rounded-lg dark:bg-white dark:px-2 dark:py-1">
						<Image src="/logo.webp" alt="Merkado PH" width={600} height={188} loading="eager" sizes="144px" className="h-auto w-32 sm:w-36" />
					</Link>
					<nav aria-label="Main" className="flex items-center gap-2">
						<NavLinks shop={shopEnabled} />
						{shopEnabled && <CartButton />}
						{contactHref && (
							<a
								href={contactHref}
								className="hidden whitespace-nowrap rounded-full bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-stone-950 dark:hover:bg-teal-400 sm:inline-block"
							>
								Get a quote
							</a>
						)}
					</nav>
				</div>
			</header>

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
