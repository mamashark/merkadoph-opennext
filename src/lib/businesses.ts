/**
 * The two businesses under Merkado PH, each with its own page and homepage Highlight.
 * - Bygg (/bygg): Merkado Byggnadsavdelning, a fixed page in Swedish; its content is in src/lib/bygg-content.ts.
 * - Digital (/digital): its words live in Admin → Services. The service with slug `slug` is the page's main text
 *   (excerpt, body, cover, call to action, SEO fields); every other live service with category `category` is listed.
 *   `intro` is only shown until that main service is published, so it states nothing beyond what the business is.
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
		slug: "merkado-ph-digital",
		category: "Digital",
		name: "Merkado PH Digital",
		lang: "en",
		eyebrow: "Websites · Webshops · Branding",
		intro: "Websites, webshops and branding, from Merkado PH.",
		ctaDefault: "Get in touch",
		servicesHeading: "Our services",
		contactHeading: "Get in touch",
		contactLede: "Tell us about your project and we’ll get back to you.",
	},
} as const;

export type BusinessId = keyof typeof BUSINESSES;
export type Business = (typeof BUSINESSES)[BusinessId];
/** A business whose page is built from Admin → Services. */
export type ServiceBusiness = typeof BUSINESSES.digital;

/**
 * Official links for the Philippine Embassy in Sweden, shown on the Bulletin Board.
 * Only add a URL that has been checked on the Embassy's / DFA's own site (Strict rule 15). Empty = not shown.
 */
export const EMBASSY_LINKS: { label: string; href: string }[] = [];
