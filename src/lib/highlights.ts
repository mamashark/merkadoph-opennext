/*
 * The seven Highlights of the homepage constellation: the single list that both the homepage
 * (src/components/highlights/highlights-home.tsx) and the case study (/case-study/constellation) read.
 * Static values only; counts and "is there anything to show" stay in highlights-home.tsx because they depend on data.
 * Labels and subs come from the content files Kay edits today, so nothing is typed twice.
 */
import { BUSINESSES } from "@/lib/businesses";
import { HOME } from "@/lib/home-content";
import { TAHOOO } from "@/lib/tahooo-content";
import type { ConstellationColor } from "@/components/constellation/types";

const H = HOME.highlights;

/** Homepage order. */
export const HIGHLIGHT_IDS = ["blogs", "events", "impact", "bygg", "digital", "tahooo", "bulletin"] as const;
export type HighlightId = (typeof HIGHLIGHT_IDS)[number];

export type HighlightDef = {
	id: HighlightId;
	label: string;
	sub: string;
	color: ConstellationColor;
	/** Small dots drawn around the hub. */
	dots: number;
	/** Where "see everything" goes. */
	list: string;
	allLabel: string;
	cta: string;
	/** Events only: what the Highlight says when nothing is coming up. */
	whenEmpty?: { sub: string; allLabel: string; list: string };
};

export const HIGHLIGHTS: Record<HighlightId, HighlightDef> = {
	blogs: { id: "blogs", label: H.blogs.label, sub: H.blogs.sub, color: "leaf", dots: 18, list: "/blogs", allLabel: H.blogs.allLabel, cta: H.blogs.cta },
	events: {
		id: "events",
		label: H.events.label,
		sub: H.events.upcoming.sub,
		color: "red",
		dots: 10,
		list: "/events",
		allLabel: H.events.upcoming.allLabel,
		cta: H.events.cta,
		whenEmpty: { sub: H.events.past.sub, allLabel: H.events.past.allLabel, list: "/events?when=past" },
	},
	impact: { id: "impact", label: H.impact.label, sub: H.impact.sub, color: "sun", dots: 8, list: "/impact", allLabel: H.impact.allLabel, cta: H.impact.cta },
	// The two businesses always show: their page is worth visiting even before offerings are listed.
	bygg: {
		id: "bygg",
		label: BUSINESSES.bygg.name,
		sub: H.bygg.sub,
		color: "orange",
		dots: 8,
		list: BUSINESSES.bygg.path,
		allLabel: `${H.bygg.allLabelPrefix} ${BUSINESSES.bygg.name}`,
		cta: H.bygg.cta,
	},
	digital: {
		id: "digital",
		label: BUSINESSES.digital.name,
		sub: H.digital.sub,
		color: "blue",
		dots: 8,
		list: BUSINESSES.digital.path,
		allLabel: `${H.digital.allLabelPrefix} ${BUSINESSES.digital.name}`,
		cta: H.digital.cta,
	},
	tahooo: { id: "tahooo", label: TAHOOO.highlight, sub: H.tahooo.sub, color: "caramel", dots: 6, list: "/tahooo", allLabel: H.tahooo.allLabel, cta: H.tahooo.cta },
	bulletin: { id: "bulletin", label: H.bulletin.label, sub: H.bulletin.sub, color: "coral", dots: 6, list: "/bulletin", allLabel: H.bulletin.allLabel, cta: H.bulletin.cta },
};
