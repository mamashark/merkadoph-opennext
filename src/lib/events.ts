import "server-only";
import { cache } from "react";
import { cached } from "@/lib/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { adminGet, adminList, onlyLive } from "@/lib/content-server";
import type { ContentStatus } from "@/lib/content";

export type EventItem = {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	content: string;
	cover_image_url: string | null;
	cover_image_alt: string | null;
	tags: string[];
	starts_at: string;
	ends_at: string | null;
	venue_name: string | null;
	venue_address: string | null;
	map_url: string | null;
	organizer: string | null;
	price_info: string | null;
	registration_url: string | null;
	meta_title: string | null;
	meta_description: string | null;
	status: ContentStatus;
	published_at: string | null;
	created_at: string;
	updated_at: string;
};

export type EventSummary = Pick<
	EventItem,
	"id" | "title" | "slug" | "excerpt" | "cover_image_url" | "cover_image_alt" | "tags" | "starts_at" | "ends_at" | "venue_name" | "status" | "published_at" | "updated_at"
>;

const SUMMARY = "id,title,slug,excerpt,cover_image_url,cover_image_alt,tags,starts_at,ends_at,venue_name,status,published_at,updated_at";
export const EVENTS_PER_PAGE = 9;

/** An event is upcoming until it ends (or, with no end time, until it starts). */
function timeFilter(when: "upcoming" | "past") {
	const now = new Date().toISOString();
	return when === "upcoming" ? `ends_at.gte.${now},and(ends_at.is.null,starts_at.gte.${now})` : `ends_at.lt.${now},and(ends_at.is.null,starts_at.lt.${now})`;
}

export const getPublicEvents = cached(async (when: "upcoming" | "past", page: number = 1, perPage: number = EVENTS_PER_PAGE) => {
	const from = (page - 1) * perPage;
	const { data, count, error } = await onlyLive(createPublicClient().from("events").select(SUMMARY, { count: "exact" }))
		.or(timeFilter(when))
		.order("starts_at", { ascending: when === "upcoming" })
		.range(from, from + perPage - 1);
	if (error) throw new Error(`Failed to load events: ${error.message}`);
	return { events: (data ?? []) as EventSummary[], total: count ?? 0 };
}, "events:getPublicEvents", ["events"]);

export const getPublicEventBySlug = cache(cached(async (slug: string): Promise<EventItem | null> => {
	const { data, error } = await onlyLive(createPublicClient().from("events").select("*").eq("slug", slug)).maybeSingle();
	if (error) throw new Error(`Failed to load event: ${error.message}`);
	return data as EventItem | null;
}, "events:getPublicEventBySlug", ["events"]));

export const getEventSlugs = cached(async () => {
	const { data } = await onlyLive(createPublicClient().from("events").select("slug,updated_at")).limit(5000);
	return (data ?? []) as Pick<EventItem, "slug" | "updated_at">[];
}, "events:getEventSlugs", ["events"]);

export function isPastEvent(e: Pick<EventItem, "starts_at" | "ends_at">): boolean {
	return new Date(e.ends_at ?? e.starts_at).getTime() < Date.now();
}

/* ------------------------------ Admin ------------------------------ */

export const EVENT_SORTS = {
	start: { column: "starts_at", ascending: false },
	updated: { column: "updated_at", ascending: false },
	title: { column: "title", ascending: true },
} as const;

export function adminListEvents(opts: { q?: string; status?: string; when?: string; sort?: string; page?: number; perPage?: number }) {
	return adminList<EventSummary>("events", {
		columns: SUMMARY,
		q: opts.q,
		searchColumns: ["title", "venue_name"],
		state: opts.status,
		page: opts.page,
		perPage: opts.perPage,
		order: EVENT_SORTS[opts.sort as keyof typeof EVENT_SORTS] ?? EVENT_SORTS.start,
		refine: (query) => (opts.when === "upcoming" || opts.when === "past" ? query.or(timeFilter(opts.when)) : query),
	});
}

export const adminGetEvent = (id: string) => adminGet<EventItem>("events", id);
