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

/**
 * Phase 1 (Kay, 2026-11-25): press items can be saved, but published only once /press exists (Phase 2).
 * Flip to true in Phase 2.
 */
export const PRESS_PUBLISHING_OPEN = false;

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
 * Official Philippine Embassy sources for embassy updates (project Strict rule 15). The DFA hosts every
 * Philippine foreign-service site (e.g. the Stockholm embassy) under dfa.gov.ph. Kay confirms or extends this list.
 */
export const EMBASSY_HOSTS = ["dfa.gov.ph"];
export function isOfficialEmbassyUrl(url: string): boolean {
	try {
		const host = new URL(url).hostname.toLowerCase();
		return EMBASSY_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
	} catch {
		return false;
	}
}

/** Press release media contact: a role address on our own domain only, never a named person (Kay, 2026-11-25). */
export const MEDIA_CONTACT_DOMAIN = "merkadoph.se";
