"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import type { PortfolioImage } from "@/lib/portfolio";
import { cn } from "@/lib/ui";

const SLIDE_MS = 4500;

/**
 * Full-screen photo viewer for portfolio images. Built on the native <dialog> (modal: background inert,
 * focus kept inside, Esc closes). Previous/next buttons, ← → keys, swipe, thumbnails, slideshow.
 * Photos are shown whole (contain) here; the page grids crop them (cover).
 */
export function PortfolioLightbox({ images, title, index, onIndex, onClose }: { images: PortfolioImage[]; title: string; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
	const ref = useRef<HTMLDialogElement>(null);
	const thumbs = useRef<Array<HTMLButtonElement | null>>([]);
	const [playing, setPlaying] = useState(false);
	const swipeX = useRef<number | null>(null);
	const open = index !== null;
	const count = images.length;

	const go = useCallback((by: number) => index !== null && onIndex((index + by + count) % count), [index, count, onIndex]);

	// Open/close the native dialog and lock page scroll while it's open.
	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) {
			dialog.showModal();
			document.documentElement.style.overflow = "hidden";
		}
		if (!open && dialog.open) dialog.close();
	}, [open]);

	// Never leave the page scroll-locked (e.g. if the viewer unmounts while open).
	useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

	// Stop the slideshow whenever the viewer closes.
	useEffect(() => {
		if (!open) setPlaying(false);
	}, [open]);

	// Slideshow.
	useEffect(() => {
		if (!open || !playing || count < 2) return;
		const t = window.setTimeout(() => go(1), SLIDE_MS);
		return () => window.clearTimeout(t);
	}, [open, playing, index, count, go]);

	// Keep the active thumbnail in view.
	useEffect(() => {
		if (index !== null) thumbs.current[index]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
	}, [index]);

	const img = index !== null ? images[index] : null;

	return (
		<dialog
			ref={ref}
			aria-label={`${title} — photo viewer`}
			onClose={() => {
				document.documentElement.style.overflow = "";
				onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "ArrowRight") go(1);
				else if (e.key === "ArrowLeft") go(-1);
				else if (e.key === " " && e.target === e.currentTarget) {
					e.preventDefault();
					setPlaying((p) => !p);
				}
			}}
			// A click on the backdrop area (not on controls or the photo) closes the viewer.
			onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
			className="m-0 h-dvh max-h-none w-screen max-w-none bg-stone-950/95 p-0 text-white backdrop:bg-black/70"
		>
			{img && (
				<div className="flex h-full flex-col">
					{/* Top bar */}
					<div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
						<p className="min-w-0 truncate text-sm text-stone-300">
							<span className="font-semibold text-white">{title}</span>
							<span className="ml-2 tabular-nums" aria-live="polite">
								{index! + 1} / {count}
							</span>
						</p>
						<div className="flex shrink-0 items-center gap-1">
							{count > 1 && (
								<button
									type="button"
									onClick={() => setPlaying((p) => !p)}
									aria-pressed={playing}
									aria-label={playing ? "Pause slideshow" : "Play slideshow"}
									className="rounded-full p-2.5 text-stone-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
								>
									{playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
								</button>
							)}
							<button
								type="button"
								onClick={() => ref.current?.close()}
								aria-label="Close photo viewer"
								autoFocus
								className="rounded-full p-2.5 text-stone-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
							>
								<X className="h-6 w-6" aria-hidden />
							</button>
						</div>
					</div>

					{/* Photo */}
					<div
						className="relative min-h-0 flex-1 touch-pan-y select-none"
						onPointerDown={(e) => (swipeX.current = e.clientX)}
						onPointerUp={(e) => {
							if (swipeX.current === null) return;
							const dx = e.clientX - swipeX.current;
							swipeX.current = null;
							if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
						}}
					>
						<Image key={img.url} src={img.url} alt={img.alt || `${title} — photo ${index! + 1}`} fill sizes="100vw" className="object-contain" priority />
						{count > 1 && (
							<>
								<button
									type="button"
									onClick={() => go(-1)}
									aria-label="Previous photo"
									className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-3 text-white backdrop-blur hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-4"
								>
									<ChevronLeft className="h-6 w-6" aria-hidden />
								</button>
								<button
									type="button"
									onClick={() => go(1)}
									aria-label="Next photo"
									className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-3 text-white backdrop-blur hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4"
								>
									<ChevronRight className="h-6 w-6" aria-hidden />
								</button>
							</>
						)}
					</div>

					{/* Description */}
					<div className="mx-auto w-full max-w-3xl px-4 pt-3 text-center text-sm leading-relaxed text-stone-200 sm:px-6" aria-live="polite">
						{img.description || img.alt}
					</div>

					{/* Thumbnails */}
					{count > 1 && (
						<ul className="mx-auto flex max-w-full gap-2 overflow-x-auto px-4 py-3 sm:px-6" aria-label="All photos">
							{images.map((t, i) => (
								<li key={`${t.url}-${i}`} className="shrink-0">
									<button
										ref={(el) => void (thumbs.current[i] = el)}
										type="button"
										onClick={() => onIndex(i)}
										aria-label={`Show photo ${i + 1}${t.alt ? `: ${t.alt}` : ""}`}
										aria-current={i === index ? "true" : undefined}
										className={cn(
											"relative block h-14 w-20 overflow-hidden rounded-md ring-offset-2 ring-offset-stone-950 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
											i === index ? "opacity-100 ring-2 ring-white" : "opacity-55 hover:opacity-90",
										)}
									>
										<Image src={t.url} alt="" fill sizes="80px" className="object-cover" />
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</dialog>
	);
}
