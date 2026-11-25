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
// Adds selection.transition(). d3 7.9.2+ marks itself side-effect free, so without this direct import the
// bundler can drop d3-transition and every .transition() call fails (Arvid review, 2026-11-25).
import "d3-transition";
import { PHONE_QUERY, type ConstellationHub, type ConstellationItem, type ConstellationLine } from "./types";

/**
 * The D3 force graph behind <Constellation>. Loaded on demand (it pulls in d3), so pages only pay for
 * it when the graph scrolls into view. Colors come from CSS variables on the stage element.
 */

export type MountOptions = {
	stage: HTMLElement;
	svg: SVGSVGElement;
	/**
	 * Optional background layer for the stars, behind `svg`. Stars are split over one <g data-depth> per depth,
	 * so the page's camera can move each layer by a different amount (parallax). Without it, stars go in `svg`.
	 */
	sky?: { svg: SVGSVGElement; depths: readonly number[] };
	tip: HTMLElement;
	hubs: ConstellationHub[];
	items: ConstellationItem[];
	lines: ConstellationLine[];
	/** Random faint threads between clusters (placeholder pages with no real links). */
	randomThreads?: boolean;
	onHint: (text: string) => void;
	onFolded: (folded: boolean) => void;
	navigate: (href: string) => void;
	/* Opt-in hooks (the homepage uses them; the coming-soon page does not, so it keeps its behaviour). */
	/** Hint shown once the graph is open. */
	unfoldedHint?: string;
	/** Click / Enter on a category. When set, it replaces "pin the spotlight". */
	onHubActivate?: (hubId: string) => void;
	/** Pointer or focus enters (id + element) or leaves (null) a category. */
	onHubHover?: (hubId: string | null, el: SVGGElement | null) => void;
	/** Click on an item. Return true when handled, so the item's link is not followed. */
	onItemActivate?: (item: ConstellationItem) => boolean;
	/** A top-right box (px) that nodes stay out of, e.g. under the Open/Fold button, so nothing sits where it can't be tapped. */
	keepClear?: { width: number; height: number };
	/** A box in the graph's own px (e.g. the hero title) that categories, labels and tiles stay out of. Read on every
	 *  (re)build; null = none. */
	avoid?: () => { left: number; top: number; right: number; bottom: number } | null;
};

export type ConstellationEngine = {
	setFolded: (next: boolean) => void;
	/** Where a category sits in the graph (SVG px, same as the stage box), if shown. */
	hubPoint: (hubId: string) => { x: number; y: number } | null;
	/** The category element, e.g. to give focus back after leaving a section. */
	hubElement: (hubId: string) => SVGGElement | null;
	/** Clears any spotlight. */
	reset: () => void;
	destroy: () => void;
};

export const UNFOLDED_HINT = "Hover a category · drag to rearrange";

/* Category labels on wider screens (name, then a smaller raised count, above-right of the square). One set of numbers
   for both drawing them and estimating their box, so a font-size change (B15) can't silently break the overlap checks. */
/** Label and count font sizes (px): `small` stages, otherwise `wide`. */
const LABEL_PX = { small: 12, wide: 14 } as const;
const COUNT_PX = { small: 9, wide: 10 } as const;
/** IBM Plex Mono: every character is 0.6 em wide; ascent and descent (em) give the box's height. */
const MONO_EM = 0.6;
const MONO_ASCENT = 1.025, MONO_DESCENT = 0.275;
/** The label starts this far right of the square's centre, with its baseline this far above it. */
const LABEL_X = 13, LABEL_Y = -9;
/** Gap between the name and the count, and how far the count is raised. */
const LABEL_DX = 5, COUNT_DY = -6;

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
	/** Phone layout: the label's lines (under the marker) and its half width, for keeping it inside the panel. */
	lines?: string[];
	halfW?: number;
	/** Wider screens: how far right of its square a category reaches (label + count), to keep it on screen and out of keepClear. */
	reach?: number;
}
interface GLink extends SimulationLinkDatum<GNode> {
	kind: "core" | "spoke" | "cross";
	hub?: string;
}
const src = (l: GLink) => l.source as GNode;
const tgt = (l: GLink) => l.target as GNode;

export function mountConstellation(o: MountOptions): ConstellationEngine {
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
	/** Off screen or in a background tab: the drift and the pulse stop (saves battery). */
	let asleep = false;
	let onScreen = true;
	let sim: Simulation<GNode, GLink> | undefined;
	let drift: Timer | undefined;
	let api:
		| { unfold: () => void; fold: () => void; reset: () => void; hubPoint: (id: string) => { x: number; y: number } | null; hubElement: (id: string) => SVGGElement | null }
		| undefined;
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
		const AVOID = o.avoid?.() ?? null;
		const INK = C("--ink"), BLUE = C("--blue"), SUN = C("--sun"), MUTED = C("--muted");
		const TILE_BG = C("--tile-bg"), STAR = C("--star"), FONT_DISPLAY = C("--font-display");

		// Phones held upright: a fixed layout inside a framed panel (see PHONE_QUERY).
		const phone = window.matchMedia(PHONE_QUERY).matches;
		const small = width < 560 || phone;
		/** Inner clearance of the phone panel: nothing (marker, label, tile) comes closer to its edge. */
		const PAD = 16;
		// Phone rows: two Highlights per row, the right one a little lower (staggered); an odd last one is centred.
		// Rows fill the panel: the first marker leaves room for its photos above, the last for its label below.
		const bands = Math.ceil(HUBS.length / 2);
		const ROW_TOP = 78, ROW_BOTTOM = 112, STAGGER = 0.36;
		const bandH = (height - ROW_TOP - ROW_BOTTOM) / Math.max(bands - 1, 1);
		const phoneSpot = (i: number) => {
			const row = Math.floor(i / 2), right = i % 2 === 1, alone = i === HUBS.length - 1 && HUBS.length % 2 === 1;
			return { x: width * (alone ? 0.5 : right ? 0.73 : 0.27), y: ROW_TOP + row * bandH + (right ? bandH * STAGGER : 0) };
		};
		// Short screens (phones held sideways) lift the sun so its prompt clears the title at the bottom.
		// On a phone the sun sits between the middle rows, clear of every Highlight.
		const cx = width / 2,
			// Phone: halfway between the right marker of the row above the middle and the left marker below it.
			cy = phone ? ROW_TOP + (Math.max(Math.floor(bands / 2), 1) - 1) * bandH + bandH * ((1 + STAGGER) / 2) : height * (small ? 0.42 : height < 440 ? 0.36 : 0.48);
		/** Phone labels: long names on two lines, split at the space nearest the middle. */
		const splitLabel = (s: string) => {
			if (s.length <= 13 || !s.includes(" ")) return [s];
			const spaces = [...s.matchAll(/ /g)].map((m) => m.index!);
			const at = spaces.reduce((b, i) => (Math.abs(i - s.length / 2) < Math.abs(b - s.length / 2) ? i : b), spaces[0]);
			return [s.slice(0, at), s.slice(at + 1)];
		};
		const rand = (a: number, b: number) => a + Math.random() * (b - a);
		const sizeScale = small ? 0.4 : 1;
		const labelPx = small ? LABEL_PX.small : LABEL_PX.wide, countPx = small ? COUNT_PX.small : COUNT_PX.wide;
		/** A category label's box, relative to its square's centre: from the top of the raised count to the name's descent. */
		const LBL_TOP = Math.min(LABEL_Y - labelPx * MONO_ASCENT, LABEL_Y + COUNT_DY - countPx * MONO_ASCENT);
		const LBL_BOTTOM = LABEL_Y + labelPx * MONO_DESCENT;

		const nodes: GNode[] = [{ id: "center", kind: "center", fx: cx, fy: cy, x: cx, y: cy, shown: true }];
		const links: GLink[] = [];
		const hidden = () => ({ x: cx, y: cy, fx: cx, fy: cy, shown: false });

		// Scatter hubs around the stage: uneven angles and uneven distances from the center
		const offset = Math.random() * Math.PI * 2;
		HUBS.forEach((h, i) => {
			const a = offset + (i / HUBS.length) * Math.PI * 2 + rand(-0.3, 0.3);
			const reach = rand(0.5, 0.95);
			// Phone: label lines + count, measured in IBM Plex Mono (0.6 em per character at 12px).
			const lines = phone ? splitLabel(h.label) : undefined;
			const halfW = lines ? (Math.max(...lines.map((l, k) => l.length + (k === lines.length - 1 ? 3 : 0))) * 7.3) / 2 : undefined;
			const spot = phone ? phoneSpot(i) : null;
			const tx = spot ? Math.min(Math.max(spot.x, PAD + Math.max(halfW!, 48)), width - PAD - Math.max(halfW!, 48)) : cx + Math.cos(a) * width * 0.4 * reach;
			const ty = spot ? spot.y : cy + Math.sin(a) * height * 0.4 * reach;
			const items = ITEMS.filter((it) => it.hub === h.id);
			const dots = h.dots ? Math.max(3, Math.round(h.dots * sizeScale)) : 0;
			const color = C(`--${h.color}`);
			const shownCount = h.count ?? items.length + dots;
			// Label start + name + gap + count, in IBM Plex Mono (the same numbers draw the label below).
			const labelReach = LABEL_X + h.label.length * MONO_EM * labelPx + LABEL_DX + String(shownCount).length * MONO_EM * countPx;
			nodes.push({
				id: `hub:${h.id}`, kind: "hub", hub: h.id, color, label: h.label, lines, halfW, reach: phone ? undefined : labelReach,
				angle: Math.atan2(ty - cy, tx - cx), tx, ty, count: shownCount,
				...(folded ? hidden() : { x: tx, y: ty, shown: true }),
			});
			links.push({ source: "center", target: `hub:${h.id}`, kind: "core", hub: h.id });
			// Bigger clusters reach further, so they read as fuller stars
			const reachLen = (small ? 30 : 55) + Math.sqrt(items.length + dots) * (small ? 8 : 14);
			// Phone: at most two photo tiles per Highlight (the rest are dots, still links), and every leaf gets a
			// spot on an arc above and beside its marker, so nothing lands on the label underneath.
			const PHONE_TILES = 2;
			let tiles = 0;
			const count = items.length + dots;
			// The half circle above the marker (from left to right, over the top): the label below stays clear.
			const arc = Array.from({ length: count }, (_, k) => {
				const from = Math.PI + 0.12, span = Math.PI - 0.24;
				return from + (count > 1 ? (k / (count - 1)) * span : span / 2);
			}).sort((p, q) => Math.abs(p - Math.PI * 1.5) - Math.abs(q - Math.PI * 1.5));
			let slot = 0;
			const addLeaf = (id: string, item?: ConstellationItem) => {
				const wantsTile = !!item && item.shape !== "dot" && (!phone || (!!item.image && tiles < PHONE_TILES));
				if (wantsTile && phone) tiles++;
				// Tiles take the spots nearest the top of the arc; dots fill the sides.
				const a2 = phone ? arc[slot++] : 0;
				const r = phone ? (wantsTile ? 52 : 34 + (slot % 3) * 7) : 0;
				nodes.push({
					id, kind: "leaf", hub: h.id, color, item, tile: wantsTile,
					len: phone ? r : reachLen * rand(0.45, 1.25),
					...(phone ? { tx: tx + Math.cos(a2) * r, ty: ty + Math.sin(a2) * r } : {}),
					...(folded ? hidden() : { x: tx + rand(-3, 3), y: ty + rand(-3, 3), shown: true }),
				});
				links.push({ source: `hub:${h.id}`, target: id, kind: "spoke", hub: h.id });
			};
			// Items with a photo first, so the two phone tiles are photos.
			[...items].sort((p, q) => Number(!!q.image) - Number(!!p.image)).forEach((it) => addLeaf(it.id ? `item:${it.id}` : `${h.id}-i${items.indexOf(it)}`, it));
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
			// Phone: Highlights hold their row spots and leaves hold their arc spots (a fixed, readable layout).
			.force("hubX", forceX<GNode>((d) => d.tx ?? cx).strength((d) => (d.kind === "hub" ? (phone ? 0.5 : 0.18) : phone && d.kind === "leaf" ? 0.3 : 0)))
			.force("hubY", forceY<GNode>((d) => d.ty ?? cy).strength((d) => (d.kind === "hub" ? (phone ? 0.5 : 0.18) : phone && d.kind === "leaf" ? 0.3 : 0)))
			.force("charge", forceManyBody<GNode>().strength((d) => (phone ? (d.kind === "hub" ? -40 : -8) : d.kind === "hub" ? -260 : d.tile ? -70 : d.item ? -45 : -34)))
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

		const layers = o.sky?.depths.length ? o.sky.depths : [1];
		const skySvg = o.sky ? select(o.sky.svg) : null;
		skySvg?.selectAll("*").remove();
		skySvg?.attr("viewBox", `0 0 ${width} ${height}`);
		layers.forEach((depth, li) => {
			const g = (skySvg ?? svg).append("g").attr("aria-hidden", "true");
			if (skySvg) g.attr("data-depth", depth);
			// Further layers: smaller, fainter stars.
			const near = layers.length > 1 ? 1 - li / (layers.length - 1) : 1;
			for (let i = 0; i < Math.round(70 / layers.length); i++) {
				g.append("circle").attr("cx", Math.random() * width).attr("cy", Math.random() * height)
					.attr("r", (Math.random() * 0.9 + 0.3) * (0.7 + 0.3 * near)).attr("fill", STAR).attr("opacity", (Math.random() * 0.5 + 0.1) * (0.6 + 0.4 * near));
			}
		});

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
		// Click target while folded: the sun and its cue text below it. Only a click here opens the sky (Kay, 2026-11-24).
		center.append("circle").attr("class", "sun-hit").attr("r", 34).attr("fill", "transparent");
		center.append("rect").attr("class", "sun-hit").attr("x", -170).attr("y", 30).attr("width", 340).attr("height", 52).attr("fill", "transparent");
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
			.attr("role", "button")
			.attr("aria-label", (d) => {
				const desc = HUBS.find((h) => h.id === d.hub)?.description;
				return o.onHubActivate ? `${d.label} (${d.count})${desc ? `: ${desc}` : ""}. Zoom in` : `${d.label}: ${d.count}`;
			});
		// An invisible 44px tap target around the 10px square (touch, B5).
		hubs.append("circle").attr("r", 22).attr("fill", "transparent");
		if (phone) {
			// Phone: marker and label are one target; the label sits under the marker, centred.
			hubs.append("rect").attr("class", "hit").attr("x", (d) => -(d.halfW ?? 40) - 6).attr("y", 6).attr("width", (d) => 2 * (d.halfW ?? 40) + 12)
				.attr("height", (d) => (d.lines?.length ?? 1) * 15 + 14).attr("fill", "transparent");
		}
		hubs.append("rect").attr("x", -5).attr("y", -5).attr("width", 10).attr("height", 10).attr("fill", (d) => d.color ?? BLUE);
		// Labels live in their own layer above every node (below), so photo tiles and lines never cover them. It's
		// aria-hidden: each hub already carries its name in aria-label, and DOM order (= tab order) stays hub → its tiles.
		const labelLayer = root.append("g").attr("aria-hidden", "true").attr("pointer-events", "none");
		const labelSel = labelLayer.selectAll<SVGGElement, GNode>("g").data(nodes.filter((d) => d.kind === "hub")).join("g")
			// data-hub pairs each label with its category (tests/e2e/constellation.spec.ts reads it).
			.attr("data-hub", (d) => d.hub ?? null)
			.attr("opacity", (d) => (d.shown ? 1 : 0));
		const labelsOf = (sel: typeof nodeSel) => {
			const ids = new Set(sel.data().map((d) => d.id));
			return labelSel.filter((d) => ids.has(d.id));
		};
		if (phone) {
			const label = labelSel.append("text").attr("class", "lbl").attr("text-anchor", "middle").attr("fill", INK).attr("font-size", 12);
			label.each(function (d) {
				const t = select(this);
				(d.lines ?? [d.label ?? ""]).forEach((line, k, all) => {
					const ts = t.append("tspan").attr("x", 0).attr("y", 24 + k * 15).text(line);
					if (k === all.length - 1 && d.count) ts.append("tspan").attr("dx", 4).attr("font-size", 9).attr("fill", MUTED).attr("baseline-shift", "super").text(d.count);
				});
			});
		} else {
			// The label's area stays part of the hub's target (hover, click), as when the text sat inside it.
			hubs.append("rect").attr("class", "hit").attr("x", LABEL_X - 3).attr("y", LBL_TOP - 3)
				.attr("width", (d) => (d.reach ?? LABEL_X) - LABEL_X + 6).attr("height", LBL_BOTTOM - LBL_TOP + 6).attr("fill", "transparent");
			const label = labelSel.append("text").attr("class", "lbl").attr("x", LABEL_X).attr("y", LABEL_Y).attr("fill", INK).attr("font-size", labelPx);
			label.append("tspan").text((d) => d.label ?? "");
			label.append("tspan").attr("dx", LABEL_DX).attr("dy", COUNT_DY).attr("font-size", countPx).attr("fill", MUTED).text((d) => d.count ?? "");
		}

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
			const spot = (n: GNode) => (!n.shown ? 0 : n.kind === "center" || lit.has(n) ? 1 : reached.has(n) ? 0.75 : 0.15);
			nodeSel.attr("opacity", spot);
			labelSel.attr("opacity", spot);
			hubs.attr("data-hot", (n) => (n === h ? "" : null));
		};
		const reset = () => {
			linkSel.attr("stroke-opacity", (l) => (linkShown(l) ? baseOp(l) : 0));
			nodeSel.attr("opacity", (n) => (n.shown ? 1 : 0));
			labelSel.attr("opacity", (n) => (n.shown ? 1 : 0));
			hubs.attr("data-hot", null);
		};
		let dragging = false;
		hubs.on("mouseenter focus", (e: Event, h) => {
			if (busy || dragging) return;
			spotlight(h);
			o.onHubHover?.(h.hub!, e.currentTarget as SVGGElement);
		})
			.on("mouseleave blur", () => {
				if (busy || dragging) return;
				if (pinned) spotlight(pinned);
				else reset();
				o.onHubHover?.(null, null);
			})
			.on("click", (e: MouseEvent, h) => {
				e.stopPropagation();
				if (o.onHubActivate) return o.onHubActivate(h.hub!);
				pinned = pinned === h ? null : h;
				if (pinned) spotlight(h);
				else reset();
			})
			.on("keydown", (e: KeyboardEvent, h) => {
				if (e.key !== "Enter" && e.key !== " ") return;
				e.preventDefault();
				if (o.onHubActivate) return o.onHubActivate(h.hub!);
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
				if (d.item && o.onItemActivate?.(d.item)) {
					e.preventDefault();
					return hideTip();
				}
				if (!d.item?.href) return showTip(d);
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
				e.preventDefault();
				o.navigate(d.item.href);
			});
		linked.on("focus", (_, d) => showTip(d)).on("blur", hideTip);

		// Dragging a Highlight is a mouse thing: on touch screens it would stop a swipe from scrolling the page.
		if (!phone && !window.matchMedia("(pointer: coarse)").matches) hubs.call(drag<SVGGElement, GNode>()
			.on("start", (e, d) => { dragging = true; o.onHubHover?.(null, null); if (!e.active) s.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
			.on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
			.on("end", (e, d) => { dragging = false; if (!e.active) s.alphaTarget(0); d.fx = null; d.fy = null; }));

		const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
		/** How far right of its centre a node reaches: a category's whole label (estimated from its length, so long names
		 *  like "Merkado Byggnadsavdelning" count in full), or a leaf's tile. */
		const reachRight = (n: GNode) => (n.kind === "hub" ? Math.max(n.reach ?? 0, 22) + 8 : 16);
		/** Where node n may sit (wider screens), given a wanted spot: on screen with room on the right for its whole
		 *  label, and, for anything near the top right, below the Open/Fold box (B5: a long label ran under "Fold again";
		 *  a category's label sits above-right of its square, so it needs more room there). */
		const place = (n: GNode, x: number, y: number) => {
			const px = clamp(x, 16, width - reachRight(n));
			let py = clamp(y, n.kind === "hub" ? 40 : 16, height - 16);
			const k = o.keepClear, below = k ? k.height + (n.kind === "hub" ? Math.ceil(-LBL_TOP) + 2 : 16) : 0;
			if (k && n.kind !== "center" && px + reachRight(n) > width - k.width && py < below) py = below;
			// Out of the title (AVOID): its square, label or tile may not overlap it. Move up or right, whichever is
			// the shorter way, as long as that stays on screen.
			if (AVOID && n.kind !== "center") {
				// Extents around the node's centre: below, left and above (a category: its 22px square and the label over it).
				const M = 12, up = n.kind === "hub" ? Math.max(11, LBL_BOTTOM) : 16, left = n.kind === "hub" ? 11 : 16, top = n.kind === "hub" ? Math.max(11, -LBL_TOP) : 16;
				if (px + reachRight(n) > AVOID.left - M && px - left < AVOID.right + M && py + up > AVOID.top - M && py - top < AVOID.bottom + M) {
					const toTop = AVOID.top - M - up, toRight = AVOID.right + M + left;
					const canRight = toRight + reachRight(n) <= width - 16;
					if (canRight && toRight - px < py - toTop) return { x: toRight, y: py };
					return { x: px, y: Math.max(toTop, n.kind === "hub" ? 40 : 16) };
				}
			}
			return { x: px, y: py };
		};

		/* Categories must not get in each other's way (B5, B18): no label over another category's square, no label on
		   another label, no square inside another category's 44px tap circle. Boxes: l, t, r, b (SVG px). */
		type Box = readonly [number, number, number, number];
		const overlaps = (p: Box, q: Box, gap = 0) => p[0] < q[2] + gap && q[0] < p[2] + gap && p[1] < q[3] + gap && q[1] < p[3] + gap;
		/** The square plus a little margin (a finger is not a point). */
		const sqBox = (x: number, y: number): Box => [x - 11, y - 11, x + 11, y + 11];
		const lblBox = (n: GNode, x: number, y: number): Box => [x + LABEL_X, y + LBL_TOP, x + (n.reach ?? 0), y + LBL_BOTTOM];
		/** How badly category n at (x, y) and category m (where it is now) get in each other's way:
		 *  a square under a label or too close to the other square (10), label on label (3), a label's middle in the other's tap circle (1). */
		const clash = (n: GNode, x: number, y: number, m: GNode) => {
			const mx = m.x ?? cx, my = m.y ?? cy;
			const nL = lblBox(n, x, y), mL = lblBox(m, mx, my);
			let s = 0;
			if (overlaps(sqBox(x, y), mL) || overlaps(nL, sqBox(mx, my)) || Math.hypot(x - mx, y - my) < 24) s += 10;
			if (overlaps(nL, mL, 2)) s += 3;
			if (Math.hypot((nL[0] + nL[2]) / 2 - mx, (nL[1] + nL[3]) / 2 - my) < 22 || Math.hypot((mL[0] + mL[2]) / 2 - x, (mL[1] + mL[3]) / 2 - y) < 22) s += 1;
			return s;
		};
		const clashAll = (n: GNode, x: number, y: number) => hubNodes.reduce((s, m) => (m === n || !m.shown ? s : s + clash(n, x, y, m)), 0);
		/** How far below another category the next one sits so the two labels stack with a gap (and the squares are 26px+ apart). */
		const STACK = Math.max(26, Math.ceil(LBL_BOTTOM - LBL_TOP) + 6);
		/** Moves categories that clash to the first free spot next to the one they clash with most: below its label,
		 *  above it, then to its right or left. Every spot is checked as `place` would leave it, against every category.
		 *  Repeats (at most 3 times) until nothing moves, so a later move can't undo an earlier one. Dragged ones stay put. */
		const unclash = () => {
			for (let pass = 0; pass < 3; pass++) {
				let moved = false;
				for (const b of hubNodes) {
					if (!b.shown || b.fx != null) continue;
					const bx = b.x ?? cx, by = b.y ?? cy;
					let best = clashAll(b, bx, by);
					if (!best) continue;
					let a: GNode | undefined, worst = 0;
					for (const m of hubNodes) {
						const s = m === b || !m.shown ? 0 : clash(b, bx, by, m);
						if (s > worst) [a, worst] = [m, s];
					}
					if (!a) continue;
					const ax = a.x ?? cx, ay = a.y ?? cy;
					const spots = [
						[bx, ay + STACK], // below: its label under the other label
						[bx, ay + LBL_TOP - 13], // above: its square over the other label
						[ax + (a.reach ?? 0) + 13, by], // right of the other label
						[ax - 13 - (b.reach ?? 0), by], // left of the other square
						// Crowded (a third category is in the way of all four): small steps up or down from where it is.
						...[12, -12, 24, -24, 36, -36, 48, -48].map((d) => [bx, by + d]),
					];
					let pick: { x: number; y: number } | undefined;
					for (const [x, y] of spots) {
						const p = place(b, x, y), s = clashAll(b, p.x, p.y);
						if (s < best) [best, pick] = [s, p];
						if (!s) break;
					}
					if (!pick) continue;
					b.x = pick.x;
					b.y = pick.y;
					moved = true;
				}
				if (!moved) break;
			}
		};

		const render = () => {
			nodes.forEach((n) => {
				if (phone) {
					// Phone: everything (marker, label under it, tile) stays inside the panel's inner clearance.
					const r = n.kind === "hub" ? Math.max(n.halfW ?? 0, 22) : n.tile ? 15 : 6;
					n.x = clamp(n.x ?? cx, PAD + r, width - PAD - r);
					n.y = clamp(n.y ?? cy, PAD + (n.kind === "hub" ? 22 : r), height - PAD - (n.kind === "hub" ? 24 + (n.lines?.length ?? 1) * 15 : r));
					return;
				}
				const p = place(n, n.x ?? cx, n.y ?? cy);
				n.x = p.x;
				n.y = p.y;
			});
			if (!phone) unclash();
			linkSel.attr("x1", (d) => src(d).x ?? 0).attr("y1", (d) => src(d).y ?? 0)
				.attr("x2", (d) => tgt(d).x ?? 0).attr("y2", (d) => tgt(d).y ?? 0);
			nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`);
			labelSel.attr("transform", (d) => `translate(${d.x},${d.y})`);
		};
		s.on("tick", render);

		if (reduceMotion || folded) {
			s.stop();
			if (!folded) s.tick(300);
			render();
		}
		if (!reduceMotion) {
			drift = interval(() => {
				if (folded || busy || asleep) return;
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
					labelsOf(sel).transition().duration(t).attr("opacity", 1);
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
			o.onHubHover?.(null, null);
			const start = nodes.map((n) => [n.x ?? cx, n.y ?? cy]);
			const dur = reduceMotion ? 0 : 750;
			const others = nodeSel.filter((n) => n.kind !== "center");
			others.attr("pointer-events", "none").transition().duration(dur).attr("opacity", 0);
			labelSel.transition().duration(dur).attr("opacity", 0);
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

		api = {
			unfold,
			fold,
			reset: () => {
				pinned = null;
				reset();
			},
			hubPoint: (id) => {
				const n = byId.get(`hub:${id}`);
				return n?.shown ? { x: n.x ?? cx, y: n.y ?? cy } : null;
			},
			hubElement: (id) => hubs.filter((d) => d.hub === id).node(),
		};
	}

	const setFolded = (next: boolean) => {
		if (busy || !api || next === folded) return;
		folded = next;
		o.onFolded(next);
		if (!next) o.onHint(o.unfoldedHint ?? UNFOLDED_HINT);
		if (next) api.fold();
		else api.unfold();
	};

	/** Folded: only a click on the sun (or its cue text) opens the sky; clicks elsewhere do nothing. */
	const onStageClick = (e: MouseEvent) => {
		const t = e.target as Element;
		if (t.closest("button, a, [data-no-unfold]")) return;
		if (folded && t.closest(".sun-hit")) setFolded(false);
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

	const updateSleep = () => {
		asleep = !onScreen || document.hidden;
		if (asleep) svgEl.pauseAnimations();
		else svgEl.unpauseAnimations();
	};
	const io = new IntersectionObserver(([en]) => {
		onScreen = en.isIntersecting;
		updateSleep();
	});
	io.observe(stage);
	document.addEventListener("visibilitychange", updateSleep);

	stage.addEventListener("click", onStageClick);
	window.addEventListener("resize", onResize);
	scheme.addEventListener("change", rebuild);
	build();

	return {
		setFolded,
		hubPoint: (id) => api?.hubPoint(id) ?? null,
		hubElement: (id) => api?.hubElement(id) ?? null,
		reset: () => api?.reset(),
		destroy() {
			stage.removeEventListener("click", onStageClick);
			window.removeEventListener("resize", onResize);
			io.disconnect();
			document.removeEventListener("visibilitychange", updateSleep);
			scheme.removeEventListener("change", rebuild);
			clearTimeout(resizeT);
			timeouts.forEach(clearTimeout);
			sim?.stop();
			drift?.stop();
			select(svgEl).selectAll("*").interrupt().remove();
			if (o.sky) select(o.sky.svg).selectAll("*").remove();
		},
	};
}
