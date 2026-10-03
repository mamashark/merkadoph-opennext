import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { EVENTS_PER_PAGE, getPublicEvents } from "@/lib/events";
import { pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { pageMetadata } from "@/lib/seo";
import { ContentCard, EmptyNotice, LinkTabs, PageIntro, Pill } from "@/components/site/content-card";
import { Pagination } from "@/components/admin/pagination";

// Renders per request (it reads the tab/page from the URL); the data itself comes from the cache.

const description = "Gatherings, celebrations and home-improvement workshops from the Merkado PH Filipino-Swedish community. See what's coming up and join us.";

export async function generateMetadata({ searchParams }: PageProps<"/events">): Promise<Metadata> {
	const params = await searchParams;
	const past = param(params, "when") === "past";
	const page = pageParam(params);
	const qs = new URLSearchParams({ ...(past ? { when: "past" } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString();
	return pageMetadata({
		title: `${past ? "Past events" : "Events"}${page > 1 ? ` — Page ${page}` : ""}`,
		description,
		path: qs ? `/events?${qs}` : "/events",
	});
}

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
	const params = await searchParams;
	const when = param(params, "when") === "past" ? "past" : "upcoming";
	const page = pageParam(params);
	const { events, total } = await getPublicEvents(when, page);
	if (page > 1 && events.length === 0) notFound();

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<PageIntro eyebrow="Events" title="Kita-kits sa Merkado" description={description} />

			<LinkTabs
				label="Event timeframe"
				current={when}
				tabs={[
					{ label: "Upcoming", value: "upcoming", href: "/events" },
					{ label: "Past events", value: "past", href: "/events?when=past" },
				]}
			/>

			{events.length === 0 ? (
				<EmptyNotice
					title={when === "upcoming" ? "No upcoming events right now." : "No past events yet."}
					description={when === "upcoming" ? "New events are announced here first — abangan!" : "Check back after our first gathering."}
				/>
			) : (
				<>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{events.map((event, i) => (
							<ContentCard
								key={event.id}
								href={`/events/${event.slug}`}
								title={event.title}
								excerpt={event.excerpt}
								image={event.cover_image_url}
								imageAlt={event.cover_image_alt}
								priority={i === 0}
								badge={
									<Pill tone={when === "past" ? "muted" : "light"}>
										{formatDate(event.starts_at, { month: "short", day: "numeric" })}
										{when === "past" && " · Ended"}
									</Pill>
								}
								eyebrow={event.tags.slice(0, 2).join(" · ") || undefined}
								meta={
									<div className="space-y-1">
										<p className="flex items-center gap-1.5">
											<CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
											<time dateTime={event.starts_at}>{formatDate(event.starts_at, { dateStyle: "full", timeStyle: "short" })}</time>
										</p>
										{event.venue_name && (
											<p className="flex items-center gap-1.5">
												<MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
												{event.venue_name}
											</p>
										)}
									</div>
								}
							/>
						))}
					</div>
					<div className="mt-12">
						<Pagination page={page} perPage={EVENTS_PER_PAGE} total={total} basePath="/events" params={when === "past" ? { when } : {}} />
					</div>
				</>
			)}
		</main>
	);
}
