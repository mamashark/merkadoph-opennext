"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ConstellationColor } from "@/components/constellation/types";
import styles from "./highlights.module.css";

/** One entry inside a Highlight: a star in the zoomed-in sky and a row in the side panel. */
export type WorldEntry = {
	slug: string;
	/** The graph item id (e.g. "blog-<slug>"), so a tile clicked in the big sky opens this entry. */
	itemId: string;
	title: string;
	note?: string;
	/** Small optimized cover for the star. */
	thumb?: string;
	cover?: string;
	coverAlt: string;
	excerpt: string;
	href: string;
	tags: string[];
};

/** A Highlight (category) as shown when you zoom into it. */
export type WorldInfo = {
	id: string;
	n: string;
	label: string;
	sub: string;
	color: ConstellationColor;
	count: number;
	list: string;
	allLabel: string;
	/** Label of the link to an entry's own page, e.g. "Read the full story". */
	cta: string;
	entries: WorldEntry[];
};

type Props = {
	world: WorldInfo;
	entry: string | null;
	leaving: boolean;
	/** Opened from a link (no zoom), e.g. /?world=blogs. */
	instant: boolean;
	onEntry: (slug: string | null, how: "open" | "step" | "list") => void;
	onClose: () => void;
};

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const pad = (n: number) => String(n).padStart(2, "0");
const wide = () => window.matchMedia("(min-width: 761px)").matches;

type Sky = { w: number; h: number; ox: number; oy: number };
type Wire = { x1: number; y1: number; x2: number; y2: number };

/**
 * Inside a Highlight: its entries as a small constellation, with the list beside it (a bottom sheet
 * on phones). Choosing an entry slides the panel over to a preview with a link to the entry's page.
 * The list and the preview are the accessible path; the stars are a pointer-only mirror of the list.
 */
export function HighlightsWorld({ world, entry, leaving, instant, onEntry, onClose }: Props) {
	const rootRef = useRef<HTMLDivElement>(null);
	const skyRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLElement>(null);
	const listRef = useRef<HTMLOListElement>(null);
	const titleRef = useRef<HTMLHeadingElement>(null);
	const entryTitleRef = useRef<HTMLHeadingElement>(null);
	const [sky, setSky] = useState<Sky | null>(null);
	const [open, setOpen] = useState(false);
	const [hot, setHot] = useState<string | null>(null);
	const [wire, setWire] = useState<Wire | null>(null);

	const { entries } = world;
	const current = entry ? entries.findIndex((e) => e.slug === entry) : -1;
	const active = current >= 0 ? entries[current] : null;
	// Keep the last preview on screen while the panel slides back to the list.
	const [shown, setShown] = useState(active);
	if (active && active !== shown) setShown(active);

	/* --------------------------- Layout + intro --------------------------- */

	useLayoutEffect(() => {
		const el = skyRef.current;
		if (!el) return;
		const read = () => setSky({ w: el.clientWidth, h: el.clientHeight, ox: el.offsetLeft, oy: el.offsetTop });
		read();
		const ro = new ResizeObserver(read);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		let r2 = 0;
		const r1 = requestAnimationFrame(() => (r2 = requestAnimationFrame(() => setOpen(true))));
		// Keyboard and screen-reader users land on the Highlight's heading.
		const t = instant ? 0 : window.setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 380);
		return () => {
			cancelAnimationFrame(r1);
			cancelAnimationFrame(r2);
			clearTimeout(t);
		};
	}, [instant]);

	// Stars on a golden-angle spiral around the Highlight, stretched to the shape of the sky.
	const stars = useMemo(() => {
		if (!sky) return [];
		const n = entries.length;
		const m = Math.min(sky.w, sky.h);
		const stretch = Math.min(1.5, Math.max(1, sky.w / sky.h));
		const rot = [...world.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 7;
		return entries.map((e, i) => {
			const r = m * (0.17 + 0.25 * Math.sqrt((i + 1) / Math.max(n, 1)));
			const a = rot + i * GOLDEN;
			return {
				slug: e.slug,
				x: Math.min(Math.max(sky.w / 2 + Math.cos(a) * r * stretch, 36), sky.w - 36),
				y: Math.min(Math.max(sky.h / 2 + Math.sin(a) * r, 36), sky.h - 44),
			};
		});
	}, [sky, entries, world.id]);
	const cx = (sky?.w ?? 0) / 2, cy = (sky?.h ?? 0) / 2;

	/* ------------------- The thread from the panel to a star ------------------- */

	const lit = active?.slug ?? hot;
	const measure = useCallback(() => {
		const root = rootRef.current, panel = panelRef.current;
		const star = stars.find((s) => s.slug === lit);
		if (!root || !panel || !sky || !star || !wide()) return setWire(null);
		const from = active ? entryTitleRef.current : listRef.current?.querySelector(`[data-slug="${CSS.escape(star.slug)}"]`);
		if (!from) return setWire(null);
		const rr = root.getBoundingClientRect(), pr = panel.getBoundingClientRect(), fr = from.getBoundingClientRect();
		const y = Math.min(Math.max(fr.top + fr.height / 2, pr.top + 12), pr.bottom - 12);
		setWire({ x1: pr.right - rr.left, y1: y - rr.top, x2: sky.ox + star.x, y2: sky.oy + star.y });
	}, [active, lit, sky, stars]);

	useEffect(() => {
		const raf = requestAnimationFrame(measure);
		// Again once the panel has finished sliding.
		const t = window.setTimeout(measure, 480);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(t);
		};
	}, [measure]);

	/* ------------------------------ Actions ------------------------------ */

	const show = (slug: string, how: "open" | "step") => {
		onEntry(slug, how);
		window.setTimeout(() => entryTitleRef.current?.focus({ preventScroll: true }), how === "open" ? 420 : 0);
	};
	const backToList = () => {
		const slug = active?.slug;
		onEntry(null, "list");
		window.setTimeout(() => {
			if (slug) listRef.current?.querySelector<HTMLElement>(`[data-slug="${CSS.escape(slug)}"]`)?.focus({ preventScroll: true });
		}, 420);
	};
	// Escape steps out one level, wherever focus is.
	const escRef = useRef(() => {});
	useEffect(() => {
		escRef.current = () => (active ? backToList() : onClose());
	});
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape" || e.defaultPrevented) return;
			e.preventDefault();
			escRef.current();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);
	const plainClick = (e: React.MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

	const state = open && !leaving ? "open" : leaving ? "leaving" : "closed";

	return (
		<div
			ref={rootRef}
			className={styles.wRoot}
			data-no-unfold=""
			data-state={state}
			data-entry={active ? "" : undefined}
			style={{ "--c": `var(--${world.color})` } as React.CSSProperties}
		>
			{/* The zoomed-in sky (pointer only: the list is the accessible path) */}
			<div ref={skyRef} className={styles.wSky} aria-hidden="true">
				{sky && (
					<>
						<svg className={styles.wLines} width={sky.w} height={sky.h}>
							{stars.map((s, i) => (
								<line
									key={s.slug}
									x1={cx}
									y1={cy}
									x2={s.x}
									y2={s.y}
									pathLength={1}
									data-lit={lit === s.slug ? "" : undefined}
									style={{ "--i": i } as React.CSSProperties}
								/>
							))}
						</svg>
						<div className={styles.wCore} style={{ left: cx, top: cy }}>
							<i />
							<span>
								{world.label}
								<sup>{world.count}</sup>
							</span>
						</div>
						{stars.map((s, i) => {
							const e = entries[i];
							return (
								<div
									key={s.slug}
									className={styles.wStar}
									data-lit={lit === s.slug ? "" : undefined}
									data-active={active?.slug === s.slug ? "" : undefined}
									style={{ "--x": `${s.x}px`, "--y": `${s.y}px`, "--cx": `${cx}px`, "--cy": `${cy}px`, "--i": i } as React.CSSProperties}
									onClick={() => show(s.slug, active ? "step" : "open")}
									onMouseEnter={() => setHot(s.slug)}
									onMouseLeave={() => setHot((h) => (h === s.slug ? null : h))}
								>
									<span className={`${styles.wTile} ${e.thumb ? "" : styles.weave}`}>
										{/* Already an optimized 64px thumbnail from the image optimizer. */}
										{/* eslint-disable-next-line @next/next/no-img-element */}
										{e.thumb && <img src={e.thumb} alt="" width={64} height={64} loading="lazy" decoding="async" />}
									</span>
									<span className={styles.wLabel}>{e.title}</span>
								</div>
							);
						})}
					</>
				)}
			</div>

			{wire && (
				<svg className={styles.wWire} aria-hidden="true">
					<path d={`M${wire.x1} ${wire.y1} H${wire.x1 + 28} L${wire.x2} ${wire.y2}`} />
					<rect x={wire.x1 - 2.5} y={wire.y1 - 2.5} width={5} height={5} />
				</svg>
			)}

			{/* The side panel: list ⇄ entry preview */}
			<aside ref={panelRef} className={styles.wPanel} aria-labelledby="world-title">
				<div className={styles.wHead}>
					<button type="button" className={`${styles.wBack} ${styles.mono}`} onClick={onClose}>
						↖ All highlights
					</button>
					<p className={`${styles.kicker} ${styles.mono}`}>
						{world.n} — Highlight
					</p>
					<h2 id="world-title" ref={titleRef} tabIndex={-1}>
						{world.label}
					</h2>
					<p className={styles.wSub}>{world.sub}</p>
				</div>
				<div className={styles.wSlider}>
					<div className={styles.wPane} inert={!!active} onScroll={measure}>
						<ol ref={listRef} className={styles.wList}>
							{entries.map((e, i) => (
								<li key={e.slug} style={{ "--i": i } as React.CSSProperties}>
									<a
										href={e.href}
										data-slug={e.slug}
										data-lit={lit === e.slug ? "" : undefined}
										onClick={(ev) => {
											if (!plainClick(ev)) return;
											ev.preventDefault();
											show(e.slug, "open");
										}}
										onMouseEnter={() => setHot(e.slug)}
										onMouseLeave={() => setHot((h) => (h === e.slug ? null : h))}
										onFocus={() => setHot(e.slug)}
										onBlur={() => setHot((h) => (h === e.slug ? null : h))}
									>
										<span className={`${styles.wNum} ${styles.mono}`}>{pad(i + 1)}</span>
										<span>
											<b>{e.title}</b>
											{e.note && <small className={styles.mono}>{e.note}</small>}
										</span>
									</a>
								</li>
							))}
						</ol>
						<Link href={world.list} className={`${styles.btn} ${styles.wAll}`}>
							{world.count > entries.length ? `${world.allLabel} (${world.count})` : world.allLabel} →
						</Link>
					</div>

					<div className={styles.wPane} inert={!active} onScroll={measure}>
						{shown && (
							<article className={styles.wEntry} aria-labelledby="world-entry-title">
								<button type="button" className={`${styles.wBack} ${styles.mono}`} onClick={backToList}>
									← {world.label}
								</button>
								{shown.cover ? (
									<div className={`${styles.cover} ${styles.wCover}`}>
										<Image key={shown.slug} src={shown.cover} alt={shown.coverAlt} fill sizes="(max-width: 760px) 100vw, 400px" />
									</div>
								) : (
									<div className={`${styles.wCover} ${styles.weave}`} aria-hidden="true" />
								)}
								{shown.note && <p className={`${styles.kicker} ${styles.mono}`}>{shown.note}</p>}
								<h3 id="world-entry-title" ref={entryTitleRef} tabIndex={-1}>
									{shown.title}
								</h3>
								{shown.excerpt && <p className={styles.wExcerpt}>{shown.excerpt}</p>}
								{shown.tags.length > 0 && (
									<ul className={styles.wTags} aria-label="Tags">
										{shown.tags.slice(0, 4).map((t) => (
											<li key={t} className={styles.mono}>
												#{t}
											</li>
										))}
									</ul>
								)}
								<Link href={shown.href} className={`${styles.btn} ${styles.wGo}`}>
									{world.cta} →
								</Link>
								{entries.length > 1 && (
									<nav className={styles.wStep} aria-label={`More in ${world.label}`}>
										<button type="button" className={`${styles.btn}`} disabled={current <= 0} onClick={() => show(entries[current - 1].slug, "step")}>
											← Previous
										</button>
										<span className={styles.mono} aria-live="polite">
											{pad(current + 1)} / {pad(entries.length)}
										</span>
										<button type="button" className={`${styles.btn}`} disabled={current < 0 || current >= entries.length - 1} onClick={() => show(entries[current + 1].slug, "step")}>
											Next →
										</button>
									</nav>
								)}
							</article>
						)}
					</div>
				</div>
			</aside>
		</div>
	);
}
