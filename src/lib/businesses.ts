/**
 * The two businesses under Merkado PH, each with its own page and homepage Highlight.
 * Their words live in Admin → Services, not in code:
 * - the service with slug `slug` is the page's main text (excerpt, body, cover, call to action, SEO fields);
 * - every other live service with category `category` is listed on the page as an offering.
 * `intro` is only shown until that main service is published, so it states nothing beyond what the business is.
 */
export const BUSINESSES = {
	bygg: {
		id: "bygg",
		path: "/bygg",
		slug: "merkado-ph-bygg",
		category: "Bygg",
		name: "Merkado PH Bygg",
		eyebrow: "Construction",
		intro: "Construction services by Tindero Pedro, from Merkado PH.",
	},
	digital: {
		id: "digital",
		path: "/digital",
		slug: "merkado-ph-digital",
		category: "Digital",
		name: "Merkado PH Digital",
		eyebrow: "Websites · Webshops · Branding",
		intro: "Websites, webshops and branding, from Merkado PH.",
	},
} as const;

export type BusinessId = keyof typeof BUSINESSES;
export type Business = (typeof BUSINESSES)[BusinessId];

/**
 * Official links for the Philippine Embassy in Sweden, shown on the Bulletin Board.
 * Only add a URL that has been checked on the Embassy's / DFA's own site (Strict rule 15). Empty = not shown.
 */
export const EMBASSY_LINKS: { label: string; href: string }[] = [];
