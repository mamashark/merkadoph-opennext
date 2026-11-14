import { getPublishedBlogs } from "@/lib/blogs";
import { getPublicEvents } from "@/lib/events";
import { getPublicPortfolios, portfolioCover } from "@/lib/portfolio";
import { getPublicPromotions } from "@/lib/promotions";
import { getPublicServices } from "@/lib/services";
import { formatDate, formatDayRange } from "@/lib/datetime";
import { Constellation } from "@/components/constellation/constellation";
import type { ConstellationHub, ConstellationItem } from "@/components/constellation/types";

/** Newest items per content type drawn as tiles; the totals still show next to each category. */
const PER_TYPE = 10;

const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

/** A small, optimized cover for a 28px tile (Next image optimizer; 64px covers 2× screens). */
const thumb = (url: string | null | undefined) => (url ? `/_next/image?url=${encodeURIComponent(url)}&w=64&q=75` : undefined);

type TypeKey = "blogs" | "events" | "portfolio" | "services" | "promotions";
const TYPES: Record<TypeKey, { label: string; one: string; many: string; list: string }> = {
	blogs: { label: "Blogs", one: "post", many: "posts", list: "/blogs" },
	events: { label: "Events", one: "event", many: "events", list: "/events" },
	portfolio: { label: "Portfolio", one: "project", many: "projects", list: "/portfolio" },
	services: { label: "Services", one: "service", many: "services", list: "/services" },
	promotions: { label: "Promotions", one: "offer", many: "offers", list: "/promotions" },
};

/**
 * Homepage section: the constellation from the coming-soon page, built from live content.
 * Categories are the content types, tiles are real posts/events/projects/services/offers (title, cover,
 * a short detail line, link), and items that share a tag are joined by faint threads.
 */
export async function HomeConstellation() {
	const [blogs, upcoming, past, portfolio, services, promotions] = await Promise.all([
		safe(getPublishedBlogs(1, PER_TYPE), { blogs: [], total: 0 }),
		safe(getPublicEvents("upcoming", 1, PER_TYPE), { events: [], total: 0 }),
		safe(getPublicEvents("past", 1, 4), { events: [], total: 0 }),
		safe(getPublicPortfolios(undefined, 1, PER_TYPE), { portfolios: [], total: 0 }),
		safe(getPublicServices(undefined, 1, PER_TYPE), { services: [], total: 0 }),
		safe(getPublicPromotions("current", 1, PER_TYPE), { promotions: [], total: 0 }),
	]);

	type Entry = Omit<ConstellationItem, "hub" | "links"> & { hub: TypeKey; tags: string[] };
	const entries: Entry[] = [
		...blogs.blogs.map((b) => ({ hub: "blogs" as const, title: b.title, note: formatDate(b.published_at), image: thumb(b.cover_image_url), href: `/blogs/${b.slug}`, tags: b.tags })),
		// Upcoming first; a few recent past events keep the cluster alive between seasons.
		...[...upcoming.events, ...past.events].slice(0, PER_TYPE).map((e) => ({
			hub: "events" as const,
			title: e.title,
			note: [formatDayRange(e.starts_at, e.ends_at), e.venue_name].filter(Boolean).join(" · "),
			image: thumb(e.cover_image_url),
			href: `/events/${e.slug}`,
			tags: e.tags,
		})),
		...portfolio.portfolios.map((p) => ({
			hub: "portfolio" as const,
			title: p.title,
			note: [p.location, p.completed_on?.slice(0, 4)].filter(Boolean).join(" · ") || undefined,
			image: thumb(portfolioCover(p)?.url),
			href: `/portfolio/${p.slug}`,
			tags: p.tags,
		})),
		...services.services.map((s) => ({ hub: "services" as const, title: s.title, note: s.price_label || s.category || undefined, image: thumb(s.cover_image_url), href: `/services/${s.slug}`, tags: s.tags })),
		...promotions.promotions.map((p) => ({
			hub: "promotions" as const,
			title: p.title,
			note: [p.discount_label, p.ends_at ? `until ${formatDate(p.ends_at, { month: "short", day: "numeric" })}` : null].filter(Boolean).join(" · ") || undefined,
			image: thumb(p.cover_image_url),
			href: `/promotions/${p.slug}`,
			tags: p.tags,
		})),
	];
	if (entries.length === 0) return null;

	// Items that share a tag are joined by a faint thread (one per pair, however many tags they share).
	const items: ConstellationItem[] = entries.map((e, i) => {
		const mine = new Set(e.tags.map((t) => t.toLowerCase()));
		const links = entries
			.map((other, j) => (j > i && other.tags.some((t) => mine.has(t.toLowerCase())) ? `e${j}` : null))
			.filter((id): id is string => id !== null);
		return { ...e, id: `e${i}`, links };
	});

	const totals: Record<TypeKey, number> = {
		blogs: blogs.total,
		events: upcoming.total + past.total,
		portfolio: portfolio.total,
		services: services.total,
		promotions: promotions.total,
	};
	const colors: Record<TypeKey, ConstellationHub["color"]> = { blogs: "leaf", events: "blue", portfolio: "orange", services: "red", promotions: "sun" };
	const hubs: ConstellationHub[] = (Object.keys(TYPES) as TypeKey[])
		.filter((k) => entries.some((e) => e.hub === k))
		.map((k) => ({ id: k, label: TYPES[k].label, color: colors[k], count: totals[k] }));

	return (
		<Constellation
			variant="section"
			hubs={hubs}
			items={items}
			titleId="constellation-title"
			title="Everything, connected"
			lede="Stories, events, projects, services and offers from our community, linked by the tags they share. Open it, then hover a category."
			label={`Map of Merkado PH content: ${hubs.map((h) => `${h.label} (${h.count})`).join(", ")}`}
		/>
	);
}
