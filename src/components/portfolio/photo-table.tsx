"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Layers, LayoutGrid } from "lucide-react";
import type { PortfolioImage } from "@/lib/portfolio";
import { PortfolioLightbox } from "./lightbox";
import { cn } from "@/lib/ui";

/**
 * Community Impact photos as instant prints on a table. Two ways to look:
 * - "Spread out": every print laid out, slightly tilted, taped down in the brand colours. Hover / focus lifts one.
 * - "Pile up": the prints stacked like a pile you deal through (Next / Back, ← → keys); the top one opens full screen.
 * Prints are small (≤ 16rem), so even 480px photos stay sharp; the full-screen viewer never enlarges a photo
 * past its real size. Rendered on the server too (client component), so every photo is in the HTML.
 */
const TILT = [-3, 2, -1.5, 3, -2.5, 1, 2.5, -1];
const DROP = [0, 10, -6, 4, -8, 6, 2, -4];
const TAPE = ["bg-brand-yellow/80", "bg-brand-teal/60", "bg-brand-orange/70", "bg-brand-promo/55"];
const DEAL_MS = 320;

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Print({ img, i, label, onOpen, priority, buttonRef, tabIndex }: { img: PortfolioImage; i: number; label: string; onOpen: () => void; priority?: boolean; buttonRef?: (el: HTMLButtonElement | null) => void; tabIndex?: number }) {
	return (
		<figure className="relative bg-white p-2.5 pb-3 shadow-[0_10px_24px_-12px_rgba(51,51,30,0.55),0_2px_6px_rgba(51,51,30,0.18)] dark:bg-stone-100">
			<span aria-hidden className={cn("absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 -rotate-3 opacity-90 mix-blend-multiply", TAPE[i % TAPE.length])} />
			<button
				ref={buttonRef}
				type="button"
				tabIndex={tabIndex}
				onClick={onOpen}
				aria-haspopup="dialog"
				aria-label={`Open photo ${i + 1} full screen: ${label}`}
				className="relative block aspect-square w-full cursor-zoom-in overflow-hidden bg-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
			>
				<Image src={img.url} alt={label} fill sizes="(max-width: 640px) 45vw, 256px" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} className="object-cover" />
			</button>
			{img.description ? <figcaption className="mt-2 line-clamp-2 min-h-[2.5em] px-0.5 text-center text-[13px] leading-snug text-stone-700">{img.description}</figcaption> : <div className="h-4" aria-hidden />}
		</figure>
	);
}

export function PhotoTable({ images, title, priorityFirst = false }: { images: PortfolioImage[]; title: string; priorityFirst?: boolean }) {
	const [view, setView] = useState<"table" | "pile">("table");
	const [top, setTop] = useState(0);
	const [dealing, setDealing] = useState<0 | 1 | -1>(0);
	const [open, setOpen] = useState<number | null>(null);
	const prints = useRef<Array<HTMLButtonElement | null>>([]);
	const timer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(timer.current), []);

	const n = images.length;
	if (!n) return null;
	const label = (i: number) => images[i].alt || `${title}, photo ${i + 1}`;

	/** Pile: move the top print away (1) or bring the last one back (-1). */
	const deal = (dir: 1 | -1) => {
		if (dealing || n < 2) return;
		const ms = reduced() ? 0 : DEAL_MS;
		if (dir === -1) setTop((t) => (t - 1 + n) % n);
		setDealing(dir);
		timer.current = window.setTimeout(() => {
			if (dir === 1) setTop((t) => (t + 1) % n);
			setDealing(0);
		}, ms);
	};
	// Depth of photo i in the pile (0 = on top).
	const depth = (i: number) => (i - top + n) % n;

	return (
		<>
			{n > 1 && (
				<div className="mb-6 flex justify-center">
					<div className="inline-flex border border-site-line-2" role="group" aria-label="How to show the photos">
						{(
							[
								{ v: "table", label: "Spread out", Icon: LayoutGrid },
								{ v: "pile", label: "Pile up", Icon: Layers },
							] as const
						).map(({ v, label: l, Icon }) => (
							<button
								key={v}
								type="button"
								aria-pressed={view === v}
								onClick={() => setView(v)}
								className={cn(
									"inline-flex min-h-11 items-center gap-2 px-4 font-label text-xs font-medium tracking-[0.1em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
									view === v ? "bg-accent text-on-accent" : "text-site-ink-2 hover:text-accent",
								)}
							>
								<Icon className="h-4 w-4" aria-hidden />
								{l}
							</button>
						))}
					</div>
				</div>
			)}

			{view === "table" ? (
				<ul className="flex flex-wrap justify-center gap-x-5 gap-y-9 px-1 pb-10 pt-4 sm:gap-x-7 sm:gap-y-12">
					{images.map((img, i) => (
						<li
							key={`${img.url}-${i}`}
							style={{ "--tilt": `${TILT[i % TILT.length]}deg`, "--drop": `${DROP[i % DROP.length]}px` } as React.CSSProperties}
							className="relative w-[calc(50%-0.75rem)] [transform:translateY(var(--drop))_rotate(var(--tilt))] transition duration-300 ease-out hover:z-10 hover:[transform:translateY(-6px)_rotate(0deg)_scale(1.05)] focus-within:z-10 focus-within:[transform:translateY(-6px)_rotate(0deg)_scale(1.05)] motion-reduce:transition-none sm:w-56 lg:w-64"
						>
							<Print img={img} i={i} label={label(i)} onOpen={() => setOpen(i)} priority={priorityFirst && i === 0} buttonRef={(el) => void (prints.current[i] = el)} />
						</li>
					))}
				</ul>
			) : (
				<div
					className="mx-auto flex max-w-md flex-col items-center"
					onKeyDown={(e) => {
						if (e.key === "ArrowRight") deal(1);
						else if (e.key === "ArrowLeft") deal(-1);
					}}
				>
					<div className="relative mt-4 aspect-[0.86] w-64 sm:w-72">
						{images.map((img, i) => {
							const d = depth(i);
							if (d > 5 && !(dealing === -1 && d === 0)) return null;
							const leaving = dealing === 1 && d === 0;
							const arriving = dealing === -1 && d === 0;
							return (
								<div
									key={`${img.url}-${i}`}
									className={cn("absolute inset-0 transition duration-300 ease-out motion-reduce:transition-none", arriving && "animate-[pile-in_320ms_ease-out] motion-reduce:animate-none")}
									style={{
										zIndex: n - d,
										transform: leaving ? "translate(115%, -6%) rotate(14deg)" : `translate(${d * 3}px, ${d * 4}px) rotate(${d === 0 ? 0 : TILT[i % TILT.length] * 1.4}deg)`,
										opacity: leaving ? 0 : 1,
									}}
									aria-hidden={d !== 0}
									inert={d !== 0}
								>
									<Print img={img} i={i} label={label(i)} onOpen={() => setOpen(i)} priority={priorityFirst && i === 0} tabIndex={d === 0 ? 0 : -1} />
								</div>
							);
						})}
					</div>
					<div className="mt-8 flex items-center gap-4">
						<button type="button" onClick={() => deal(-1)} aria-label="Previous photo" className="inline-flex h-11 w-11 items-center justify-center border border-site-line-2 text-site-ink hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
							<ChevronLeft className="h-5 w-5" aria-hidden />
						</button>
						<p className="min-w-16 text-center font-label text-xs tabular-nums text-site-ink-2" aria-live="polite">
							{top + 1} / {n}
						</p>
						<button type="button" onClick={() => deal(1)} aria-label="Next photo" className="inline-flex h-11 items-center gap-1.5 border border-accent bg-accent px-5 font-label text-xs font-medium tracking-[0.1em] text-on-accent uppercase hover:bg-transparent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
							Next photo <ChevronRight className="h-4 w-4" aria-hidden />
						</button>
					</div>
				</div>
			)}

			<PortfolioLightbox
				images={images}
				title={title}
				index={open}
				onIndex={setOpen}
				onClose={() => {
					const last = open;
					setOpen(null);
					if (last !== null && view === "table") prints.current[last]?.focus();
				}}
			/>
		</>
	);
}
