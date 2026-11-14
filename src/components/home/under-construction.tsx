"use client";

import { useEffect, useRef, useState } from "react";
import { IBM_Plex_Mono } from "next/font/google";
import {
	drag,
	easeCubicIn,
	forceCollide,
	forceLink,
	forceManyBody,
	forceSimulation,
	forceX,
	forceY,
	interval,
	select,
	timer,
	type Simulation,
	type SimulationLinkDatum,
	type SimulationNodeDatum,
	type Timer,
} from "d3";
import styles from "./under-construction.module.css";

const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

type ColorVar = "--blue" | "--sun" | "--red" | "--leaf";

const HUBS: { id: string; label: string; color: ColorVar; weight: number }[] = [
	{ id: "culture", label: "Culture", color: "--blue", weight: 16 },
	{ id: "blog", label: "Blog", color: "--leaf", weight: 30 },
	{ id: "events", label: "Events", color: "--blue", weight: 12 },
	{ id: "festivals", label: "Festivals", color: "--sun", weight: 18 },
	{ id: "popups", label: "Pop-ups", color: "--red", weight: 10 },
	{ id: "community", label: "Community", color: "--leaf", weight: 22 },
	{ id: "embassy", label: "Embassy news", color: "--blue", weight: 8 },
	{ id: "portfolio", label: "Portfolio", color: "--sun", weight: 24 },
	{ id: "construction", label: "Construction", color: "--red", weight: 9 },
];

type Item = { hub: string; title: string; note?: string; image?: string; href?: string };

/** Sample tiles. Replace with real posts: { hub, title, note, image, href } */
const ITEMS: Item[] = [
	{ hub: "portfolio", title: "Torslanda torg shop", note: "2023 – 2026" },
	{ hub: "portfolio", title: "merkadoph.se", note: "Three years online" },
	{ hub: "portfolio", title: "PH Asian Market relaunch", note: "October 2026" },
	{ hub: "popups", title: "Tahooo by Merkado PH", note: "Taho in Gothenburg" },
	{ hub: "popups", title: "Sarap Without Waste", note: "Zero-waste Filipino-Swedish food" },
	{ hub: "blog", title: "Filipino culture stories", note: "Moving over from the old site" },
	{ hub: "blog", title: "Recipes from home", note: "Sample tile" },
	{ hub: "festivals", title: "Festival booths", note: "Sample tile" },
	{ hub: "community", title: "Gothenburg kababayan", note: "Sample tile" },
	{ hub: "embassy", title: "Embassy announcements", note: "Sample tile" },
	{ hub: "events", title: "Upcoming events", note: "Sample tile" },
	{ hub: "culture", title: "Traditions & holidays", note: "Sample tile" },
	{ hub: "construction", title: "Construction projects", note: "Sample tile" },
];

/** Shakespeare and Rizal cues: one is drawn at random on each visit and each time the page folds again. */
const LINES: [string, string][] = [
	["Noli me tángere… but please, do.", "Click."],
	["Ang hindi lumingon sa pinanggalingan…", "Click to see where we came from."],
	["Ang kabataan ang pag-asa ng bayan.", "Click to meet the future."],
	["Before the Filibusterismo, the Noli.", "Click to begin chapter one."],
	["Mi último adiós? Hindi pa.", "Click."],
	["Sa aking mga kababayan sa Gothenburg.", "Click to open."],
	["Noli me tángere.", "But go ahead."],
	["Once more unto the breach, dear friends.", "Click."],
	["What light through yonder window breaks?", "Click to see."],
	["The world's mine oyster.", "Click to open it."],
	["All the world's a stage.", "Click to raise the curtain."],
	["Something is rotten in the state of Denmark…", "but not in Gothenburg. Click."],
	["Our revels now are just beginning.", "Click."],
	["To click, or not to click.", "That is the question."],
];

const UNFOLDED_HINT = "Hover a category · drag to rearrange";

interface GNode extends SimulationNodeDatum, Partial<Item> {
	id: string;
	kind: "center" | "hub" | "leaf";
	shown: boolean;
	color?: string;
	label?: string;
	angle?: number;
	tx?: number;
	ty?: number;
	count?: number;
	tile?: boolean;
	len?: number;
}
interface GLink extends SimulationLinkDatum<GNode> {
	kind: "core" | "spoke" | "cross";
	hub?: string;
}
const src = (l: GLink) => l.source as GNode;
const tgt = (l: GLink) => l.target as GNode;

/** The public "coming soon" homepage: a folded constellation of what's coming that bursts open on click. */
export function UnderConstruction() {
	const stageRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const tipRef = useRef<HTMLDivElement>(null);
	const setFoldedRef = useRef<(next: boolean) => void>(() => {});
	const [folded, setFoldedState] = useState(true);
	const [hint, setHint] = useState("");

	useEffect(() => {
		const stage = stageRef.current;
		const svgEl = svgRef.current;
		const tip = tipRef.current;
		if (!stage || !svgEl || !tip) return;

		const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		let lineIdx = Math.floor(Math.random() * LINES.length);
		const nextLine = () => {
			let i;
			do i = Math.floor(Math.random() * LINES.length);
			while (i === lineIdx && LINES.length > 1);
			lineIdx = i;
		};

		let folded = true;
		let busy = false;
		let sim: Simulation<GNode, GLink> | undefined;
		let drift: Timer | undefined;
		let api: { unfold: () => void; fold: () => void } | undefined;
		const timeouts = new Set<ReturnType<typeof setTimeout>>();
		const later = (fn: () => void, ms: number) => {
			const t = setTimeout(() => {
				timeouts.delete(t);
				fn();
			}, ms);
			timeouts.add(t);
		};

		function build() {
			sim?.stop();
			drift?.stop();
			const { width, height } = svgEl!.getBoundingClientRect();
			if (!width || !height) return;

			const css = getComputedStyle(stage!);
			const C = (n: string) => css.getPropertyValue(n).trim();
			const INK = C("--ink"), BLUE = C("--blue"), SUN = C("--sun"), MUTED = C("--muted");
			const TILE_BG = C("--tile-bg"), STAR = C("--star"), FONT_DISPLAY = C("--font-display");

			const small = width < 560;
			const cx = width / 2, cy = height * (small ? 0.42 : 0.48);
			const rand = (a: number, b: number) => a + Math.random() * (b - a);
			const sizeScale = small ? 0.4 : 1;

			const nodes: GNode[] = [{ id: "center", kind: "center", fx: cx, fy: cy, x: cx, y: cy, shown: true }];
			const links: GLink[] = [];
			const hidden = () => ({ x: cx, y: cy, fx: cx, fy: cy, shown: false });

			// Scatter hubs around the page: uneven angles and uneven distances from the center
			const offset = Math.random() * Math.PI * 2;
			HUBS.forEach((h, i) => {
				const a = offset + (i / HUBS.length) * Math.PI * 2 + rand(-0.3, 0.3);
				const reach = rand(0.45, 0.95);
				const tx = cx + Math.cos(a) * width * 0.4 * reach;
				const ty = cy + Math.sin(a) * height * 0.4 * reach;
				const items = ITEMS.filter((it) => it.hub === h.id);
				const dots = Math.max(3, Math.round(h.weight * sizeScale));
				const color = C(h.color);
				const hub: GNode = {
					id: h.id, kind: "hub", hub: h.id, color, label: h.label,
					angle: Math.atan2(ty - cy, tx - cx), tx, ty, count: items.length + dots,
					...(folded ? hidden() : { x: tx, y: ty, shown: true }),
				};
				nodes.push(hub);
				links.push({ source: "center", target: h.id, kind: "core", hub: h.id });
				// Bigger clusters reach further, so they read as fuller stars
				const reachLen = (small ? 30 : 55) + Math.sqrt(dots) * (small ? 8 : 16);
				const addLeaf = (extra: Partial<GNode> & { id: string }) => {
					const n: GNode = {
						kind: "leaf", hub: h.id, color, len: reachLen * rand(0.45, 1.25), ...extra,
						...(folded ? hidden() : { x: tx + rand(-3, 3), y: ty + rand(-3, 3), shown: true }),
					};
					nodes.push(n);
					links.push({ source: h.id, target: n.id, kind: "spoke", hub: h.id });
				};
				items.forEach((it, j) => addLeaf({ ...it, id: `${h.id}-i${j}`, tile: true }));
				for (let j = 0; j < dots; j++) addLeaf({ id: `${h.id}-d${j}` });
			});

			// Faint threads that cross between clusters
			const leaves = nodes.filter((n) => n.kind === "leaf");
			const hubNodes = nodes.filter((n) => n.kind === "hub");
			const pick = <T,>(arr: T[]) => arr[(Math.random() * arr.length) | 0];
			for (let i = 0; i < (small ? 14 : 40); i++) {
				const p = pick(leaves);
				const q = Math.random() < 0.45 ? pick(hubNodes) : pick(leaves);
				if (p.hub !== q.hub) links.push({ source: p.id, target: q.id, kind: "cross" });
			}
			// Some tiles belong to two categories
			leaves.filter((n) => n.tile).forEach((n) => {
				if (Math.random() < 0.5) {
					const other = pick(hubNodes.filter((hn) => hn.id !== n.hub));
					links.push({ source: other.id, target: n.id, kind: "cross" });
				}
			});

			const s = forceSimulation<GNode, GLink>(nodes)
				.force("link", forceLink<GNode, GLink>(links).id((d) => d.id)
					.distance((l) => (l.kind === "spoke" ? (tgt(l).len ?? 0) : 0))
					.strength((l) => (l.kind === "spoke" ? 0.7 : 0)))
				.force("hubX", forceX<GNode>((d) => d.tx ?? cx).strength((d) => (d.kind === "hub" ? 0.18 : 0)))
				.force("hubY", forceY<GNode>((d) => d.ty ?? cy).strength((d) => (d.kind === "hub" ? 0.18 : 0)))
				.force("charge", forceManyBody<GNode>().strength((d) => (d.kind === "hub" ? -260 : d.tile ? -70 : -34)))
				.force("collide", forceCollide<GNode>((d) => (d.tile ? 20 : d.kind === "hub" ? 26 : 5)));
			sim = s;

			const svg = select(svgEl!);
			svg.selectAll("*").remove();
			svg.attr("viewBox", `0 0 ${width} ${height}`);

			// Woven-mat (banig) patterns for placeholder tiles
			const defs = svg.append("defs");
			HUBS.forEach((h) => {
				const p = defs.append("pattern").attr("id", `weave-${h.id}`).attr("width", 8).attr("height", 8)
					.attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)");
				p.append("rect").attr("width", 8).attr("height", 8).attr("fill", TILE_BG);
				p.append("rect").attr("width", 4).attr("height", 8).attr("fill", C(h.color)).attr("opacity", 0.55);
				p.append("rect").attr("y", 4).attr("width", 8).attr("height", 2).attr("fill", C(h.color)).attr("opacity", 0.3);
			});

			const stars = svg.append("g").attr("aria-hidden", "true");
			for (let i = 0; i < 70; i++) {
				stars.append("circle").attr("cx", Math.random() * width).attr("cy", Math.random() * height)
					.attr("r", Math.random() * 0.9 + 0.3).attr("fill", STAR).attr("opacity", Math.random() * 0.5 + 0.1);
			}

			const root = svg.append("g");
			const baseOp = (d: GLink) => (d.kind === "cross" ? 0.13 : d.kind === "core" ? 0.28 : 0.55);
			const linkShown = (l: GLink) => src(l).shown && tgt(l).shown;
			const linkSel = root.append("g").selectAll<SVGLineElement, GLink>("line").data(links).join("line")
				.attr("stroke", (d) => (d.kind === "cross" ? BLUE : tgt(d).color ?? BLUE))
				.attr("stroke-width", (d) => (d.kind === "core" ? 1.2 : 0.8))
				.attr("stroke-opacity", (d) => (linkShown(d) ? baseOp(d) : 0));

			const nodeSel = root.append("g").selectAll<SVGGElement, GNode>("g").data(nodes).join("g")
				.attr("class", (d) => (d.kind === "hub" ? "hub" : d.tile ? "tile" : null))
				.attr("opacity", (d) => (d.shown ? 1 : 0))
				.attr("pointer-events", (d) => (d.shown ? null : "none"));

			// The folded sun: center ring with a slow pulse while folded
			const center = nodeSel.filter((d) => d.kind === "center");
			const pulse = center.append("circle").attr("r", 7).attr("fill", "none")
				.attr("stroke", SUN).attr("stroke-width", 1).attr("opacity", folded ? 1 : 0);
			if (!reduceMotion) {
				pulse.append("animate").attr("attributeName", "r").attr("values", "7;30").attr("dur", "2.4s").attr("repeatCount", "indefinite");
				pulse.append("animate").attr("attributeName", "stroke-opacity").attr("values", "0.8;0").attr("dur", "2.4s").attr("repeatCount", "indefinite");
			}
			center.append("circle").attr("r", 7).attr("fill", "none").attr("stroke", SUN).attr("stroke-width", 1.5);
			const coreDot = center.append("circle").attr("r", folded ? 3 : 0).attr("fill", SUN);
			const cue = center.append("text").attr("y", 48).attr("text-anchor", "middle").attr("opacity", folded ? 1 : 0);
			const cueQuote = cue.append("tspan").attr("x", 0)
				.attr("font-family", FONT_DISPLAY).attr("font-size", small ? 13 : 15).attr("fill", INK);
			const cueAction = cue.append("tspan").attr("x", 0).attr("dy", 20)
				.attr("font-size", 10.5).attr("letter-spacing", "0.14em").attr("fill", SUN);
			const writeCue = () => {
				const [quote, action] = LINES[lineIdx];
				cueQuote.text(quote);
				cueAction.text(action.toUpperCase());
				setHint(quote);
			};
			if (folded) writeCue();

			nodeSel.filter((d) => d.kind === "leaf" && !d.tile).append("circle").attr("r", 2.4).attr("fill", (d) => d.color ?? BLUE);

			const tiles = nodeSel.filter((d) => !!d.tile);
			tiles.append("rect").attr("x", -14).attr("y", -14).attr("width", 28).attr("height", 28)
				.attr("fill", (d) => (d.image ? TILE_BG : `url(#weave-${d.hub})`))
				.attr("stroke", INK).attr("stroke-opacity", 0.7).attr("stroke-width", 1);
			tiles.filter((d) => !!d.image).append("image").attr("href", (d) => d.image ?? "")
				.attr("x", -12).attr("y", -12).attr("width", 24).attr("height", 24).attr("preserveAspectRatio", "xMidYMid slice");

			const hubs = nodeSel.filter((d) => d.kind === "hub").attr("tabindex", (d) => (d.shown ? 0 : -1))
				.attr("role", "button").attr("aria-label", (d) => d.label ?? "");
			hubs.append("rect").attr("x", -5).attr("y", -5).attr("width", 10).attr("height", 10).attr("fill", (d) => d.color ?? BLUE);
			const label = hubs.append("text").attr("x", 13).attr("y", -9).attr("fill", INK).attr("font-size", small ? 12 : 14);
			label.append("tspan").text((d) => d.label ?? "");
			label.append("tspan").attr("dx", 5).attr("dy", -6).attr("font-size", small ? 9 : 10).attr("fill", MUTED).text((d) => d.count ?? "");

			let pinned: GNode | null = null;
			const spotlight = (h: GNode) => {
				linkSel.attr("stroke-opacity", (l) => (!linkShown(l) ? 0 : l.hub === h.id ? 0.95 : 0.04));
				nodeSel.attr("opacity", (n) => (!n.shown ? 0 : n.kind === "center" || n.hub === h.id ? 1 : 0.18));
			};
			const reset = () => {
				linkSel.attr("stroke-opacity", (l) => (linkShown(l) ? baseOp(l) : 0));
				nodeSel.attr("opacity", (n) => (n.shown ? 1 : 0));
			};
			hubs.on("mouseenter focus", (_, h) => { if (!busy) spotlight(h); })
				.on("mouseleave blur", () => { if (!busy) (pinned ? spotlight(pinned) : reset()); })
				.on("click", (e: MouseEvent, h) => {
					e.stopPropagation();
					pinned = pinned === h ? null : h;
					if (pinned) spotlight(h);
					else reset();
				});

			const showTip = (d: GNode) => {
				const b = document.createElement("b");
				b.textContent = d.title ?? "";
				const sp = document.createElement("span");
				sp.textContent = d.note ?? "";
				tip!.replaceChildren(b, sp);
				tip!.hidden = false;
				tip!.style.left = `${Math.min((d.x ?? 0) + 20, width - 250)}px`;
				tip!.style.top = `${Math.max((d.y ?? 0) - 20, 10)}px`;
			};
			tiles.on("mouseenter", (_, d) => showTip(d))
				.on("click", (e: MouseEvent, d) => {
					e.stopPropagation();
					if (d.href) window.location.href = d.href;
					else showTip(d);
				})
				.on("mouseleave", () => { tip!.hidden = true; });

			hubs.call(drag<SVGGElement, GNode>()
				.on("start", (e, d) => { if (!e.active) s.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
				.on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
				.on("end", (e, d) => { if (!e.active) s.alphaTarget(0); d.fx = null; d.fy = null; }));

			const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
			const render = () => {
				nodes.forEach((n) => {
					// hubs keep room on the right for their label
					n.x = clamp(n.x ?? cx, 16, width - (n.kind === "hub" ? 140 : 16));
					n.y = clamp(n.y ?? cy, n.kind === "hub" ? 40 : 16, height - 16);
				});
				linkSel.attr("x1", (d) => src(d).x ?? 0).attr("y1", (d) => src(d).y ?? 0)
					.attr("x2", (d) => tgt(d).x ?? 0).attr("y2", (d) => tgt(d).y ?? 0);
				nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`);
			};
			s.on("tick", render);

			if (reduceMotion || folded) {
				s.stop();
				if (!folded) s.tick(300);
				render();
			}
			if (!reduceMotion) {
				drift = interval(() => {
					if (folded || busy) return;
					leaves.forEach((n) => {
						n.vx = (n.vx ?? 0) + (Math.random() - 0.5) * 0.8;
						n.vy = (n.vy ?? 0) + (Math.random() - 0.5) * 0.8;
					});
					s.alpha(Math.max(s.alpha(), 0.05)).restart();
				}, 3000);
			}

			// Unfold: hubs burst out one by one, each pulling its leaves after it
			function unfold() {
				busy = true;
				pinned = null;
				cue.transition().duration(300).attr("opacity", 0);
				pulse.transition().duration(300).attr("opacity", 0);
				coreDot.transition().duration(300).attr("r", 0);
				const step = reduceMotion ? 0 : 160;
				HUBS.forEach((h, i) => {
					later(() => {
						const hubAngle = nodes.find((n) => n.id === h.id)?.angle ?? 0;
						nodes.forEach((n) => {
							if (n.hub !== h.id) return;
							n.fx = null;
							n.fy = null;
							n.shown = true;
							const kick = n.kind === "hub" ? 26 : 10 + Math.random() * 10;
							const a = hubAngle + (n.kind === "hub" ? 0 : (Math.random() - 0.5) * 1.2);
							n.vx = Math.cos(a) * kick + (Math.random() - 0.5) * 6;
							n.vy = Math.sin(a) * kick + (Math.random() - 0.5) * 6;
						});
						const mine = (n: GNode) => n.hub === h.id;
						const t = reduceMotion ? 0 : 500;
						nodeSel.filter(mine).attr("pointer-events", null).transition().duration(t).attr("opacity", 1);
						hubs.filter(mine).attr("tabindex", 0);
						linkSel.filter((l) => linkShown(l)).transition().duration(t).attr("stroke-opacity", baseOp);
						if (reduceMotion) {
							s.tick(300);
							render();
						} else s.alpha(0.9).restart();
						if (i === HUBS.length - 1) later(() => { busy = false; }, t);
					}, i * step);
				});
			}

			// Fold: everything glides back into the sun
			function fold() {
				busy = true;
				pinned = null;
				tip!.hidden = true;
				const start = nodes.map((n) => [n.x ?? cx, n.y ?? cy]);
				const dur = reduceMotion ? 0 : 750;
				nodeSel.filter((n) => n.kind !== "center").attr("pointer-events", "none").transition().duration(dur).attr("opacity", 0);
				linkSel.transition().duration(dur * 0.6).attr("stroke-opacity", 0);
				hubs.attr("tabindex", -1);
				s.alphaTarget(0.3).restart();
				const finish = () => {
					nodes.forEach((n) => {
						if (n.kind !== "center") {
							n.shown = false;
							n.fx = cx;
							n.fy = cy;
						}
					});
					s.alphaTarget(0);
					s.stop();
					render();
					nextLine();
					writeCue();
					cue.transition().duration(300).attr("opacity", 1);
					pulse.transition().duration(300).attr("opacity", 1);
					coreDot.transition().duration(300).attr("r", 3);
					busy = false;
				};
				if (!dur) return finish();
				const t = timer((elapsed) => {
					const k = easeCubicIn(Math.min(1, elapsed / dur));
					nodes.forEach((n, i) => {
						if (n.kind === "center") return;
						n.fx = start[i][0] + (cx - start[i][0]) * k;
						n.fy = start[i][1] + (cy - start[i][1]) * k;
					});
					if (k >= 1) {
						t.stop();
						finish();
					}
				});
			}

			api = { unfold, fold };
		}

		const setFolded = (next: boolean) => {
			if (busy || !api || next === folded) return;
			folded = next;
			setFoldedState(next);
			if (!next) setHint(UNFOLDED_HINT);
			if (next) api.fold();
			else api.unfold();
		};
		setFoldedRef.current = setFolded;

		const onStageClick = (e: MouseEvent) => {
			if ((e.target as Element).closest("button")) return;
			if (folded) setFolded(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (folded && (e.key === "Enter" || e.key === " ")) {
				e.preventDefault();
				setFolded(false);
			}
		};
		let resizeT: ReturnType<typeof setTimeout> | undefined;
		const rebuild = () => {
			clearTimeout(resizeT);
			resizeT = setTimeout(() => { if (!busy) build(); }, 250);
		};
		const scheme = window.matchMedia("(prefers-color-scheme: dark)");

		stage.addEventListener("click", onStageClick);
		document.addEventListener("keydown", onKey);
		window.addEventListener("resize", rebuild);
		scheme.addEventListener("change", rebuild);
		build();

		return () => {
			stage.removeEventListener("click", onStageClick);
			document.removeEventListener("keydown", onKey);
			window.removeEventListener("resize", rebuild);
			scheme.removeEventListener("change", rebuild);
			clearTimeout(resizeT);
			timeouts.forEach(clearTimeout);
			sim?.stop();
			drift?.stop();
			select(svgEl).selectAll("*").interrupt().remove();
		};
	}, []);

	return (
		<main ref={stageRef} className={`${styles.stage} ${plexMono.variable} ${folded ? styles.folded : ""}`}>
			<svg
				ref={svgRef}
				className={styles.graph}
				role="img"
				aria-label="Constellation of what's coming to Merkado PH: culture, blog, events, festivals, pop-ups, community, embassy news, portfolio and construction"
			/>
			<div className={styles.hint}>
				<span className={styles.hintText} aria-live="polite">{hint}</span>
				<button
					className={styles.foldBtn}
					type="button"
					hidden={folded}
					onClick={(e) => {
						e.stopPropagation();
						setFoldedRef.current(true);
						e.currentTarget.blur();
					}}
				>
					Fold again
				</button>
			</div>
			<div className={styles.intro}>
				<p className={styles.eyebrow}>Coming soon · Gothenburg</p>
				<h1 className={styles.title}>Merkado PH</h1>
				<p className={styles.lede}>
					The store has a new home. This is what comes next: Filipino culture, festivals and pop-ups, and three years of stories from our community.
				</p>
			</div>
			<div ref={tipRef} className={styles.tip} hidden />
		</main>
	);
}
