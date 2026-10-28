"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/ui";

/**
 * Homepage portfolio showcase (client island): project titles as tabs in a marquee strip; the
 * selected project's panel (server-rendered, passed in as `panels`) is shown below.
 * - The first tab (newest project) is selected by default.
 * - The strip pauses on hover/focus and doesn't move for prefers-reduced-motion (it scrolls instead).
 * - Proper tabs semantics: arrow keys / Home / End move between projects.
 */
export function PortfolioShowcase({ titles, panels }: { titles: string[]; panels: ReactNode[] }) {
	const [selected, setSelected] = useState(0);
	const base = useId();
	const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const animate = titles.length >= 4;

	const select = (i: number, focus = false) => {
		const next = (i + titles.length) % titles.length;
		setSelected(next);
		if (focus) tabRefs.current[next]?.focus();
	};
	const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
		const keys: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: titles.length - 1 };
		if (e.key in keys) {
			e.preventDefault();
			select(keys[e.key], true);
		}
	};

	const tab = (title: string, i: number, copy: boolean) => (
		<li key={`${copy ? "c" : "t"}${i}`} role={copy ? undefined : "presentation"} className="shrink-0">
			<button
				ref={copy ? undefined : (el) => void (tabRefs.current[i] = el)}
				type="button"
				role={copy ? undefined : "tab"}
				id={copy ? undefined : `${base}-tab-${i}`}
				aria-selected={copy ? undefined : selected === i}
				aria-controls={copy ? undefined : `${base}-panel-${i}`}
				tabIndex={copy ? -1 : selected === i ? 0 : -1}
				onClick={() => select(i)}
				onKeyDown={copy ? undefined : (e) => onKeyDown(e, i)}
				className={cn(
					"whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-950",
					selected === i
						? "border-stone-900 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-stone-900"
						: "border-amber-900/15 bg-white/70 text-stone-800 hover:border-stone-900/40 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-stone-200 dark:hover:bg-white/10",
				)}
			>
				{title}
			</button>
		</li>
	);

	return (
		<div>
			<div
				className={cn(
					"group relative -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6",
					animate && "overflow-x-hidden motion-reduce:overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_3rem,black_calc(100%-3rem),transparent)]",
				)}
			>
				<div
					className={cn("flex w-max py-1", animate && "animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none")}
					style={animate ? ({ "--marquee-duration": `${Math.max(20, titles.length * 6)}s` } as React.CSSProperties) : undefined}
				>
					<ul role="tablist" aria-label="Projects" className={cn("flex gap-2", animate && "pr-2")}>
						{titles.map((t, i) => tab(t, i, false))}
					</ul>
					{/* Second copy makes the loop seamless; hidden from assistive tech and the tab order. */}
					{animate && (
						<ul aria-hidden="true" inert className="flex gap-2 pr-2 motion-reduce:hidden">
							{titles.map((t, i) => tab(t, i, true))}
						</ul>
					)}
				</div>
			</div>

			{panels.map((panel, i) => (
				<div key={i} role="tabpanel" id={`${base}-panel-${i}`} aria-labelledby={`${base}-tab-${i}`} hidden={selected !== i} tabIndex={0} className="mt-8 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-stone-950">
					{panel}
				</div>
			))}
		</div>
	);
}
