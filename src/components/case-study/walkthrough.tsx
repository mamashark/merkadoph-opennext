"use client";

import { Children, useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

/*
 * Guided walkthrough for a case-study feature page: "Step n of N", Previous / Next, arrow keys, swipe, a polite live region.
 * Progressive enhancement: the server renders every step (children, one per step) with all but the first marked `data-off` (display: none in globals.css); with
 * JavaScript off, globals.css shows them all and drops the controls. Props are plain data plus server-rendered children, so no
 * content module is bundled here. Reduced motion: the only animation is a short fade, switched off by `prefers-reduced-motion`
 * in globals.css.
 */
type StepMeta = { id: string; title: string };

const BTN =
	"inline-flex min-h-11 min-w-11 items-center justify-center border border-site-line-2 px-4 font-label text-xs font-medium tracking-[0.1em] uppercase text-site-ink transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:border-site-line-2 aria-disabled:hover:text-site-ink";

export function Walkthrough({ steps, children }: { steps: StepMeta[]; children: ReactNode }) {
	const items = Children.toArray(children);
	const last = steps.length - 1;
	const [i, setI] = useState(0);
	const [announce, setAnnounce] = useState("");
	const touch = useRef<{ x: number; y: number } | null>(null);

	const go = useCallback(
		(n: number, say = true) => {
			const next = Math.min(Math.max(n, 0), last);
			setI(next);
			if (say) setAnnounce(`Step ${next + 1} of ${steps.length}: ${steps[next].title}`);
		},
		[last, steps],
	);

	// A link such as /case-study/constellation#step-open-the-sky opens that step.
	useEffect(() => {
		const fromHash = () => {
			const n = steps.findIndex((s) => `step-${s.id}` === location.hash.slice(1));
			if (n >= 0) go(n, false);
		};
		fromHash();
		window.addEventListener("hashchange", fromHash);
		return () => window.removeEventListener("hashchange", fromHash);
	}, [steps, go]);

	const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
		if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return;
		const t = e.target as HTMLElement;
		if (t.closest("input, textarea, select, [contenteditable='true']")) return;
		if (e.key === "ArrowRight") go(i + 1);
		else if (e.key === "ArrowLeft") go(i - 1);
		else return;
		e.preventDefault();
	};

	// Swipe: a mostly horizontal touch of 50 px or more. Vertical scrolling is left to the browser (touch-action: pan-y).
	const onPointerDown = (e: PointerEvent) => {
		touch.current = e.pointerType === "touch" ? { x: e.clientX, y: e.clientY } : null;
	};
	const onPointerUp = (e: PointerEvent) => {
		const s = touch.current;
		touch.current = null;
		if (!s) return;
		const dx = e.clientX - s.x;
		if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(i + (dx < 0 ? 1 : -1));
	};

	return (
		<section aria-label="Guided walkthrough" onKeyDown={onKeyDown}>
			{/* No JavaScript: show every step and drop the controls. (globals.css has the same rule under @media (scripting: none).) */}
			<noscript>
				<style>{".wt-step[data-off]{display:block}.wt-controls{display:none!important}"}</style>
			</noscript>
			<div className="wt-controls flex flex-wrap items-center gap-3 border border-site-line bg-site-surface p-3 sm:p-4">
				<p className="mr-auto font-label text-xs font-medium tracking-[0.12em] text-site-ink uppercase">
					<span className="text-accent">
						Step {i + 1} of {steps.length}
					</span>
					<span className="sr-only">: {steps[i].title}</span>
				</p>
				<button type="button" className={BTN} aria-disabled={i === 0} onClick={() => i > 0 && go(i - 1)}>
					<span aria-hidden>←&nbsp;</span>Previous
				</button>
				<button type="button" className={BTN} aria-disabled={i === last} onClick={() => i < last && go(i + 1)}>
					Next<span aria-hidden>&nbsp;→</span>
				</button>
			</div>
			<p className="sr-only" role="status" aria-live="polite">
				{announce}
			</p>
			<ol className="mt-6 list-none space-y-10 p-0 [touch-action:pan-y]" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
				{items.map((node, n) => (
					<li key={steps[n].id} id={`step-${steps[n].id}`} className="wt-step scroll-mt-24" data-off={n !== i ? "" : undefined} data-current={n === i ? "" : undefined}>
						{node}
					</li>
				))}
			</ol>
			<p className="wt-controls mt-4 font-label text-xs tracking-wide text-site-muted">Use the buttons, the left and right arrow keys or swipe to change step.</p>
		</section>
	);
}
