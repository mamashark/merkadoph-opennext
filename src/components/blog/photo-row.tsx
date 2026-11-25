"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BlogPhoto } from "@/lib/blog-layout";

const MONO = "font-[family-name:var(--font-plex-mono)]";
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The post's photo row (Kay, 2026-11-24: Nike "Related Stories" style, replacing the one-at-a-time slideshow).
 * Big photos in a row with the caption under each; round ‹ › top right; a slim position bar under it.
 * Native scroll with snap points, so swipe and trackpad work; focus the row and use ← → / Home / End. No autoplay and
 * no zoom (approved rules). Rendered on the server too (client component), so every photo is in the HTML.
 */
export function PhotoRow({ photos, heading = "Mga larawan" }: { photos: BlogPhoto[]; heading?: string }) {
	const track = useRef<HTMLUListElement>(null);
	const [edges, setEdges] = useState({ start: true, end: photos.length <= 1 });
	const [bar, setBar] = useState({ left: 0, width: 100 });
	const headingId = useId();
	/** Where a button or key press last sent the row, until the scroll gets there: a fast double press moves two photos. */
	const target = useRef<number | null>(null);
	const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
	const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	const measure = useCallback(() => {
		const el = track.current;
		if (!el) return;
		const max = el.scrollWidth - el.clientWidth;
		setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 });
		// Arrived (or the visitor scrolled themselves): read the position from the row again.
		clearTimeout(settle.current);
		settle.current = setTimeout(() => (target.current = null), 150);
		const width = el.scrollWidth ? (el.clientWidth / el.scrollWidth) * 100 : 100;
		setBar({ width, left: max > 0 ? (el.scrollLeft / max) * (100 - width) : 0 });
	}, []);

	useEffect(() => {
		const el = track.current;
		if (!el) return;
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [measure]);

	/** Scroll so photo `i` starts at the row's left edge. */
	const goTo = (i: number) => {
		const el = track.current;
		const item = el?.children[Math.max(0, Math.min(photos.length - 1, i))] as HTMLElement | undefined;
		if (!el || !item) return;
		target.current = Math.max(0, Math.min(photos.length - 1, i));
		el.scrollTo({ left: item.offsetLeft - el.offsetLeft, behavior: reduce() ? "auto" : "smooth" });
	};
	/** The photo currently at the left edge. */
	const current = () => {
		if (target.current !== null) return target.current;
		const el = track.current;
		if (!el) return 0;
		const items = [...el.children] as HTMLElement[];
		const x = el.scrollLeft + el.offsetLeft;
		return items.reduce((best, it, i) => (Math.abs(it.offsetLeft - x) < Math.abs((items[best]?.offsetLeft ?? 0) - x) ? i : best), 0);
	};
	const step = (dir: 1 | -1) => goTo(current() + dir);

	if (!photos.length) return null;

	const roundBtn =
		"grid h-11 w-11 place-items-center rounded-full border border-site-line-2 bg-site-surface text-site-ink transition hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-40 disabled:hover:border-site-line-2 disabled:hover:text-site-ink";

	return (
		<section aria-labelledby={headingId} className="mx-auto mt-14 w-full max-w-6xl px-4 sm:px-8">
			<div className="mb-5 flex items-end justify-between gap-4">
				<h2 id={headingId} className="font-display text-2xl font-bold tracking-tight text-site-ink sm:text-3xl">
					{heading}
					<span className={`${MONO} ml-2 align-middle text-sm font-normal text-site-muted`}>{photos.length}</span>
				</h2>
				{photos.length > 1 && (
					<div className="flex shrink-0 gap-3">
						<button type="button" className={roundBtn} onClick={() => step(-1)} disabled={edges.start} aria-label="Previous photos">
							<ChevronLeft className="h-5 w-5" aria-hidden />
						</button>
						<button type="button" className={roundBtn} onClick={() => step(1)} disabled={edges.end} aria-label="Next photos">
							<ChevronRight className="h-5 w-5" aria-hidden />
						</button>
					</div>
				)}
			</div>

			<ul
				ref={track}
				onScroll={measure}
				tabIndex={0}
				aria-label={`${heading}: ${photos.length} photos. Use the left and right arrow keys.`}
				onKeyDown={(e) => {
					const to = { ArrowLeft: current() - 1, ArrowRight: current() + 1, Home: 0, End: photos.length - 1 }[e.key];
					if (to === undefined) return;
					e.preventDefault();
					goTo(to);
				}}
				className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
			>
				{photos.map((p, i) => (
					<li key={`${p.url}-${i}`} className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-1.5rem)/3)]">
						<figure className="m-0">
							<div className="relative aspect-3/2 overflow-hidden bg-site-sunken">
								{/* Alt may be empty when the caption below already describes the photo (approved rule). */}
								<Image src={p.url} alt={p.alt} fill sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 85vw" className="object-cover" />
							</div>
							<figcaption>
								<span className={`${MONO} mt-3 block text-xs text-site-muted`}>
									{pad(i + 1)} / {pad(photos.length)}
								</span>
								<span className="mt-1 block font-display text-base leading-snug font-bold text-site-ink sm:text-lg">{p.caption}</span>
							</figcaption>
						</figure>
					</li>
				))}
			</ul>

			{photos.length > 1 && (
				<div className="mt-6 h-1 overflow-hidden rounded-full bg-site-sunken" aria-hidden>
					<div className="h-full rounded-full bg-site-ink transition-[margin] duration-150" style={{ width: `${bar.width}%`, marginLeft: `${bar.left}%` }} />
				</div>
			)}
		</section>
	);
}
