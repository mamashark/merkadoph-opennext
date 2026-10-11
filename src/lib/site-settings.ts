import "server-only";
import { cached } from "@/lib/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { SITE_NAME, SITE_URL } from "@/lib/env";

/* ------------------------------------------------------------------ */
/* SEO settings (site_settings key "seo", Admin → SEO)                  */
/* ------------------------------------------------------------------ */

export const SEO_FIELDS = [
	"site_description",
	"default_og_image",
	"default_og_alt",
	"business_name",
	"legal_name",
	"phone",
	"email",
	"street",
	"postal_code",
	"city",
	"region",
	"country",
	"latitude",
	"longitude",
	"price_range",
	"area_served",
	"opening_hours",
	"facebook",
	"instagram",
	"tiktok",
	"youtube",
	"linkedin",
	"google_verification",
	"bing_verification",
	"cf_analytics_token",
] as const;
export type SeoField = (typeof SEO_FIELDS)[number];
export type SeoSettings = Record<SeoField, string>;

export const DEFAULT_SEO: SeoSettings = {
	...(Object.fromEntries(SEO_FIELDS.map((k) => [k, ""])) as SeoSettings),
	site_description: "Roofing, renovation and construction in Sweden, from the family behind the Merkado PH Filipino store.",
	default_og_image: "/og-default.jpg",
	default_og_alt: "Merkado PH",
	business_name: SITE_NAME,
	country: "SE",
	area_served: "Sweden",
};

export const SOCIAL_FIELDS = ["facebook", "instagram", "tiktok", "youtube", "linkedin"] as const satisfies readonly SeoField[];

/** Public SEO settings, merged over defaults. Empty strings in the DB fall back to defaults. */
export const getSeoSettings = cached(
	async (): Promise<SeoSettings> => {
		const { data } = await createPublicClient().from("site_settings").select("value").eq("key", "seo").maybeSingle();
		const stored = (data?.value ?? {}) as Partial<SeoSettings>;
		const out = { ...DEFAULT_SEO };
		for (const k of SEO_FIELDS) if (typeof stored[k] === "string" && stored[k]!.trim()) out[k] = stored[k]!.trim();
		return out;
	},
	"settings:seo",
	["seo"],
);

/** Absolute URL for a stored image path ("/og-default.jpg" or a full https URL). */
export const absoluteImage = (src: string) => (src.startsWith("http") ? src : `${SITE_URL}${src.startsWith("/") ? "" : "/"}${src}`);

const DAYS: Record<string, string> = { mo: "Monday", tu: "Tuesday", we: "Wednesday", th: "Thursday", fr: "Friday", sa: "Saturday", su: "Sunday" };
const ORDER = Object.keys(DAYS);

/**
 * "Mo-Fr 08:00-17:00" / "Sa 10:00-14:00" lines → schema.org OpeningHoursSpecification.
 * Lines that don't match are ignored.
 */
export function openingHoursSpec(text: string) {
	return text
		.split(/\r?\n/)
		.map((line) => line.trim().match(/^([a-z]{2})(?:\s*-\s*([a-z]{2}))?\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/i))
		.flatMap((m) => {
			if (!m) return [];
			const from = ORDER.indexOf(m[1].toLowerCase());
			const to = m[2] ? ORDER.indexOf(m[2].toLowerCase()) : from;
			if (from < 0 || to < from) return [];
			return [{ "@type": "OpeningHoursSpecification", dayOfWeek: ORDER.slice(from, to + 1).map((d) => DAYS[d]), opens: m[3].padStart(5, "0"), closes: m[4].padStart(5, "0") }];
		});
}

/** Public social profile URLs (for `sameAs` and the footer). */
export const socialLinks = (s: SeoSettings) =>
	SOCIAL_FIELDS.filter((k) => /^https:\/\//.test(s[k])).map((k) => ({ network: k, url: s[k] }));

/** Organization + WebSite JSON-LD, shared by every public page. */
export function siteJsonLd(s: SeoSettings) {
	const sameAs = socialLinks(s).map((l) => l.url);
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "Organization",
				"@id": `${SITE_URL}/#organization`,
				name: s.business_name,
				...(s.legal_name ? { legalName: s.legal_name } : {}),
				url: SITE_URL,
				logo: { "@type": "ImageObject", url: `${SITE_URL}/android-chrome-512x512.png`, width: 512, height: 512 },
				...(sameAs.length ? { sameAs } : {}),
				...(s.phone || s.email
					? { contactPoint: { "@type": "ContactPoint", contactType: "customer service", ...(s.phone ? { telephone: s.phone } : {}), ...(s.email ? { email: s.email } : {}), availableLanguage: ["en", "sv", "tl"] } }
					: {}),
			},
			{
				"@type": "WebSite",
				"@id": `${SITE_URL}/#website`,
				url: SITE_URL,
				name: SITE_NAME,
				publisher: { "@id": `${SITE_URL}/#organization` },
				inLanguage: "en",
			},
		],
	};
}

/** Address / geo / hours / contact for LocalBusiness schema (only the parts that are filled in). */
export function localBusinessDetails(s: SeoSettings) {
	const hours = openingHoursSpec(s.opening_hours);
	const lat = Number(s.latitude);
	const lng = Number(s.longitude);
	return {
		...(s.phone ? { telephone: s.phone } : {}),
		...(s.email ? { email: s.email } : {}),
		...(s.street || s.city
			? { address: { "@type": "PostalAddress", streetAddress: s.street || undefined, postalCode: s.postal_code || undefined, addressLocality: s.city || undefined, addressRegion: s.region || undefined, addressCountry: s.country || "SE" } }
			: {}),
		...(s.latitude && s.longitude && Number.isFinite(lat) && Number.isFinite(lng) ? { geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng } } : {}),
		...(hours.length ? { openingHoursSpecification: hours } : {}),
		...(s.price_range ? { priceRange: s.price_range } : {}),
		areaServed: s.area_served
			.split(",")
			.map((a) => a.trim())
			.filter(Boolean)
			.map((name) => ({ "@type": "Place", name })),
		image: absoluteImage(s.default_og_image),
		sameAs: socialLinks(s).map((l) => l.url),
	};
}

/* ------------------------------------------------------------------ */
/* Legal pages (site_settings key "legal", Admin → SEO → Legal pages)  */
/* ------------------------------------------------------------------ */

export const LEGAL_PAGES = {
	privacy: { title: "Privacy policy", path: "/privacy", description: "How Merkado PH collects, uses and protects your personal data." },
	terms: { title: "Terms and conditions", path: "/terms", description: "The terms that apply when you use the Merkado PH website and services." },
	cookies: { title: "Cookie policy", path: "/cookies", description: "Which cookies and similar technologies the Merkado PH website uses, and why." },
} as const;
export type LegalPageId = keyof typeof LEGAL_PAGES;
export const LEGAL_PAGE_IDS = Object.keys(LEGAL_PAGES) as LegalPageId[];
export type LegalPage = { body: string; updated_at: string | null };

export const getLegalPages = cached(
	async (): Promise<Record<LegalPageId, LegalPage>> => {
		const { data } = await createPublicClient().from("site_settings").select("value").eq("key", "legal").maybeSingle();
		const stored = (data?.value ?? {}) as Partial<Record<LegalPageId, Partial<LegalPage>>>;
		return Object.fromEntries(
			LEGAL_PAGE_IDS.map((id) => [id, { body: typeof stored[id]?.body === "string" ? stored[id]!.body! : "", updated_at: stored[id]?.updated_at ?? null }]),
		) as Record<LegalPageId, LegalPage>;
	},
	"settings:legal",
	["legal"],
);
