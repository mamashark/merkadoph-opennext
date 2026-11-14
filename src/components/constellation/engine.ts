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
import type { ConstellationHub, ConstellationItem, ConstellationLine } from "./types";

/**
 * The D3 force graph behind <Constellation>. Loaded on demand (it pulls in d3), so pages only pay for
 * it when the graph scrolls into view. Colors come from CSS variables on the stage element.
 */

export type MountOptions = {
	stage: HTMLElement;
	svg: SVGSVGElement;
	tip: HTMLElement;
	hubs: ConstellationHub[];
	items: ConstellationItem[];
	lines: ConstellationLine[];
	/** Random faint threads between clusters (placeholder pages with no real links). */
	randomThreads?: boolean;
	onHint: (text: string) => void;
	onFolded: (folded: boolean) => void;
	navigate: (href: string) => void;
};

export const UNFOLDED_HINT = "Hover a category · drag to rearrange";

interface GNode extends SimulationNodeDatum {
	id: string;
	kind: "center" | "hub" | "leaf";
	shown: boolean;
	hub?: string;
	color?: string;
	label?: string;
	angle?: number;
	tx?: number;
	ty?: number;
	count?: number;
	len?: number;
	item?: ConstellationItem;
	tile?: boolean;
}
interface GLink extends SimulationLinkDatum<GNode> {
	kind: "core" | "spoke" | "cross";
	hub?: string;
}
const src = (l: GLink) => l.source as GNode;
const tgt = (l: GLink) => l.target as GNode;

export function mountConstellation(o: MountOptions) {
	const { stage, svg: svgEl, tip, hubs: HUBS, items: ITEMS, lines: LINES } = o;
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
		const { width, height } = svgEl.getBoundingClientRect();
		if (!width || !height) return;

		const css = getComputedStyle(stage);
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

		// Scatter hubs around the stage: uneven angles and uneven distances from the center
		const offset = Math.random() * Math.PI * 2;
		HUBS.forEach((h, i) => {
			const a = offset + (i / HUBS.length) * Math.PI * 2 + rand(-0.3, 0.3);
			const reach = rand(0.5, 0.95);
			const tx = cx + Math.cos(a) * width * 0.4 * reach;
			const ty = cy + Math.sin(a) * height * 0.4 * reach;
			const items = ITEMS.filter((it) => it.hub === h.id);
			const dots = h.dots ? Math.max(3, Math.round(h.dots * sizeScale)) : 0;
			const color = C(`--${h.color}`);
			nodes.push({
				id: `hub:${h.id}`, kind: "hub", hub: h.id, color, label: h.label,
				angle: Math.atan2(ty - cy, tx - cx), tx, ty, count: h.count ?? items.length + dots,
				...(folded ? hidden() : { x: tx, y: ty, shown: true }),
			});
			links.push({ source: "center", target: `hub:${h.id}`, kind: "core", hub: h.id });
			// Bigger clusters reach further, so they read as fuller stars
			const reachLen = (small ? 30 : 55) + Math.sqrt(items.length + dots) * (small ? 8 : 14);
			const addLeaf = (id: string, item?: ConstellationItem) => {
				nodes.push({
					id, kind: "leaf", hub: h.id, color, item, tile: !!item && item.shape !== "dot",
					len: reachLen * rand(0.45, 1.25),
					...(folded ? hidden() : { x: tx + rand(-3, 3), y: ty + rand(-3, 3), shown: true }),
				});
				links.push({ source: `hub:${h.id}`, target: id, kind: "spoke", hub: h.id });
			};
			items.forEach((it, j) => addLeaf(it.id ? `item:${it.id}` : `${h.id}-i${j}`, it));
			for (let j = 0; j < dots; j++) addLeaf(`${h.id}-d${j}`);
		});

		const byId = new Map(nodes.map((n) => [n.id, n]));
		const leaves = nodes.filter((n) => n.kind === "leaf");
		const hubNodes = nodes.filter((n) => n.kind === "hub");
		const pick = <T,>(arr: T[]) => arr[(Math.random() * arr.length) | 0];

		// Real threads: an item to the items it links to (e.g. a post to its tags)
		for (const n of leaves) {
			for (const target of n.item?.links ?? []) {
				const t = byId.get(`item:${target}`);
				if (t && t !== n) links.push({ source: n.id, target: t.id, kind: "cross" });
			}
		}
		// Placeholder threads between clusters
		if (o.randomThreads && leaves.length) {
			for (let i = 0; i < (small ? 14 : 40); i++) {
				const p = pick(leaves);
				const q = Math.random() < 0.45 ? pick(hubNodes) : pick(leaves);
				if (p.hub !== q.hub) links.push({ source: p.id, target: q.id, kind: "cross" });
			}
		}

		const s = forceSimulation<GNode, GLink>(nodes)
			.force("link", forceLink<GNode, GLink>(links).id((d) => d.id)
				.distance((l) => (l.kind === "spoke" ? (tgt(l).len ?? 0) : 0))
				.strength((l) => (l.kind === "spoke" ? 0.7 : 0)))
			.force("hubX", forceX<GNode>((d) => d.tx ?? cx).strength((d) => (d.kind === "hub" ? 0.18 : 0)))
			.force("hubY", forceY<GNode>((d) => d.ty ?? cy).strength((d) => (d.kind === "hub" ? 0.18 : 0)))
			.force("charge", forceManyBody<GNode>().strength((d) => (d.kind === "hub" ? -260 : d.tile ? -70 : d.item ? -45 : -34)))
			.force("collide", forceCollide<GNode>((d) => (d.tile ? 20 : d.kind === "hub" ? 26 : d.item ? 8 : 5)));
		sim = s;

		const svg = select(svgEl);
		svg.selectAll("*").remove();
		svg.attr("viewBox", `0 0 ${width} ${height}`);

		// Woven-mat (banig) patterns for tiles without an image
		const defs = svg.append("defs");
		HUBS.forEach((h) => {
			const p = defs.append("pattern").attr("id", `weave-${h.id}`).attr("width", 8).attr("height", 8)
				.attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)");
			p.append("rect").attr("width", 8).attr("height", 8).attr("fill", TILE_BG);
			p.append("rect").attr("width", 4).attr("height", 8).attr("fill", C(`--${h.color}`)).attr("opacity", 0.55);
			p.append("rect").attr("y", 4).attr("width", 8).attr("height", 2).attr("fill", C(`--${h.color}`)).attr("opacity", 0.3);
		});
		HUBS.forEach((h) => {
			defs.append("clipPath").attr("id", `clip-${h.id}`).append("rect").attr("x", -13).attr("y", -13).attr("width", 26).attr("height", 26);
		});

		const stars = svg.append("g").attr("aria-hidden", "true");
		for (let i = 0; i < 70; i++) {
			stars.append("circle").attr("cx", Math.random() * width).attr("cy", Math.random() * height)
				.attr("r", Math.random() * 0.9 + 0.3).attr("fill", STAR).attr("opacity", Math.random() * 0.5 + 0.1);
		}

		const root = svg.append("g");
		const baseOp = (d: GLink) => (d.kind === "cross" ? (o.randomThreads ? 0.13 : 0.2) : d.kind === "core" ? 0.28 : 0.55);
		const linkShown = (l: GLink) => src(l).shown && tgt(l).shown;
		const linkSel = root.append("g").attr("aria-hidden", "true").selectAll<SVGLineElement, GLink>("line").data(links).join("line")
			.attr("stroke", (d) => (d.kind === "cross" ? BLUE : tgt(d).color ?? BLUE))
			.attr("stroke-width", (d) => (d.kind === "core" ? 1.2 : 0.8))
			.attr("stroke-opacity", (d) => (linkShown(d) ? baseOp(d) : 0));

		const nodeSel = root.append("g").selectAll<SVGGElement, GNode>("g").data(nodes).join("g")
			.attr("class", (d) => (d.kind === "hub" ? "hub" : d.item ? "tile" : null))
			.attr("opacity", (d) => (d.shown ? 1 : 0))
			.attr("pointer-events", (d) => (d.shown ? null : "none"))
			.attr("aria-hidden", (d) => (d.shown && d.kind !== "center" ? null : "true"));

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
			const [quote, action] = LINES[lineIdx] ?? ["", ""];
			cueQuote.text(quote);
			cueAction.text(action.toUpperCase());
			o.onHint(quote);
		};
		if (folded) writeCue();

		// Leaves: a link wrapper when the item has an href, so tiles are real, focusable links
		const leafSel = nodeSel.filter((d) => d.kind === "leaf");
		const linked = leafSel.filter((d) => !!d.item?.href).append("a")
			.attr("href", (d) => d.item!.href!)
			.attr("aria-label", (d) => [d.item!.title, d.item!.note].filter(Boolean).join(", "))
			.attr("tabindex", (d) => (d.shown ? null : -1));
		const leafBody = (d: GNode, el: SVGGElement) => {
			const a = el.querySelector("a");
			return select<SVGElement, GNode>((a ?? el) as SVGElement).datum(d);
		};
		leafSel.each(function (d) {
			const body = leafBody(d, this);
			if (!d.item) {
				body.append("circle").attr("r", 2.4).attr("fill", d.color ?? BLUE);
			} else if (!d.tile) {
				body.append("circle").attr("r", 9).attr("fill", "transparent");
				body.append("circle").attr("r", 3.4).attr("fill", d.color ?? BLUE);
				body.append("circle").attr("r", 6).attr("fill", "none").attr("stroke", d.color ?? BLUE).attr("stroke-opacity", 0.45);
			} else {
				body.append("rect").attr("x", -14).attr("y", -14).attr("width", 28).attr("height", 28)
					.attr("fill", d.item.image ? TILE_BG : `url(#weave-${d.hub})`)
					.attr("stroke", INK).attr("stroke-opacity", 0.7).attr("stroke-width", 1);
				if (d.item.image) {
					body.append("image").attr("href", d.item.image).attr("x", -13).attr("y", -13).attr("width", 26).attr("height", 26)
						.attr("preserveAspectRatio", "xMidYMid slice").attr("clip-path", `url(#clip-${d.hub})`);
				}
			}
		});

		const hubs = nodeSel.filter((d) => d.kind === "hub").attr("tabindex", (d) => (d.shown ? 0 : -1))
			.attr("role", "button").attr("aria-label", (d) => `${d.label}: ${d.count}`);
		hubs.append("rect").attr("x", -5).attr("y", -5).attr("width", 10).attr("height", 10).attr("fill", (d) => d.color ?? BLUE);
		const label = hubs.append("text").attr("x", 13).attr("y", -9).attr("fill", INK).attr("font-size", small ? 12 : 14);
		label.append("tspan").text((d) => d.label ?? "");
		label.append("tspan").attr("dx", 5).attr("dy", -6).attr("font-size", small ? 9 : 10).attr("fill", MUTED).text((d) => d.count ?? "");

		let pinned: GNode | null = null;
		const spotlight = (h: GNode) => {
			// The hub's own spokes, plus threads from its items to other clusters (and what they reach)
			const lit = new Set<GNode>([h]);
			links.forEach((l) => {
				if (l.hub === h.hub) lit.add(tgt(l));
			});
			const crossLit = (l: GLink) => l.kind === "cross" && (lit.has(src(l)) || lit.has(tgt(l)));
			const reached = new Set<GNode>();
			links.forEach((l) => {
				if (crossLit(l)) reached.add(src(l)).add(tgt(l));
			});
			linkSel.attr("stroke-opacity", (l) => (!linkShown(l) ? 0 : l.hub === h.hub ? 0.95 : crossLit(l) ? 0.6 : 0.04));
			nodeSel.attr("opacity", (n) => (!n.shown ? 0 : n.kind === "center" || lit.has(n) ? 1 : reached.has(n) ? 0.75 : 0.15));
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
			})
			.on("keydown", (e: KeyboardEvent, h) => {
				if (e.key !== "Enter" && e.key !== " ") return;
				e.preventDefault();
				pinned = pinned === h ? null : h;
				if (pinned) spotlight(h);
				else reset();
			});

		const showTip = (d: GNode) => {
			const it = d.item;
			if (!it) return;
			const b = document.createElement("b");
			b.textContent = it.title;
			const parts: HTMLElement[] = [b];
			if (it.note) {
				const sp = document.createElement("span");
				sp.textContent = it.note;
				parts.push(sp);
			}
			if (it.tags?.length) {
				const t = document.createElement("span");
				t.className = "tags";
				t.textContent = it.tags.slice(0, 4).map((x) => `#${x}`).join(" ");
				parts.push(t);
			}
			tip.replaceChildren(...parts);
			tip.hidden = false;
			const x = d.x ?? 0, y = d.y ?? 0;
			tip.style.left = `${Math.max(8, Math.min(x + 20, width - 250))}px`;
			tip.style.top = `${y > height - 110 ? Math.max(8, y - 90) : Math.max(y - 20, 8)}px`;
		};
		const hideTip = () => { tip.hidden = true; };
		leafSel.filter((d) => !!d.item)
			.on("mouseenter", (_, d) => showTip(d))
			.on("mouseleave", hideTip)
			.on("click", (e: MouseEvent, d) => {
				e.stopPropagation();
				if (!d.item?.href) return showTip(d);
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
				e.preventDefault();
				o.navigate(d.item.href);
			});
		linked.on("focus", (_, d) => showTip(d)).on("blur", hideTip);

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

		const setReachable = (sel: typeof nodeSel, on: boolean) => {
			sel.attr("aria-hidden", (n) => (on && n.kind !== "center" ? null : "true"));
			sel.filter((n) => n.kind === "hub").attr("tabindex", on ? 0 : -1);
			sel.selectAll("a").attr("tabindex", on ? null : -1);
		};

		// Unfold: hubs burst out one by one, each pulling its leaves after it
		function unfold() {
			busy = true;
			pinned = null;
			cue.transition().duration(300).attr("opacity", 0);
			pulse.transition().duration(300).attr("opacity", 0);
			coreDot.transition().duration(300).attr("r", 0);
			const step = reduceMotion ? 0 : 160;
			if (!HUBS.length) busy = false;
			HUBS.forEach((h, i) => {
				later(() => {
					const hubAngle = byId.get(`hub:${h.id}`)?.angle ?? 0;
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
					const sel = nodeSel.filter(mine);
					sel.attr("pointer-events", null).transition().duration(t).attr("opacity", 1);
					setReachable(sel, true);
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
			hideTip();
			const start = nodes.map((n) => [n.x ?? cx, n.y ?? cy]);
			const dur = reduceMotion ? 0 : 750;
			const others = nodeSel.filter((n) => n.kind !== "center");
			others.attr("pointer-events", "none").transition().duration(dur).attr("opacity", 0);
			setReachable(others, false);
			linkSel.transition().duration(dur * 0.6).attr("stroke-opacity", 0);
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
		o.onFolded(next);
		if (!next) o.onHint(UNFOLDED_HINT);
		if (next) api.fold();
		else api.unfold();
	};

	const onStageClick = (e: MouseEvent) => {
		if ((e.target as Element).closest("button, a")) return;
		if (folded) setFolded(false);
	};
	let resizeT: ReturnType<typeof setTimeout> | undefined;
	let lastWidth = svgEl.getBoundingClientRect().width;
	const rebuild = () => {
		clearTimeout(resizeT);
		resizeT = setTimeout(() => {
			if (busy) return;
			lastWidth = svgEl.getBoundingClientRect().width;
			build();
		}, 250);
	};
	// Mobile browsers fire resize when the address bar hides; only rebuild when the width changes.
	const onResize = () => {
		if (Math.abs(svgEl.getBoundingClientRect().width - lastWidth) > 1) rebuild();
	};
	const scheme = window.matchMedia("(prefers-color-scheme: dark)");

	stage.addEventListener("click", onStageClick);
	window.addEventListener("resize", onResize);
	scheme.addEventListener("change", rebuild);
	build();

	return {
		setFolded,
		destroy() {
			stage.removeEventListener("click", onStageClick);
			window.removeEventListener("resize", onResize);
			scheme.removeEventListener("change", rebuild);
			clearTimeout(resizeT);
			timeouts.forEach(clearTimeout);
			sim?.stop();
			drift?.stop();
			select(svgEl).selectAll("*").interrupt().remove();
		},
	};
}
