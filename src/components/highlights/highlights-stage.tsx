"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LINES } from "@/components/constellation/constellation";
import type { ConstellationEngine } from "@/components/constellation/engine";
import { PHONE_QUERY, type ConstellationHub, type ConstellationItem } from "@/components/constellation/types";
import { HighlightsWorld, type WorldInfo } from "./highlights-world";
import { MOTION } from "./motion";
import styles from "./highlights.module.css";

export const UNFOLDED_HINT = "Hover a category · click to zoom in · drag to rearrange";

type Props = {
	hubs: ConstellationHub[];
	items: ConstellationItem[];
	eyebrow: string;
	title: string;
	lede: string;
	label: string;
	worlds: WorldInfo[];
};

/**
 * Which Highlight is zoomed into, which group (Community Impact: a year) and which entry is open.
 * Mirrored in the URL: ?world=blogs&entry=<slug>, or ?world=impact&year=2025&entry=<slug>.
 */
type WorldView = { id: string; group: string | null; entry: string | null; leaving: boolean; instant: boolean; anchor?: { x: number; y: number } };
/** Our history entries carry their depth (1 = inside a Highlight, +1 for a group, +1 for an entry), so "back" buttons can use history.back(). */
const level = (v: { group?: string | null; entry: string | null } | null) => (!v ? 0 : 1 + (v.group ? 1 : 0) + (v.entry ? 1 : 0));
/** Reads ?world / ?year / ?entry against what exists (unknown values are ignored). */
const readView = (worlds: WorldInfo[], q: URLSearchParams) => {
	const w = worlds.find((x) => x.id === q.get("world"));
	if (!w) return null;
	const group = w.groups?.some((g) => g.slug === q.get("year")) ? q.get("year") : null;
	const e = w.entries.find((x) => x.slug === q.get("entry"));
	// In a grouped Highlight an entry only opens inside its own group.
	const entry = e && (!w.groups || e.group === group) ? e.slug : null;
	return { w, group, entry };
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/**
 * The bands under the hero skip rendering until they near the viewport (content-visibility, B14), so until then
 * they're 900 px placeholders and anything below them is measured in the wrong place. Before any in-page jump
 * (index dive, #link, card scroll) render them all for real, then measure (B28). It stays on for the rest of the
 * visit: the first paint has had its gain, and switching back would bring the placeholder jumps back.
 */
const renderBands = (from: Element | null | undefined) => {
	const root = from?.closest<HTMLElement>(`.${styles.root}`);
	if (!root || "cvOff" in root.dataset) return;
	root.dataset.cvOff = "";
	void root.offsetHeight; // lay out at the real heights now, before anyone measures
};
/**
 * What kind of visit this mount is (B29). "fresh": the document's first, plain load, which opens at the top and keeps
 * the first-paint gain. "hard": a reload or Back/Forward into the document. "soft": any later client-side mount (soft
 * Back to the homepage). On the last two the browser restores the old scroll offset, but the bands have lost their
 * remembered heights and are back at the 900 px placeholder, so the offset would land in the wrong band.
 */
let mountedBefore = false;
const visitKind = (): "fresh" | "hard" | "soft" => {
	if (mountedBefore) return "soft";
	mountedBefore = true;
	const nav = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
	return !nav || nav.type === "navigate" ? "fresh" : "hard";
};
/** The page as the visitor left it: scroll offset, viewport width and each band's laid-out height (real or placeholder). */
type LeftAt = { path: string; w: number; y: number; bands: number[] };
const LEFT_KEY = "hl-left";
/** The height contain-intrinsic-block-size stands in for: the content box, without padding and borders. */
const contentHeight = (el: HTMLElement) => {
	const cs = getComputedStyle(el);
	const edges = ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"] as const;
	return Math.round((el.getBoundingClientRect().height - edges.reduce((sum, k) => sum + (parseFloat(cs[k]) || 0), 0)) * 100) / 100;
};
const bandsOf = (root: Element) => [...root.querySelectorAll<HTMLElement>(`.${styles.about}, .${styles.world}, .${styles.contact}`)];
/** "#a%20b" → "a b"; a malformed escape (#%E0) is no target rather than a URIError. */
const hashId = (hash: string) => {
	try {
		return decodeURIComponent(hash.slice(1));
	} catch {
		return "";
	}
};
const canHover = () => window.matchMedia("(hover: hover)").matches;
/** Phones held upright: the sky is a framed panel below the title, and a Highlight opens as a full-screen view. */
const phone = () => window.matchMedia(PHONE_QUERY).matches;

/**
 * Homepage hero: the constellation (folded sun → categories → items). Hovering a category previews
 * its entries; clicking it "dives" into that section below, and "Back to highlights" climbs back out.
 * Also runs the page-wide bits: reveal-on-scroll, [data-dive] / [data-back] links, deep links (#blogs).
 */
export function HighlightsStage({ hubs, items, eyebrow, title, lede, label, worlds }: Props) {
	const router = useRouter();
	const stageRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const skyRef = useRef<SVGSVGElement>(null);
	/** The box the sky is drawn in: the whole stage, or (phones) the framed panel. The camera centres on it. */
	const panelRef = useRef<HTMLDivElement>(null);
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
	const [world, setWorldState] = useState<WorldView | null>(null);
	const worldRef = useRef<WorldView | null>(null);
	/** Page scroll when a Highlight opened, restored when it closes (so the sky isn't left half scrolled under the header). */
	const scrollBeforeWorld = useRef(0);
	const setWorld = useCallback((v: WorldView | null) => {
		worldRef.current = v;
		setWorldState(v);
	}, []);

	// B29: give the bands back the heights they had when the visitor left, before the restored scroll offset is used,
	// so the offset points at the same content. They keep skipping rendering (B14); the stored height stands in until
	// one renders (`auto <h>px`). Soft Back: React renders a popstate navigation synchronously inside the event and
	// Next leaves scroll restoration to the browser, so this layout effect runs before the browser restores. Reload /
	// hard Back: the browser restores while the HTML is still parsing, long before hydration, and stops short at the
	// placeholder page's end; so scroll to the stored offset here. Nothing stored (or another width): render the bands
	// for real instead, the B28 fallback.
	const visitRef = useRef<ReturnType<typeof visitKind> | null>(null);
	useLayoutEffect(() => {
		const root = stageRef.current?.closest<HTMLElement>(`.${styles.root}`);
		if (!root) return;
		const path = location.pathname; // on unmount the URL is already the next page's
		const save = () => {
			try {
				const left: LeftAt = { path, w: innerWidth, y: Math.round(scrollY), bands: bandsOf(root).map(contentHeight) };
				sessionStorage.setItem(LEFT_KEY, JSON.stringify(left));
			} catch {}
		};
		window.addEventListener("pagehide", save);
		visitRef.current ??= visitKind();
		if (visitRef.current !== "fresh") {
			let left: LeftAt | null = null;
			try {
				left = JSON.parse(sessionStorage.getItem(LEFT_KEY) ?? "null") as LeftAt | null;
			} catch {}
			const bands = bandsOf(root);
			if (left && left.path === path && left.w === innerWidth && left.bands?.length === bands.length) {
				bands.forEach((b, i) => b.style.setProperty("contain-intrinsic-block-size", `auto ${left.bands[i]}px`));
				if (visitRef.current === "hard" && Math.abs(scrollY - left.y) > 2) window.scrollTo({ top: left.y, behavior: "instant" });
			} else renderBands(root);
		}
		return () => {
			window.removeEventListener("pagehide", save);
			save(); // a client-side navigation away: the next page hasn't scrolled to its top yet
		};
	}, []);

	/* ------------------------------ Camera ------------------------------ */

	/**
	 * Points the camera: graph point (x, y) moves to (ax, ay) on screen at zoom s. The background star layers
	 * travel only part of the way (MOTION.depth), so the sky has depth: near things rush past, far ones barely move.
	 */
	const place = useCallback((x: number, y: number, s: number, ax: number, ay: number) => {
		const t = (d: number) => {
			if (s === 1) return "";
			const k = 1 + (s - 1) * d;
			return `translate(${x + d * (ax - x) - k * x}px, ${y + d * (ay - y) - k * y}px) scale(${k})`;
		};
		if (svgRef.current) svgRef.current.style.transform = t(1);
		skyRef.current?.querySelectorAll<SVGGElement>("g[data-depth]").forEach((g) => (g.style.transform = t(Number(g.dataset.depth))));
	}, []);
	/** Camera centred on (x, y) at zoom s; s = 1 is the overview. */
	const camera = useCallback(
		(x: number, y: number, s: number) => {
			const box = panelRef.current ?? stageRef.current;
			if (!box) return;
			const { width, height } = box.getBoundingClientRect();
			place(x, y, s, width / 2, height / 2);
		},
		[place],
	);
	const stageCentre = () => {
		const r = stageRef.current?.getBoundingClientRect();
		return { x: (r?.width ?? 0) / 2, y: (r?.height ?? 0) / 2 };
	};
	/** The camera's transition style ("dive", "none", or the default), on the graph and the star layers alike. */
	const setCam = (v?: "dive" | "none") => {
		for (const el of [svgRef.current, skyRef.current]) {
			if (!el) continue;
			if (v) el.dataset.cam = v;
			else delete el.dataset.cam;
		}
	};

	const lean = useCallback(
		(id: string) => {
			const p = engineRef.current?.hubPoint(id);
			if (!p || reduced()) return;
			// Scale around the hovered category, so it stays under the pointer while the sky leans in.
			place(p.x, p.y, MOTION.lean, p.x, p.y);
		},
		[place],
	);
	const unlean = useCallback(() => {
		if (!busyRef.current) place(0, 0, 1, 0, 0);
	}, [place]);

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
				renderBands(card);
				card.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
				delete card.dataset.flash;
				void card.offsetWidth;
				card.dataset.flash = "";
				setTimeout(() => delete card.dataset.flash, 2400);
			},
			reduced() ? 0 : MOTION.arrive.card,
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
				renderBands(sec);
				sec.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
				sec.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
				setTimeout(() => arrive(sec, key), reduced() ? 0 : MOTION.dive.scroll);
				return;
			}
			busyRef.current = true;
			stage.classList.add(styles.diving);
			closePeek();
			if (tipRef.current) tipRef.current.hidden = true;
			const sr = stage.getBoundingClientRect();
			setCam("dive");
			camera(p.x, p.y, MOTION.zoomDive);
			setWarp(hubColor(id), sr.left + sr.width / 2, sr.top + sr.height / 2, "armed");
			await wait(MOTION.dive.approach);
			warp.dataset.state = "open";
			await wait(MOTION.dive.warp);
			renderBands(sec);
			sec.scrollIntoView({ behavior: "instant" as ScrollBehavior });
			setCam("none");
			camera(0, 0, 1);
			engineRef.current?.reset();
			void svg.getBoundingClientRect();
			setCam();
			stage.classList.remove(styles.diving);
			arrive(sec, key);
			warp.dataset.state = "fading";
			await wait(MOTION.dive.fade);
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
			setCam("none");
			camera(p.x, p.y, MOTION.zoomDive);
			void svg.getBoundingClientRect();
			setCam();
			await wait(30);
			setCam("dive");
			camera(0, 0, 1);
			const sr = stage.getBoundingClientRect();
			setWarp(hubColor(fromId), sr.left + p.x, sr.top + p.y, "full");
			void warp.offsetWidth;
			warp.dataset.state = "closing";
			await wait(MOTION.climb.pull);
			setCam();
			setWarp("", 0, 0);
			busyRef.current = false;
			engineRef.current?.hubElement(fromId)?.focus({ preventScroll: true });
		},
		[camera], // eslint-disable-line react-hooks/exhaustive-deps
	);

	/* ------------------------ Zoom into a Highlight ------------------------ */

	const writeUrl = (v: { id: string; group?: string | null; entry: string | null } | null, mode: "push" | "replace") => {
		const p = new URLSearchParams(location.search);
		p.delete("world");
		p.delete("year");
		p.delete("entry");
		if (v) p.set("world", v.id);
		if (v?.group) p.set("year", v.group);
		if (v?.entry) p.set("entry", v.entry);
		const qs = p.toString();
		try {
			const url = location.pathname + (qs ? `?${qs}` : "");
			if (mode === "push") history.pushState({ hl: level(v) }, "", url);
			// Same level (e.g. Next entry): keep the depth marker, so Back still goes up a level.
			else history.replaceState({ ...history.state, hl: level(v) === level(worldRef.current) ? history.state?.hl : undefined }, "", url);
		} catch {
			/* ignore */
		}
	};
	/** True when the previous history entry is the level above this one (so Back = up one level). */
	const canGoBack = () => (history.state as { hl?: number } | null)?.hl === level(worldRef.current);

	const enterWorld = useCallback(
		async (id: string, entry: string | null = null, push = true, group: string | null = null) => {
			const stage = stageRef.current, svg = svgRef.current;
			if (!stage || !svg || busyRef.current || worldRef.current || !worlds.some((w) => w.id === id)) return;
			scrollBeforeWorld.current = window.scrollY;
			const onPhone = phone();
			// One history entry per level, so Back climbs out one level at a time.
			if (push) writeUrl({ id, entry: null }, "push");
			if (push && group) writeUrl({ id, group, entry: null }, "push");
			if (push && entry) writeUrl({ id, group, entry }, "push");
			closePeek();
			if (tipRef.current) tipRef.current.hidden = true;
			// The stage is the first thing on the page; make sure all of it is on screen.
			// (Phones: the Highlight opens as a full-screen view, so the page stays where it is.)
			if (!onPhone && Math.abs(stage.getBoundingClientRect().top - stage.offsetTop) > 4) window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
			const p = engineRef.current?.hubPoint(id);
			if (reduced() || !p || onPhone) {
				stage.dataset.world = "open";
				setWorld({ id, group, entry, leaving: false, instant: false });
				return;
			}
			busyRef.current = true;
			stage.dataset.world = "zoom";
			setCam("dive");
			camera(p.x, p.y, MOTION.zoomWorld);
			await wait(MOTION.world.approach);
			// The camera ends with the Highlight in the middle of the stage: the world view's title takes over from there.
			setWorld({ id, group, entry, leaving: false, instant: false, anchor: stageCentre() });
			await wait(MOTION.world.settle);
			stage.dataset.world = "open";
			setCam("none");
			camera(0, 0, 1);
			engineRef.current?.reset();
			void svg.getBoundingClientRect();
			setCam();
			busyRef.current = false;
		},
		[worlds, camera, closePeek, setWorld],
	);

	const leaveWorld = useCallback(async () => {
		const cur = worldRef.current, stage = stageRef.current, svg = svgRef.current;
		if (!cur || cur.leaving || !stage || !svg) return;
		const keyboard = !!document.activeElement?.closest(`.${styles.wRoot}`)?.matches(":focus-within") && document.activeElement?.matches(":focus-visible");
		busyRef.current = true;
		// Arrived by link: the sky is still folded, so open it on the way out.
		if (foldedRef.current) engineRef.current?.setFolded(false);
		const p = phone() ? null : engineRef.current?.hubPoint(cur.id);
		// The title flies back to the middle, where the zoomed-in sky shows its Highlight again.
		setWorld({ ...cur, leaving: true, anchor: p && !reduced() ? stageCentre() : undefined });
		if (reduced() || !p) {
			await wait(reduced() ? 0 : MOTION.leave.instant);
			delete stage.dataset.world;
		} else {
			setCam("none");
			camera(p.x, p.y, MOTION.zoomWorld);
			stage.dataset.world = "zoom";
			void svg.getBoundingClientRect();
			await wait(MOTION.leave.hold);
			setCam("dive");
			delete stage.dataset.world;
			camera(0, 0, 1);
			await wait(MOTION.leave.pull);
		}
		setWorld(null);
		window.scrollTo({ top: scrollBeforeWorld.current, behavior: "instant" as ScrollBehavior });
		await wait(reduced() || !p ? 0 : MOTION.leave.settle);
		setCam();
		busyRef.current = false;
		if (keyboard) engineRef.current?.hubElement(cur.id)?.focus({ preventScroll: true });
	}, [camera, setWorld]);

	/** "All highlights" button / Escape. */
	const closeWorld = useCallback(() => {
		if (canGoBack() && level(worldRef.current) === 1) return history.back();
		writeUrl(null, "replace");
		void leaveWorld();
	}, [leaveWorld]);

	const goEntry = useCallback(
		(slug: string | null, how: "open" | "step" | "list") => {
			const cur = worldRef.current;
			if (!cur || cur.leaving) return;
			if (how === "list" && canGoBack()) return history.back();
			const next = { ...cur, entry: slug };
			writeUrl(next, how === "open" && !cur.entry ? "push" : "replace");
			setWorld(next);
		},
		[setWorld],
	);

	/** Open a group (a year), optionally straight to one of its entries; or back to all groups (null). */
	const goGroup = useCallback(
		(group: string | null, how: "open" | "list", entry?: string) => {
			const cur = worldRef.current;
			if (!cur || cur.leaving) return;
			if (how === "list" && canGoBack()) return history.back();
			const next = { ...cur, group, entry: entry ?? null };
			if (how === "open") {
				writeUrl({ ...cur, group, entry: null }, "push");
				if (entry) writeUrl(next, "push");
			} else writeUrl(next, "replace");
			setWorld(next);
		},
		[setWorld],
	);

	// Browser Back / Forward between the sky, a Highlight, a group and an entry.
	useEffect(() => {
		const sync = () => {
			const v = readView(worlds, new URLSearchParams(location.search));
			const cur = worldRef.current;
			if (!v) {
				if (cur) void leaveWorld();
				return;
			}
			if (cur && cur.id === v.w.id && !cur.leaving) setWorld({ ...cur, group: v.group, entry: v.entry });
			else if (!cur) void enterWorld(v.w.id, v.entry, false, v.group);
		};
		window.addEventListener("popstate", sync);
		return () => window.removeEventListener("popstate", sync);
	}, [worlds, enterWorld, leaveWorld, setWorld]);

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
				sky: skyRef.current ? { svg: skyRef.current, depths: [MOTION.depth.near, MOTION.depth.far] } : undefined,
				tip,
				hubs,
				items,
				lines: DEFAULT_LINES,
				unfoldedHint: UNFOLDED_HINT,
				// The Open/Fold button's corner (button + its top/right padding).
				keepClear: { width: 150, height: 66 },
				onHint: setHint,
				onFolded: (f) => {
					foldedRef.current = f;
					setFolded(f);
				},
				navigate: (href) => router.push(href),
				onHubActivate: (id) => void enterWorld(id),
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
				// A tile zooms into its Highlight with that entry (or group, e.g. a year) open.
				onItemActivate: (item) => {
					const w = worlds.find((x) => x.id === item.hub);
					const group = w?.groups?.find((g) => g.itemId === item.id);
					if (group) {
						void enterWorld(item.hub, null, true, group.slug);
						return true;
					}
					const entry = w?.entries.find((e) => e.itemId === item.id);
					if (!entry) return false;
					void enterWorld(item.hub, entry.slug, true, entry.group ?? null);
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
	}, [hubs, items, worlds, router, enterWorld, openPeek, closePeek, lean, unlean]);

	/* ------------------------ Hero first (scroll lock) ------------------------ */

	/**
	 * A fresh visit opens on the folded sky alone, and the page doesn't scroll until the visitor opens the sky by
	 * clicking the sun in the centre (or the Open button, which is also the keyboard way in). Scrolling, swiping and scroll keys do
	 * nothing while it's folded (Kay, 2026-11-24: click only). Not applied on a deep link (#blogs, ?world=), a reload
	 * or Back (the browser restores a scroll offset), phones held upright (their sky panel is taller than the screen),
	 * or when the script failed (it only starts once the engine is ready). Focus moving below the sky (Tab, a screen
	 * reader) releases it, so keyboard and assistive-tech users are never stuck.
	 */
	const lockedRef = useRef(false);
	const unlockRef = useRef<() => void>(() => {});
	useEffect(() => {
		const stage = stageRef.current;
		if (!ready || !stage || lockedRef.current) return;
		const deepLink = !!location.hash || new URLSearchParams(location.search).has("world");
		if (visitRef.current !== "fresh" || deepLink || scrollY > 4 || phone() || !foldedRef.current) return;
		const html = document.documentElement;
		lockedRef.current = true;
		html.dataset.heroLock = "";

		const onFocus = (e: FocusEvent) => {
			if (!stage.contains(e.target as Node)) unlockRef.current();
		};
		const unlock = () => {
			if (!lockedRef.current) return;
			lockedRef.current = false;
			delete html.dataset.heroLock;
			document.removeEventListener("focusin", onFocus);
		};
		unlockRef.current = unlock;
		document.addEventListener("focusin", onFocus);
		return unlock;
	}, [ready]);
	// Opened: the page scrolls again.
	useEffect(() => {
		if (!folded) unlockRef.current();
	}, [folded]);

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

		// B28: render the bands for real before a #link to them scrolls, so it lands on the target. Capture phase, so
		// this runs before next/link's handler and before the browser's own jump (header Contact, /#index, …).
		const inBands = (id: string) => {
			const t = id ? document.getElementById(id) : null;
			return !!t && root.contains(t) && !t.closest(`.${styles.stage}`) ? t : null;
		};
		const onLink = (e: MouseEvent) => {
			// HTML links to this page only: the constellation's SVG <a> tiles have no .hash, and other pages' #links
			// don't scroll this one (B30).
			const a = (e.target as Element | null)?.closest?.("a[href*='#']");
			if (!(a instanceof HTMLAnchorElement) || a.origin + a.pathname !== location.origin + location.pathname) return;
			if (inBands(hashId(a.hash))) renderBands(root);
		};
		document.addEventListener("click", onLink, true);
		// A hash typed into the address bar has already jumped (with placeholder heights): land on it again.
		const onHash = () => {
			const t = inBands(hashId(location.hash));
			if (!t || "cvOff" in root.dataset) return;
			renderBands(root);
			t.scrollIntoView({ block: "start" });
		};
		window.addEventListener("hashchange", onHash);

		// Deep links (/#events) land with the section already revealed.
		const deep = hashId(location.hash);
		const sec = deep && hubs.some((h) => h.id === deep) ? document.getElementById(deep) : null;
		if (sec) arrive(sec);

		// Links into a Highlight (/?world=blogs&entry=<slug>, /?world=impact&year=2025) open it straight away.
		const v = readView(worlds, new URLSearchParams(location.search));
		const stage = stageRef.current;
		if (v && stage) {
			stage.dataset.world = "open";
			queueMicrotask(() => setWorld({ id: v.w.id, group: v.group, entry: v.entry, leaving: false, instant: true }));
		}

		return () => {
			io.disconnect();
			root.removeEventListener("click", onClick);
			document.removeEventListener("click", onLink, true);
			window.removeEventListener("hashchange", onHash);
			delete root.dataset.js;
		};
	}, [hubs, worlds, dive, climb, arrive, setWorld]);

	const worldInfo = world ? worlds.find((w) => w.id === world.id) : undefined;
	const peekItems = peek ? items.filter((it) => it.hub === peek.hub.id).slice(0, 3) : [];

	return (
		<div
			ref={stageRef}
			id="top"
			className={`${styles.stage} ${folded ? styles.folded : ""}`}
			// Folded, a click on the sun in the centre opens the graph; keyboard users have the Open button.
		>
			{/* Title first: on phones it sits above the sky panel, in reading order (it's absolutely placed on wider screens). */}
			<div className={styles.intro}>
				<p className={styles.eyebrow}>{eyebrow}</p>
				<h1 id="hero-title">{title}</h1>
				<p className={styles.lede}>{lede}</p>
			</div>
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
			<div ref={panelRef} className={styles.panel}>
				<svg ref={skyRef} className={styles.sky} aria-hidden="true" />
				<svg ref={svgRef} className={styles.graph} role="group" aria-label={label} />
				<div ref={tipRef} className={styles.tip} hidden />
			</div>
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
						<div className={`${styles.peekGo} ${styles.mono}`}>Click to zoom into {peek.hub.label} →</div>
					</>
				)}
			</div>
			{world && worldInfo && (
				<HighlightsWorld
					key={world.id}
					world={worldInfo}
					entry={world.entry}
					leaving={world.leaving}
					instant={world.instant}
					anchor={world.anchor}
					group={world.group}
					onEntry={goEntry}
					onGroup={goGroup}
					onClose={closeWorld}
				/>
			)}
			<div ref={warpRef} className={styles.warp} aria-hidden="true" />
		</div>
	);
}
