"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LINES } from "@/components/constellation/constellation";
import type { ConstellationEngine } from "@/components/constellation/engine";
import type { ConstellationHub, ConstellationItem } from "@/components/constellation/types";
import styles from "./highlights.module.css";

export const UNFOLDED_HINT = "Hover a category · click to enter · drag to rearrange";

type Props = {
	hubs: ConstellationHub[];
	items: ConstellationItem[];
	eyebrow: string;
	title: string;
	lede: string;
	label: string;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = () => window.matchMedia("(hover: hover)").matches;

/**
 * Homepage hero: the constellation (folded sun → categories → items). Hovering a category previews
 * its entries; clicking it "dives" into that section below, and "Back to highlights" climbs back out.
 * Also runs the page-wide bits: reveal-on-scroll, [data-dive] / [data-back] links, deep links (#blogs).
 */
export function HighlightsStage({ hubs, items, eyebrow, title, lede, label }: Props) {
	const router = useRouter();
	const stageRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const tipRef = useRef<HTMLDivElement>(null);
	const warpRef = useRef<HTMLDivElement>(null);
	const engineRef = useRef<ConstellationEngine | null>(null);
	const busyRef = useRef(false);
	const foldedRef = useRef(true);
	const [ready, setReady] = useState(false);
	const [folded, setFolded] = useState(true);
	const [hint, setHint] = useState("");
	const [peek, setPeek] = useState<{ hub: ConstellationHub; seq: number; left: number; top: number; right: boolean } | null>(null);
	const [peekOpen, setPeekOpen] = useState(false);
	const peekRef = useRef<HTMLDivElement>(null);
	const pendingPeekEl = useRef<SVGGElement | null>(null);

	/* ------------------------------ Camera ------------------------------ */

	const camera = useCallback((x: number, y: number, s: number) => {
		const svg = svgRef.current, stage = stageRef.current;
		if (!svg || !stage) return;
		if (s === 1) {
			svg.style.transform = "";
			return;
		}
		const { width, height } = stage.getBoundingClientRect();
		svg.style.transform = `translate(${width / 2 - s * x}px, ${height / 2 - s * y}px) scale(${s})`;
	}, []);

	const lean = useCallback((id: string) => {
		const p = engineRef.current?.hubPoint(id), svg = svgRef.current, stage = stageRef.current;
		if (!p || !svg || !stage || reduced()) return;
		const { width, height } = stage.getBoundingClientRect();
		const s = 1.06;
		svg.style.transform = `translate(${(width / 2 - p.x) * 0.06 + p.x * (1 - s)}px, ${(height / 2 - p.y) * 0.06 + p.y * (1 - s)}px) scale(${s})`;
	}, []);
	const unlean = useCallback(() => {
		if (!busyRef.current && svgRef.current) svgRef.current.style.transform = "";
	}, []);

	/* --------------------------- Hover preview --------------------------- */

	const openPeek = useCallback(
		(id: string, el: SVGGElement) => {
			const hub = hubs.find((h) => h.id === id);
			if (!hub || !canHover()) return;
			pendingPeekEl.current = el;
			setPeekOpen(false);
			setPeek((p) => ({ hub, seq: (p?.seq ?? 0) + 1, left: 0, top: 0, right: true }));
		},
		[hubs],
	);
	// Position the preview once it has rendered (its size depends on the content).
	useEffect(() => {
		const el = pendingPeekEl.current, box = peekRef.current, stage = stageRef.current;
		if (!peek || !el || !box || !stage) return;
		pendingPeekEl.current = null;
		const sr = stage.getBoundingClientRect(), hr = el.getBoundingClientRect();
		const pw = box.offsetWidth, ph = box.offsetHeight;
		const right = hr.right + 24 + pw < sr.right - 12;
		const left = Math.max(12, right ? hr.right - sr.left + 24 : hr.left - sr.left - 24 - pw);
		const top = Math.min(Math.max(hr.top - sr.top + hr.height / 2 - ph / 2, 56), sr.height - ph - 16);
		setPeek((p) => (p ? { ...p, left, top, right } : p));
		const raf = requestAnimationFrame(() => setPeekOpen(true));
		return () => cancelAnimationFrame(raf);
	}, [peek?.seq]); // eslint-disable-line react-hooks/exhaustive-deps

	const closePeek = useCallback(() => setPeekOpen(false), []);

	/* ------------------------- Dive in / climb out ------------------------ */

	const setWarp = (color: string, x: number, y: number, state?: string) => {
		const w = warpRef.current;
		if (!w) return;
		w.style.setProperty("--c", color);
		w.style.setProperty("--px", `${x}px`);
		w.style.setProperty("--py", `${y}px`);
		if (state) w.dataset.state = state;
		else delete w.dataset.state;
	};
	const setHash = (h: string) => {
		try {
			history.replaceState(history.state, "", h ? `#${h}` : location.pathname + location.search);
		} catch {
			/* ignore */
		}
	};
	const hubColor = (id: string) => {
		const hub = hubs.find((h) => h.id === id);
		return stageRef.current ? getComputedStyle(stageRef.current).getPropertyValue(`--${hub?.color ?? "sun"}`).trim() : "";
	};

	const arrive = useCallback((sec: HTMLElement, key?: string) => {
		delete sec.dataset.arriving;
		void sec.offsetWidth;
		sec.dataset.arriving = "";
		sec.querySelectorAll<HTMLElement>("[data-reveal]").forEach((r) => (r.dataset.in = ""));
		setTimeout(() => delete sec.dataset.arriving, 1200);
		if (!key) return;
		const card = sec.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
		if (!card) return;
		if (card.hidden) sec.querySelector<HTMLButtonElement>("[data-chip-all]")?.click();
		setTimeout(
			() => {
				card.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
				delete card.dataset.flash;
				void card.offsetWidth;
				card.dataset.flash = "";
				setTimeout(() => delete card.dataset.flash, 2400);
			},
			reduced() ? 0 : 450,
		);
	}, []);

	const dive = useCallback(
		async (id: string, key?: string) => {
			const sec = document.getElementById(id);
			const stage = stageRef.current, svg = svgRef.current, warp = warpRef.current;
			if (!sec || !stage || !svg || !warp || busyRef.current) return;
			setHash(id);
			const p = engineRef.current?.hubPoint(id);
			const heroInView = stage.getBoundingClientRect().bottom > innerHeight * 0.6;
			if (reduced() || foldedRef.current || !p || !heroInView) {
				sec.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
				setTimeout(() => arrive(sec, key), reduced() ? 0 : 650);
				return;
			}
			busyRef.current = true;
			stage.classList.add(styles.diving);
			closePeek();
			if (tipRef.current) tipRef.current.hidden = true;
			const sr = stage.getBoundingClientRect();
			svg.dataset.cam = "dive";
			camera(p.x, p.y, 7);
			setWarp(hubColor(id), sr.left + sr.width / 2, sr.top + sr.height / 2, "armed");
			await wait(520);
			warp.dataset.state = "open";
			await wait(760);
			sec.scrollIntoView({ behavior: "instant" as ScrollBehavior });
			svg.dataset.cam = "none";
			camera(0, 0, 1);
			engineRef.current?.reset();
			void svg.getBoundingClientRect();
			delete svg.dataset.cam;
			stage.classList.remove(styles.diving);
			arrive(sec, key);
			warp.dataset.state = "fading";
			await wait(620);
			setWarp("", 0, 0);
			busyRef.current = false;
			// Keyboard users continue inside the section.
			sec.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
		},
		[arrive, camera, closePeek], // eslint-disable-line react-hooks/exhaustive-deps
	);

	const climb = useCallback(
		async (fromId: string) => {
			const stage = stageRef.current, svg = svgRef.current, warp = warpRef.current;
			setHash("");
			const p = engineRef.current?.hubPoint(fromId);
			if (!stage || !svg || !warp) return;
			if (reduced() || foldedRef.current || !p || busyRef.current) {
				stage.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
				return;
			}
			busyRef.current = true;
			setWarp(hubColor(fromId), innerWidth / 2, innerHeight / 2, "full");
			await wait(20);
			window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
			svg.dataset.cam = "none";
			camera(p.x, p.y, 7);
			void svg.getBoundingClientRect();
			delete svg.dataset.cam;
			await wait(30);
			svg.dataset.cam = "dive";
			camera(0, 0, 1);
			const sr = stage.getBoundingClientRect();
			setWarp(hubColor(fromId), sr.left + p.x, sr.top + p.y, "full");
			void warp.offsetWidth;
			warp.dataset.state = "closing";
			await wait(1150);
			delete svg.dataset.cam;
			setWarp("", 0, 0);
			busyRef.current = false;
			engineRef.current?.hubElement(fromId)?.focus({ preventScroll: true });
		},
		[camera], // eslint-disable-line react-hooks/exhaustive-deps
	);

	/* ------------------------------ Engine ------------------------------ */

	useEffect(() => {
		const stage = stageRef.current, svg = svgRef.current, tip = tipRef.current;
		if (!stage || !svg || !tip) return;
		let cancelled = false;
		void import("@/components/constellation/engine").then(({ mountConstellation }) => {
			if (cancelled) return;
			engineRef.current = mountConstellation({
				stage,
				svg,
				tip,
				hubs,
				items,
				lines: DEFAULT_LINES,
				unfoldedHint: UNFOLDED_HINT,
				onHint: setHint,
				onFolded: (f) => {
					foldedRef.current = f;
					setFolded(f);
				},
				navigate: (href) => router.push(href),
				onHubActivate: (id) => void dive(id),
				onHubHover: (id, el) => {
					if (busyRef.current) return;
					if (id && el) {
						openPeek(id, el);
						lean(id);
					} else {
						closePeek();
						unlean();
					}
				},
				// An item with a card in its section dives there; others open their own page.
				onItemActivate: (item) => {
					if (!item.id || !document.querySelector(`#${item.hub} [data-key="${CSS.escape(item.id)}"]`)) return false;
					void dive(item.hub, item.id);
					return true;
				},
			});
			setReady(true);
		});
		return () => {
			cancelled = true;
			engineRef.current?.destroy();
			engineRef.current = null;
		};
	}, [hubs, items, router, dive, openPeek, closePeek, lean, unlean]);

	/* ------------------------- Page-wide behaviour ------------------------ */

	useEffect(() => {
		const root = stageRef.current?.closest<HTMLElement>(`.${styles.root}`);
		if (!root) return;
		root.dataset.js = "";

		const io = new IntersectionObserver(
			(entries) =>
				entries.forEach((en) => {
					if (!en.isIntersecting) return;
					(en.target as HTMLElement).dataset.in = "";
					io.unobserve(en.target);
				}),
			{ rootMargin: "0px 0px -10% 0px" },
		);
		root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

		const onClick = (e: MouseEvent) => {
			if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			const t = e.target as Element;
			const d = t.closest<HTMLElement>("[data-dive]");
			if (d) {
				e.preventDefault();
				void dive(d.dataset.dive!);
				return;
			}
			const b = t.closest<HTMLElement>("[data-back]");
			if (b) {
				e.preventDefault();
				void climb(b.dataset.back!);
			}
		};
		root.addEventListener("click", onClick);

		// Deep links (/#events) land with the section already revealed.
		const deep = decodeURIComponent(location.hash.slice(1));
		const sec = deep && hubs.some((h) => h.id === deep) ? document.getElementById(deep) : null;
		if (sec) arrive(sec);

		return () => {
			io.disconnect();
			root.removeEventListener("click", onClick);
			delete root.dataset.js;
		};
	}, [hubs, dive, climb, arrive]);

	const peekItems = peek ? items.filter((it) => it.hub === peek.hub.id).slice(0, 3) : [];

	return (
		<div
			ref={stageRef}
			id="top"
			className={`${styles.stage} ${folded ? styles.folded : ""}`}
			// The whole sky opens the graph; keyboard users have the Open button.
		>
			<svg ref={svgRef} className={styles.graph} role="group" aria-label={label} />
			<div className={styles.hint}>
				<span className={styles.hintText} aria-live="polite">
					{hint}
				</span>
				{ready && (
					<button
						className={styles.btn}
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							engineRef.current?.setFolded(!folded);
						}}
					>
						{folded ? "Open" : "Fold again"}
					</button>
				)}
			</div>
			<div className={styles.intro}>
				<p className={styles.eyebrow}>{eyebrow}</p>
				<h1 id="hero-title">{title}</h1>
				<p className={styles.lede}>{lede}</p>
			</div>
			<div ref={tipRef} className={styles.tip} hidden />
			<div
				ref={peekRef}
				className={`${styles.peek} ${peekOpen ? styles.peekOpen : ""}`}
				aria-hidden="true"
				style={peek ? ({ "--c": `var(--${peek.hub.color})`, "--ox": peek.right ? "0" : "100%", left: peek.left, top: peek.top } as React.CSSProperties) : undefined}
			>
				{peek && (
					<>
						<div className={styles.peekHead}>
							<i />
							<h2>{peek.hub.label}</h2>
						</div>
						{peek.hub.description && <p className={styles.peekSub}>{peek.hub.description}</p>}
						<ol>
							{peekItems.map((it, i) => (
								<li key={it.id ?? i} style={{ "--i": i } as React.CSSProperties}>
									<span className={styles.weave} />
									<span>
										{it.note && <span className={styles.peekCat}>{it.note}</span>}
										<b>{it.title}</b>
									</span>
								</li>
							))}
						</ol>
						<div className={`${styles.peekGo} ${styles.mono}`}>Click to enter {peek.hub.label} →</div>
					</>
				)}
			</div>
			<div ref={warpRef} className={styles.warp} aria-hidden="true" />
		</div>
	);
}
