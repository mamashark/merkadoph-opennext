"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { NAV_HIGHLIGHTS } from "./site-nav";
import { cn } from "@/lib/ui";

/**
 * The header's "Highlights" menu: every section of the site, with its Highlight colour and a one-line description.
 * Built on <details>, so it opens without JavaScript; with JavaScript it also closes on Escape, an outside click
 * and after navigating.
 */
export function HighlightsMenu({ shop = false }: { shop?: boolean }) {
	const ref = useRef<HTMLDetailsElement>(null);
	const pathname = usePathname();
	const items = shop ? [{ href: "/shop", label: "Shop", sub: "Filipino groceries", swatch: "bg-stone-500" }, ...NAV_HIGHLIGHTS] : NAV_HIGHLIGHTS;
	const current = items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

	// Close after navigating.
	useEffect(() => {
		if (ref.current) ref.current.open = false;
	}, [pathname]);

	useEffect(() => {
		const close = (focusSummary: boolean) => {
			const d = ref.current;
			if (!d?.open) return;
			d.open = false;
			if (focusSummary) d.querySelector("summary")?.focus();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") close(true);
		};
		const onPointer = (e: PointerEvent) => {
			if (!ref.current?.contains(e.target as Node)) close(false);
		};
		document.addEventListener("keydown", onKey);
		document.addEventListener("pointerdown", onPointer);
		return () => {
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("pointerdown", onPointer);
		};
	}, []);

	return (
		<details ref={ref} className="group relative">
			<summary
				className={cn(
					"flex min-h-10 cursor-pointer list-none items-center gap-1.5 border px-3 font-label text-xs font-medium tracking-[0.1em] uppercase transition-colors [&::-webkit-details-marker]:hidden",
					"border-transparent text-site-ink hover:border-site-line-2",
					"group-open:border-site-line-2 group-open:bg-site-surface",
				)}
			>
				Highlights
				{current && <span className="sr-only">, current section: {current.label}</span>}
				<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
			</summary>
			{/* Phones: full width under the header. Larger screens: a panel under the button. */}
			<div className="fixed inset-x-4 top-16 z-40 overflow-hidden border border-site-line-2 bg-site-surface text-site-ink shadow-xl sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:mt-2 sm:w-[22rem]">
				<ul>
					{items.map((i) => {
						const active = i === current;
						return (
							<li key={i.href} className="border-b border-site-line">
								<Link
									href={i.href}
									aria-current={active ? "page" : undefined}
									className={cn(
										"flex items-center gap-3 px-4 py-2.5 hover:bg-site-sunken focus-visible:bg-site-sunken focus-visible:outline-none",
										active && "bg-site-sunken",
									)}
								>
									<span className={cn("h-3 w-3 shrink-0", i.swatch)} aria-hidden />
									<span className="min-w-0">
										<span className="block font-display text-sm leading-tight font-bold">
											{i.label}
											{active && <span className="ml-2 font-label text-xs font-normal tracking-wide text-site-muted uppercase">You&rsquo;re here</span>}
										</span>
										<span className="block truncate text-xs text-site-muted">{i.sub}</span>
									</span>
								</Link>
							</li>
						);
					})}
				</ul>
				<Link href="/#index" className="flex items-center justify-center gap-1.5 px-4 py-3 font-label text-xs font-medium tracking-[0.1em] uppercase hover:bg-site-sunken">
					View all highlights <ArrowUpRight className="h-4 w-4" aria-hidden />
				</Link>
			</div>
		</details>
	);
}
