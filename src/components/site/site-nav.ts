/**
 * The site's sections, as listed in the header's Highlights menu. They mirror the homepage Highlights
 * (same order and colours); the colour classes come from the brand tokens in globals.css.
 */
export type NavHighlight = { href: string; label: string; sub: string; swatch: string };

export const NAV_HIGHLIGHTS: NavHighlight[] = [
	{ href: "/blogs", label: "Blog", sub: "Stories from Merkado PH and our community", swatch: "bg-brand-teal" },
	{ href: "/events", label: "Events", sub: "Community and cultural events, pop-ups, festivals", swatch: "bg-brand-red" },
	{ href: "/impact", label: "Community Impact", sub: "Projects that brought people together", swatch: "bg-brand-yellow" },
	{ href: "/bygg", label: "Merkado Byggnadsavdelning", sub: "Construction by Tindero Pedro", swatch: "bg-brand-orange" },
	{ href: "/digital", label: "Merkado PH Digital", sub: "Websites, webshops and branding", swatch: "bg-blue-600" },
	{ href: "/tahooo", label: "Tahooo Corner", sub: "Taho for your event in Gothenburg", swatch: "bg-tahooo-caramel" },
	{ href: "/bulletin", label: "Bulletin Board", sub: "Embassy news, notices and offers", swatch: "bg-brand-promo" },
];

/** Where "Get in touch" goes when a page has no contact form of its own: the homepage's contact section. */
export const DEFAULT_CONTACT_HREF = "/#contact";
