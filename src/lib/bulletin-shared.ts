/**
 * Bulletin Board + Press & Media: labels and rules shared by the server and the admin form (no server imports).
 * Data model: supabase/migrations/20261125120000_bulletin_items.sql. Data layer: src/lib/bulletin.ts.
 */

export const BULLETIN_TYPES = ["embassy_update", "community_notice", "media_coverage", "press_release", "opportunity"] as const;
export type BulletinType = (typeof BULLETIN_TYPES)[number];

export const TYPE_LABEL: Record<BulletinType, string> = {
	embassy_update: "Embassy update",
	community_notice: "Community notice",
	media_coverage: "Media coverage",
	press_release: "Press release",
	opportunity: "Opportunity",
};

/** Which category a new item of each type starts in (the editor can change it). */
export const DEFAULT_CATEGORY: Record<BulletinType, string> = {
	embassy_update: "embassy-updates",
	community_notice: "community-notices",
	media_coverage: "press-media",
	press_release: "press-media",
	opportunity: "opportunities",
};

/** Press types: canonical page on /press, never expire, can show in the press archive. */
export const PRESS_TYPES: readonly BulletinType[] = ["media_coverage", "press_release"];
export const isPressType = (t: string) => (PRESS_TYPES as readonly string[]).includes(t);
/** The category press items are filed under: it lives on /press, so the Bulletin Board doesn't offer it as a filter. */
export const PRESS_CATEGORY = DEFAULT_CATEGORY.press_release;

/** Press items can be published now that /press exists (Phase 2, Kay 2026-11-26). */
export const PRESS_PUBLISHING_OPEN = true;

/**
 * Canonical URL of an item by type (spec §4.7): press items live on /press, everything else on /bulletin.
 * Used for the page, share links, breadcrumbs and slug-change redirects, so the two can never disagree.
 */
export const itemBase = (type: string) => (isPressType(type) ? "/press" : "/bulletin");
export const itemPath = (item: { content_type: string; slug: string }) => `${itemBase(item.content_type)}/${item.slug}`;

export const MEDIA_TYPES = ["newspaper", "online", "television", "radio_podcast", "embassy", "government", "event_coverage", "community_publication"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];
export const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
	newspaper: "Newspaper",
	online: "Online publication",
	television: "Television",
	radio_podcast: "Radio or podcast",
	embassy: "Embassy feature",
	government: "Government or institution",
	event_coverage: "Event coverage",
	community_publication: "Community publication",
};

export const LANGUAGES = [
	{ value: "en", label: "English" },
	{ value: "sv", label: "Swedish" },
	{ value: "fil", label: "Filipino" },
	{ value: "tl", label: "Tagalog" },
] as const;
export const languageLabel = (code: string | null | undefined) => LANGUAGES.find((l) => l.value === code)?.label ?? code ?? "";

/** Stored statuses. Scheduled and expired are derived from the dates (and enforced by RLS). */
export type BulletinStatus = "draft" | "in_review" | "published" | "archived";
export type BulletinState = "draft" | "in_review" | "scheduled" | "published" | "expired" | "archived";

export const STATE_LABEL: Record<BulletinState, string> = {
	draft: "Draft",
	in_review: "In review",
	scheduled: "Scheduled",
	published: "Published",
	expired: "Expired",
	archived: "Archived",
};

export function bulletinState(row: { status: BulletinStatus; published_at: string | null; expires_at: string | null }, now = Date.now()): BulletinState {
	if (row.status !== "published") return row.status;
	if (row.published_at && new Date(row.published_at).getTime() > now) return "scheduled";
	if (row.expires_at && new Date(row.expires_at).getTime() <= now) return "expired";
	return "published";
}

/** Filter slug for offers, which come from public.promotions (reserved in bulletin_categories). */
export const OFFERS_SLUG = "community-offers";

/**
 * Official Philippine Embassy sources for embassy updates (project Strict rule 15), confirmed by Kay 2026-11-25:
 * - any page on dfa.gov.ph (the DFA hosts every Philippine foreign-service site, incl. the Stockholm embassy);
 * - posts on the Embassy's own Facebook page, facebook.com/PHLinSE (the path must start with that page name,
 *   so other pages and anonymous share links like facebook.com/share/… are refused).
 */
export const EMBASSY_HOSTS = ["dfa.gov.ph"];
export const EMBASSY_FACEBOOK_PAGE = "PHLinSE";
const FACEBOOK_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"]);

export function isOfficialEmbassyUrl(url: string): boolean {
	let u: URL;
	try {
		u = new URL(url);
	} catch {
		return false;
	}
	if (u.protocol !== "https:" || u.username || u.password) return false;
	const host = u.hostname.toLowerCase();
	if (EMBASSY_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;
	const first = u.pathname.split("/")[1] ?? "";
	return FACEBOOK_HOSTS.has(host) && first.toLowerCase() === EMBASSY_FACEBOOK_PAGE.toLowerCase();
}

/** Press release media contact: a role address on our own domain only, never a named person (Kay, 2026-11-25). */
export const MEDIA_CONTACT_DOMAIN = "merkadoph.se";

/**
 * Who issued an item, the same everywhere (homepage, /bulletin, its page): the publisher, else the byline,
 * else the Embassy for embassy updates, so official information is never credited to Merkado PH (Arvid).
 */
export function issuedBy(item: { publisher?: { name: string } | null; author_name?: string | null; content_type: string }): string {
	return item.publisher?.name || item.author_name || (item.content_type === "embassy_update" ? "Philippine Embassy" : "Merkado PH");
}

/** Fields each type uses; the server clears the others on save (Arvid M1). */
export const TYPE_FIELDS = {
	mediaSource: ["media_coverage"] as readonly string[], // publisher_id, media_type, original_title
	pressDates: ["media_coverage", "press_release"] as readonly string[], // original_published_on, source_language, source_verified_on
	pressRelease: ["press_release"] as readonly string[], // media_contact, attachments
	cta: ["opportunity", "community_notice", "embassy_update"] as readonly string[], // cta_label, cta_url
};
