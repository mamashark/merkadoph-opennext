import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Ticket, Users } from "lucide-react";
import { getPublicEventBySlug, isPastEvent } from "@/lib/events";
import { summarize } from "@/lib/content";
import { formatRange } from "@/lib/datetime";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { BackFooter, Body, CoverFigure, CtaLink, DetailHeader, Facts } from "@/components/site/detail";
import { JsonLd } from "@/components/site/json-ld";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
	const event = await getPublicEventBySlug((await params).slug);
	if (!event) return { title: "Event not found", robots: { index: false } };

	return pageMetadata({
		title: event.meta_title || event.title,
		description: summarize(event),
		path: `/events/${event.slug}`,
		image: event.cover_image_url ? { url: event.cover_image_url, alt: event.cover_image_alt } : null,
		type: "article",
		publishedTime: event.published_at,
		modifiedTime: event.updated_at,
		tags: event.tags,
	});
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
	const event = await getPublicEventBySlug((await params).slug);
	if (!event) notFound();

	const path = `/events/${event.slug}`;
	const past = isPastEvent(event);

	return (
		<main>
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "Event",
						name: event.title,
						description: summarize(event),
						startDate: event.starts_at,
						endDate: event.ends_at ?? undefined,
						eventStatus: "https://schema.org/EventScheduled",
						eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
						image: event.cover_image_url ? [event.cover_image_url] : undefined,
						url: absoluteUrl(path),
						location: event.venue_name
							? { "@type": "Place", name: event.venue_name, address: event.venue_address ?? event.venue_name }
							: { "@type": "Place", name: "Merkado PH", address: "Philippines" },
						organizer: event.organizer ? { "@type": "Organization", name: event.organizer } : organization,
						...(event.registration_url ? { offers: { "@type": "Offer", url: event.registration_url, availability: "https://schema.org/InStock" } } : {}),
					},
					breadcrumbs([
						{ name: "Events", path: "/events" },
						{ name: event.title, path },
					]),
				]}
			/>

			<article>
				<DetailHeader backHref="/events" backLabel="All events" tags={event.tags} title={event.title} excerpt={event.excerpt}>
					{past && (
						<p className="mt-4 inline-flex rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-800 dark:bg-stone-800 dark:text-stone-200">This event has ended</p>
					)}
				</DetailHeader>

				<Facts
					facts={[
						{ icon: CalendarDays, label: "When", value: <time dateTime={event.starts_at}>{formatRange(event.starts_at, event.ends_at)}</time> },
						{
							icon: MapPin,
							label: "Where",
							value: event.venue_name ? (
								<>
									{event.venue_name}
									{event.venue_address && <span className="block font-normal text-stone-600 dark:text-stone-400">{event.venue_address}</span>}
								</>
							) : null,
						},
						{ icon: Ticket, label: "Admission", value: event.price_info },
						{ icon: Users, label: "Organizer", value: event.organizer },
						{ icon: Clock, label: "Timezone", value: "Philippine Time (UTC+8)" },
					]}
				>
					{!past && event.registration_url && <CtaLink href={event.registration_url}>Register</CtaLink>}
					{event.map_url && (
						<CtaLink href={event.map_url} variant="secondary">
							Get directions
						</CtaLink>
					)}
				</Facts>

				<CoverFigure src={event.cover_image_url} alt={event.cover_image_alt || event.title} caption={event.cover_image_alt} />
				<Body content={event.content} />
			</article>

			<BackFooter href="/events" label="Back to all events" />
		</main>
	);
}
