import Image from "next/image";
import Link from "next/link";
import { NavLinks } from "@/components/site/nav-links";

/** Public site shell for /blogs, /events, /promotions and /services. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-dvh flex-col bg-[#fbf7ef] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
			<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-stone-900">
				Skip to content
			</a>
			<header className="sticky top-0 z-30 border-b border-amber-900/10 bg-[#fbf7ef]/90 backdrop-blur dark:border-white/10 dark:bg-stone-950/85">
				<div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0 sm:px-6">
					<Link href="/" aria-label="Merkado PH home" className="w-fit rounded-lg dark:bg-white dark:px-2 dark:py-1">
						<Image src="/logo.webp" alt="Merkado PH" width={600} height={188} loading="eager" sizes="144px" className="h-auto w-32 sm:w-36" />
					</Link>
					<nav aria-label="Main">
						<NavLinks />
					</nav>
				</div>
			</header>

			<div id="main" className="flex-1">
				{children}
			</div>

			<footer className="border-t border-amber-900/10 dark:border-white/10">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-stone-600 dark:text-stone-400 sm:flex-row sm:px-6">
					<p>© {new Date().getFullYear()} Merkado PH. All rights reserved.</p>
					<p className="font-medium text-stone-700 dark:text-stone-300">Merkado PH: Bagong Yugto, coming soon! Abangan!</p>
				</div>
			</footer>
		</div>
	);
}
