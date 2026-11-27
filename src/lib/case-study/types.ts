/*
 * Types for "Behind the Build" (the living case study). Types only, no data (design: local/behind-the-build-phase2-design.md, section 1.2).
 * `Decision` and `Challenge` carry a stable `id`; src/lib/case-study-content.ts imports them from here.
 */
import type { HighlightId } from "@/lib/highlights";

export type Fact = { label: string; value: string };
export type Feature = { title: string; body: string };
export type Decision = { id: string; area: string; title: string; why: string; tradeoff: string };
export type Challenge = { id: string; area: string; title: string; problem: string; cause?: string; fix: string; result: string };

export type ISODate = string; // "YYYY-MM-DD" (checked by integrity.ts)

export const SKILL_IDS = [
	"frontend",
	"state-url",
	"design-systems",
	"accessibility",
	"full-stack",
	"content-architecture",
	"seo",
	"performance-edge",
	"cloud-devops",
	"security",
	"migration",
	"product",
] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export const CATEGORY_IDS = ["experience", "design", "content", "admin", "discovery", "platform", "quality"] as const;
export type Category = (typeof CATEGORY_IDS)[number];

export type ShowcaseStatus = "live" | "in-progress" | "planned" | "experimental";
export type ShotViewport = "desktop" | "tablet" | "mobile";
export type ChangeCategory = "New" | "Improvement" | "UI/UX" | "Fix" | "Performance" | "Accessibility" | "Infrastructure" | "Content";

/** What the content file says about a screenshot. Size and capture date come from the manifest, never typed by hand. */
export type Shot = {
	/** File name in public/case-study/; the key into the manifest. */
	file: string;
	/** Describes what the shot shows, for a screen reader (not "screenshot"). */
	alt: string;
	caption: string;
	viewport: ShotViewport;
	/** Human state name ("Opened sky", "Impact, year 2025"). */
	state: string;
	mode?: "light" | "dark";
	/** An older capture shown for a before/after; copy it by hand from case-study-archive/ (repo root, not deployed) into public/case-study/ first. */
	archived?: boolean;
};
/** Written by scripts/capture-case-study.mjs into shots-manifest.json, keyed by Shot.file. */
export type ShotMeta = { width: number; height: number; captured: ISODate; bytes: number };
export type ShotManifest = Record<string, ShotMeta>;

export type WalkthroughStep = {
	id: string;
	step: string;
	body: string;
	shots: Shot[];
	/** Optional deep link to the live site for this state; must start with "/". */
	liveHref?: string;
};
export type UnderTheHoodItem = {
	label: string;
	body: string;
	/** Public application source file names backing the claim (not rendered until Kay decides BtB-7). */
	source?: string[];
	/** Date the claim was last checked against the code. */
	verified: ISODate;
};
/** Numbers always carry the date; "emulated" goes in `note`. */
export type MeasuredFact = Fact & { measured: ISODate; note?: string };

export type HighlightCopy = {
	what: string;
	feeds: string;
	rule: string;
	/** The opened Highlight, light and dark variants of one capture (the page picks by colour scheme). */
	shots?: Shot[];
	/** Snapshot only, always dated; never read live. */
	count?: { value: number; unit: string; asOf: ISODate };
};

export type ShowcaseFeature = {
	/** URL: /case-study/<slug>. Never rename a published slug (add a redirect row instead). */
	slug: string;
	title: string;
	summary: string;
	category: Category;
	status: ShowcaseStatus;
	flagship?: boolean;
	skills: SkillId[];
	updated: ISODate;
	problem: string;
	solution: string;
	/** Directory card image; none = typographic card (no placeholder art, Strict rule 7). */
	cardShot?: Shot;
	/** 1200x630 JPEG in public/case-study/og/ for social previews. */
	ogFile?: string;
	/** A feature has its own page iff it has a walkthrough. */
	walkthrough?: WalkthroughStep[];
	underTheHood?: UnderTheHoodItem[];
	/** Decision.id values. */
	decisions?: string[];
	/** Challenge.id values. */
	challenges?: string[];
	results?: MeasuredFact[];
	versions?: { date: ISODate; note: string; before?: Shot; after?: Shot }[];
	future?: string[];
	/** Other feature slugs. */
	related?: string[];
	/** Constellation only. */
	highlights?: Partial<Record<HighlightId, HighlightCopy>>;
};

export type ChangelogEntry = { date: ISODate; feature?: string; category: ChangeCategory; text: string; /** Shot.file values */ shots?: string[] };
