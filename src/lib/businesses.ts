/**
 * The two businesses under Merkado PH, each with its own page and homepage Highlight.
 * - Bygg (/bygg): Merkado Byggnadsavdelning, a fixed page in Swedish; its content is in src/lib/bygg-content.ts.
 * - Digital (/digital): Merkado PH Digital, a fixed page in English; its content is in src/lib/digital-content.ts.
 */
export const BUSINESSES = {
	bygg: {
		id: "bygg",
		path: "/bygg",
		name: "Merkado Byggnadsavdelning",
		/** This page is in Swedish (Kay, 2026-11-19); the rest of the site is English. */
		lang: "sv",
		eyebrow: "Bygg- och entreprenadtjänster",
	},
	digital: {
		id: "digital",
		path: "/digital",
		name: "Merkado PH Digital",
		lang: "en",
		eyebrow: "Branding · Marketing · Websites · Consulting",
	},
} as const;

export type BusinessId = keyof typeof BUSINESSES;
export type Business = (typeof BUSINESSES)[BusinessId];

/**
 * Official links for the Philippine Embassy in Sweden, shown on the Bulletin Board.
 * Only add a URL that has been checked on the Embassy's / DFA's own site (Strict rule 15). Empty = not shown.
 */
export const EMBASSY_LINKS: { label: string; href: string }[] = [];
