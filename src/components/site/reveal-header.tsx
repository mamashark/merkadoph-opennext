"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/ui";

/**
 * A header that stays out of sight until the element with id `revealAt` scrolls into view
 * (the homepage keeps its hero full screen). It also appears when a keyboard user tabs into it.
 */
export function RevealHeader({ revealAt, className, children }: { revealAt: string; className?: string; children: React.ReactNode }) {
	const [shown, setShown] = useState(false);

	useEffect(() => {
		const target = document.getElementById(revealAt);
		// Shown once the section's top has come into the viewport, and while it (or anything after it) is on screen.
		// No such section on the page: always shown.
		const check = () => setShown(!target || target.getBoundingClientRect().top < window.innerHeight * 0.9);
		check();
		if (!target) return;
		window.addEventListener("scroll", check, { passive: true });
		window.addEventListener("resize", check);
		return () => {
			window.removeEventListener("scroll", check);
			window.removeEventListener("resize", check);
		};
	}, [revealAt]);

	return (
		<header
			data-shown={shown ? "" : undefined}
			className={cn(
				"fixed inset-x-0 top-0 z-30 transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none",
				"-translate-y-full opacity-0 focus-within:translate-y-0 focus-within:opacity-100 data-[shown]:translate-y-0 data-[shown]:opacity-100",
				className,
			)}
			// Out of sight means out of the way: no stray clicks while hidden.
			style={shown ? undefined : { pointerEvents: "none" }}
		>
			{children}
		</header>
	);
}
