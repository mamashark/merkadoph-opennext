import Image from "next/image";
import Link from "next/link";
import { ANNOUNCEMENT_TAG, getPublishedBlogs, PINNED_BLOG_TITLE, getPublishedBlogByTitle, type BlogSummary } from "@/lib/blogs";
import { getPublicEvents, type EventSummary } from "@/lib/events";
import { getPublicPortfolios, portfolioCover, type PortfolioSummary } from "@/lib/portfolio";
import { getPublicPromotions, type PromotionSummary } from "@/lib/promotions";
import { getPublicServiceBySlug, getPublicServices, type Service, type ServiceSummary } from "@/lib/services";
import { BUSINESSES, type Business, type BusinessId } from "@/lib/businesses";
import { BYGG } from "@/lib/bygg-content";
import { TAHOOO } from "@/lib/tahooo-content";
import { formatDate, formatDayRange } from "@/lib/datetime";
import { toPlainText } from "@/lib/content";
import { getSeoSettings, localBusinessDetails } from "@/lib/site-settings";
import { SITE_URL } from "@/lib/env";
import { SiteShell } from "@/components/site/site-shell";
import { JsonLd } from "@/components/site/json-ld";
import { ContactForm } from "@/components/home/contact-form";
import { plexMono } from "@/components/constellation/fonts";
import type { ConstellationColor, ConstellationHub, ConstellationItem } from "@/components/constellation/types";
import { HighlightsStage } from "./highlights-stage";
import type { WorldInfo } from "./highlights-world";
import { ChipFilter } from "./chip-filter";
import styles from "./highlights.module.css";

/** The old shop now lives here. */
const GROCERY_URL = "https://phasianmarket.se";

/** Tiles per category in the graph; the sections show the first few. */
const PER_TYPE = 10;
/** Tags used for housekeeping, never shown as a category. */
const HIDDEN_TAGS = new Set(["sample", ANNOUNCEMENT_TAG.toLowerCase()]);

const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
/** A small, optimized cover for a 28px tile (Next image optimizer; 64px covers 2× screens). */
const thumb = (url: string | null | undefined) => (url ? `/_next/image?url=${encodeURIComponent(url)}&w=64&q=75` : undefined);
const firstTag = (tags: string[] | null | undefined) => (tags ?? []).find((t) => !HIDDEN_TAGS.has(t.toLowerCase()));
const shownTags = (tags: string[] | null | undefined) => (tags ?? []).filter((t) => !HIDDEN_TAGS.has(t.toLowerCase()));
/** First word of a title, as the big letters on a cover without a photo. */
const glyph = (title: string) => (title.split(/[\s:—-]+/).find((w) => w.length > 3) ?? title).slice(0, 10);
/** Excerpts can carry Markdown (e.g. imported posts); cards show plain text. */
const plain = (s: string | null | undefined) => (s ? toPlainText(s) : "");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Short excerpt for the preview panel inside a Highlight. */
const clip = (s: string | null | undefined, n = 240) => {
	const t = plain(s);
	return t.length > n ? `${t.slice(0, t.lastIndexOf(" ", n - 1) > n * 0.6 ? t.lastIndexOf(" ", n - 1) : n - 1).trimEnd()}…` : t;
};

type WorldId = "blogs" | "events" | "impact" | BusinessId | "tahooo" | "bulletin";
type World = { id: WorldId; label: string; sub: string; color: ConstellationColor; count: number; list: string; dots: number; allLabel: string; cta: string };

/** Events in the sky: what's coming up; when nothing is, the most recent ones (the rest are in the /events archive). */
const RECENT_EVENTS = 5;

/** One thing a business offers, as the homepage shows it (tile, preview, card). */
type Offering = { id: string; slug: string; title: string; excerpt: string; image?: string; imageAlt: string; price?: string; tags: string[]; href: string };
type Biz = { b: Business; excerpt: string; cover?: string; coverAlt: string; offerings: Offering[] };
const fromService = (s: ServiceSummary): Offering => ({
	id: s.id,
	slug: s.slug,
	title: s.title,
	excerpt: s.excerpt ?? "",
	image: s.cover_image_url ?? undefined,
	imageAlt: s.cover_image_alt || "",
	price: s.price_label || undefined,
	tags: shownTags(s.tags),
	href: `/services/${s.slug}`,
});

export async function HighlightsHome() {
	const [blogsRes, pinned, notices, upcoming, past, portfolio, digitalMain, digitalList, promotions, seo] = await Promise.all([
		safe(getPublishedBlogs(1, PER_TYPE), { blogs: [] as BlogSummary[], total: 0 }),
		safe(getPublishedBlogByTitle(PINNED_BLOG_TITLE), null),
		safe(getPublishedBlogs(1, 6, { tag: ANNOUNCEMENT_TAG }), { blogs: [] as BlogSummary[], total: 0 }),
		safe(getPublicEvents("upcoming", 1, PER_TYPE), { events: [] as EventSummary[], total: 0 }),
		safe(getPublicEvents("past", 1, RECENT_EVENTS), { events: [] as EventSummary[], total: 0 }),
		safe(getPublicPortfolios(undefined, 1, PER_TYPE), { portfolios: [] as PortfolioSummary[], total: 0 }),
		safe(getPublicServiceBySlug(BUSINESSES.digital.slug), null),
		safe(getPublicServices(BUSINESSES.digital.category, 1, PER_TYPE), { services: [] as ServiceSummary[], total: 0 }),
		safe(getPublicPromotions("current", 1, 4), { promotions: [] as PromotionSummary[], total: 0 }),
		getSeoSettings(),
	]);

	// Stories: the pinned post first; notices live on the Bulletin Board.
	const noticeIds = new Set(notices.blogs.map((b) => b.id));
	const stories = (pinned ? [pinned, ...blogsRes.blogs.filter((b) => b.id !== pinned.id)] : blogsRes.blogs).filter((b) => !noticeIds.has(b.id));
	const live = upcoming.events.length > 0;
	const events = live ? upcoming.events : past.events;
	// Each business: its main service (the page's text) and its offerings (same category).
	// Bygg is a fixed Swedish page (src/lib/bygg-content.ts); Digital comes from Admin → Services.
	const biz: Record<BusinessId, Biz> = {
		bygg: {
			b: BUSINESSES.bygg,
			excerpt: BYGG.intro,
			cover: BYGG.hero.src,
			coverAlt: BYGG.hero.alt,
			offerings: BYGG.services.map((s) => ({ id: s.slug, slug: s.slug, title: s.title, excerpt: s.text, image: s.image.src, imageAlt: s.image.alt, tags: [], href: `${BUSINESSES.bygg.path}#${s.slug}` })),
		},
		digital: {
			b: BUSINESSES.digital,
			excerpt: plain(digitalMain?.excerpt) || BUSINESSES.digital.intro,
			cover: digitalMain?.cover_image_url ?? undefined,
			coverAlt: digitalMain?.cover_image_alt || "",
			offerings: digitalList.services.filter((s) => s.slug !== BUSINESSES.digital.slug).map(fromService),
		},
	};
	const offerings = [...biz.bygg.offerings, ...biz.digital.offerings];

	const worlds: World[] = (
		[
			{ id: "blogs", allLabel: "All stories", cta: "Read the full story", label: "Blogs", sub: "Stories from Merkado PH and our community", color: "leaf", count: blogsRes.total - notices.total, list: "/blogs", dots: 18, has: stories.length },
			{
				id: "events",
				allLabel: live ? "All events" : "Events archive",
				cta: "Event details",
				label: "Events",
				sub: live ? "Community and cultural events, pop-ups, festivals" : "Our most recent events",
				color: "red",
				count: live ? upcoming.total : past.total,
				list: live ? "/events" : "/events?when=past",
				dots: 10,
				has: events.length,
			},
			{ id: "impact", allLabel: "All projects", cta: "View the project", label: "Community Impact", sub: "Projects that brought people together", color: "sun", count: portfolio.total, list: "/impact", dots: 14, has: portfolio.portfolios.length },
			// The two businesses always show: their page is worth visiting even before offerings are listed.
			{ id: "bygg", allLabel: `Visit ${BUSINESSES.bygg.name}`, cta: "Read more", label: BUSINESSES.bygg.name, sub: "Construction by Tindero Pedro", color: "orange", count: biz.bygg.offerings.length + 1, list: BUSINESSES.bygg.path, dots: 8, has: 1 },
			{ id: "digital", allLabel: `Visit ${BUSINESSES.digital.name}`, cta: "Read more", label: BUSINESSES.digital.name, sub: "Websites, webshops and branding", color: "blue", count: biz.digital.offerings.length + 1, list: BUSINESSES.digital.path, dots: 8, has: 1 },
			{ id: "tahooo", allLabel: "Visit Tahooo Corner", cta: "Read more", label: TAHOOO.name, sub: "Taho for your event in Gothenburg", color: "caramel", count: TAHOOO.flavours.length + 1, list: "/tahooo", dots: 6, has: 1 },
			{ id: "bulletin", allLabel: "Bulletin Board", cta: "Read more", label: "Bulletin Board", sub: "Embassy news, notices and offers", color: "coral", count: notices.total + promotions.total, list: "/bulletin", dots: 6, has: notices.blogs.length + promotions.promotions.length },
		] as (World & { has: number })[]
	)
		.filter((w) => w.has > 0)
		.map(({ has: _has, ...w }) => ({ ...w, count: Math.max(w.count, _has) }));
	const W = Object.fromEntries(worlds.map((w, i) => [w.id, { ...w, n: String(i + 1).padStart(2, "0") }])) as Partial<Record<WorldId, World & { n: string }>>;

	/* ------------------------- Graph: hubs + tiles ------------------------- */

	/** A graph tile plus what the Highlight's preview panel shows. */
	type Entry = Omit<ConstellationItem, "links"> & { id: string; tags: string[]; slug: string; excerpt: string; cover?: string; coverAlt: string };
	const offeringEntry = (hub: BusinessId) => (o: Offering): Entry => ({
		id: `service-${o.slug}`,
		hub,
		title: o.title,
		note: o.price,
		image: thumb(o.image),
		href: o.href,
		tags: o.tags,
		slug: o.slug,
		excerpt: clip(o.excerpt),
		cover: o.image,
		coverAlt: o.imageAlt,
	});
	const businessEntries = (id: BusinessId): Entry[] => {
		const { b, excerpt, cover, coverAlt, offerings: list } = biz[id];
		return [
			{ id: `business-${id}`, hub: id, title: b.name, note: b.eyebrow, image: thumb(cover), href: b.path, tags: [], slug: `${id}-page`, excerpt: clip(excerpt), cover, coverAlt },
			...list.map(offeringEntry(id)),
		];
	};
	const entries: Entry[] = [
		...stories.map((b) => ({
			id: `blog-${b.slug}`,
			hub: "blogs",
			title: b.title,
			note: [firstTag(b.tags) && cap(firstTag(b.tags)!), formatDate(b.published_at)].filter(Boolean).join(" · "),
			image: thumb(b.cover_image_url),
			href: `/blogs/${b.slug}`,
			tags: shownTags(b.tags),
			slug: b.slug,
			excerpt: clip(b.excerpt),
			cover: b.cover_image_url ?? undefined,
			coverAlt: b.cover_image_alt || "",
		})),
		...events.map((e) => ({
			id: `event-${e.slug}`,
			hub: "events",
			title: e.title,
			note: [formatDayRange(e.starts_at, e.ends_at), e.venue_name].filter(Boolean).join(" · "),
			image: thumb(e.cover_image_url),
			href: `/events/${e.slug}`,
			tags: shownTags(e.tags),
			slug: e.slug,
			excerpt: clip(e.excerpt),
			cover: e.cover_image_url ?? undefined,
			coverAlt: e.cover_image_alt || "",
		})),
		...portfolio.portfolios.map((p) => ({
			id: `project-${p.slug}`,
			hub: "impact",
			title: p.title,
			note: [p.completed_on?.slice(0, 4), p.location].filter(Boolean).join(" · ") || undefined,
			image: thumb(portfolioCover(p)?.url),
			href: `/impact/${p.slug}`,
			tags: shownTags(p.tags),
			slug: p.slug,
			excerpt: clip(p.excerpt),
			cover: portfolioCover(p)?.url,
			coverAlt: portfolioCover(p)?.alt ?? "",
		})),
		...businessEntries("bygg"),
		...businessEntries("digital"),
		// Tahooo Corner: the page (cart photo), then each flavour on the menu.
		{
			id: "tahooo-page",
			hub: "tahooo",
			title: TAHOOO.name,
			note: TAHOOO.brand,
			image: thumb(TAHOOO.cart.src),
			href: "/tahooo",
			tags: ["Tahooo"],
			slug: "tahooo-page",
			excerpt: `${TAHOOO.tagline.en} ${TAHOOO.whatIsTaho}`,
			cover: TAHOOO.cart.src,
			coverAlt: TAHOOO.cart.alt,
		},
		...TAHOOO.flavours.map((f) => ({
			id: `taho-${f.id}`,
			hub: "tahooo",
			title: f.en === f.sv ? f.sv : `${f.sv} · ${f.en}`,
			note: `${TAHOOO.sizes} · ${TAHOOO.allergens.en}`,
			href: `/tahooo#${f.id}`,
			tags: [],
			slug: f.id,
			excerpt: "",
			coverAlt: "",
			shape: "dot" as const,
		})),
		...notices.blogs.map((b) => ({
			id: `notice-${b.slug}`,
			hub: "bulletin",
			title: b.title,
			note: [b.author_name || "Merkado PH", b.published_at && formatDate(b.published_at, { month: "short", year: "numeric" })].filter(Boolean).join(" · "),
			image: thumb(b.cover_image_url),
			href: `/blogs/${b.slug}`,
			tags: shownTags(b.tags),
			slug: b.slug,
			excerpt: clip(b.excerpt),
			cover: b.cover_image_url ?? undefined,
			coverAlt: b.cover_image_alt || "",
		})),
		...promotions.promotions.map((p) => ({
			id: `promo-${p.slug}`,
			hub: "bulletin",
			title: p.title,
			note: ["Offer", p.discount_label, p.ends_at ? `until ${formatDate(p.ends_at, { month: "short", day: "numeric" })}` : null].filter(Boolean).join(" · "),
			image: thumb(p.cover_image_url),
			href: `/promotions/${p.slug}`,
			tags: shownTags(p.tags),
			slug: `offer-${p.slug}`,
			excerpt: clip(p.excerpt),
			cover: p.cover_image_url ?? undefined,
			coverAlt: p.cover_image_alt || "",
		})),
	];
	// Items that share a tag are joined by a faint thread (one per pair).
	const items: ConstellationItem[] = entries.map(({ slug: _s, excerpt: _e, cover: _c, coverAlt: _a, ...e }, i) => {
		const mine = new Set(e.tags.map((t) => t.toLowerCase()));
		const links = entries.slice(i + 1).filter((o) => o.tags.some((t) => mine.has(t.toLowerCase()))).map((o) => o.id);
		return { ...e, links };
	});
	// What you see when you zoom into a Highlight.
	const worldInfo: WorldInfo[] = worlds.map((w) => ({
		id: w.id,
		n: W[w.id]!.n,
		label: w.label,
		sub: w.sub,
		color: w.color,
		count: w.count,
		list: w.list,
		allLabel: w.allLabel,
		cta: w.cta,
		entries: entries
			.filter((e) => e.hub === w.id)
			.map((e) => ({ slug: e.slug, itemId: e.id, title: e.title, note: e.note || undefined, thumb: e.image, cover: e.cover, coverAlt: e.coverAlt, excerpt: e.excerpt, href: e.href!, tags: e.tags })),
	}));
	const hubs: ConstellationHub[] = worlds.map((w) => ({ id: w.id, label: w.label, color: w.color, count: w.count, dots: w.dots, description: w.sub }));
	const label = `Highlights of Merkado PH: ${worlds.map((w) => `${w.label} (${w.count})`).join(", ")}. The same content is listed below.`;

	/* ------------------------------ Markup ------------------------------ */

	const style = (w: World | undefined) => ({ "--c": `var(--${w?.color ?? "sun"})`, "--c-fill": `var(--${w?.color ?? "sun"}-fill)` }) as React.CSSProperties;
	const head = (id: WorldId, title: React.ReactNode, body: string, allLabel: string, bodyLang?: string) => {
		const w = W[id]!;
		return (
			<div className={styles.worldHead}>
				<div>
					<span className={`${styles.kicker} ${styles.mono}`}>
						{w.n} — {w.label}
					</span>
					<h2 id={`${id}-title`} tabIndex={-1}>
						{title}
					</h2>
					<p lang={bodyLang}>{body}</p>
				</div>
				<div className={styles.worldLinks}>
					<Link href={w.list} className={`${styles.back} ${styles.all} ${styles.mono}`}>
						{allLabel} →
					</Link>
					<a href="#top" data-back={id} className={`${styles.back} ${styles.mono}`}>
						↖ Back to highlights
					</a>
				</div>
			</div>
		);
	};
	const cover = (url: string | null | undefined, alt: string, sizes: string, g?: string, i = 0) =>
		url ? (
			<div className={styles.cover}>
				<Image src={url} alt={alt} fill sizes={sizes} />
			</div>
		) : (
			<div className={`${styles.cover} ${styles.weave}`} style={{ "--c": `var(--${(["sun", "red", "blue", "leaf"] as const)[i % 4]})` } as React.CSSProperties} aria-hidden="true">
				{g && <span className={styles.glyph}>{g}</span>}
			</div>
		);

	const storyCats = Array.from(new Set(stories.slice(0, 5).map((b) => firstTag(b.tags)).filter((t): t is string => !!t))).map(cap);

	return (
		<SiteShell contactHref="#contact" tone="night" revealAt="index">
			<JsonLd
				data={{
					"@context": "https://schema.org",
					"@type": ["LocalBusiness", "RoofingContractor"],
					"@id": `${SITE_URL}/#business`,
					name: seo.business_name,
					url: SITE_URL,
					logo: `${SITE_URL}/android-chrome-512x512.png`,
					description: seo.site_description,
					parentOrganization: { "@id": `${SITE_URL}/#organization` },
					...localBusinessDetails(seo),
					knowsAbout: [BUSINESSES.bygg.name, BUSINESSES.digital.name, ...offerings.map((s) => s.title)],
				}}
			/>
			<main className={`${styles.root} ${plexMono.variable}`} aria-labelledby="hero-title">
				<HighlightsStage
					hubs={hubs}
					items={items}
					eyebrow="Est. 2023 · Gothenburg"
					title="Merkado PH"
					lede="The store has a new home. This is what comes next: Filipino culture, festivals and pop-ups, and three years of stories from our community."
					label={label}
					worlds={worldInfo}
				/>

				{/* About + index */}
				<section className={styles.about} id="index" aria-labelledby="about-title">
					<div className={styles.wrap}>
						<p className={styles.eyebrow}>Mabuhay · Välkommen</p>
						<h2 id="about-title">
							Everything <em>Filipino</em>, from Gothenburg.
						</h2>
						<p className={styles.aboutLede}>
							Merkado PH started as a Filipino grocery in 2023. The shop now lives on at{" "}
							<a href={GROCERY_URL} rel="noopener">
								PH Asian Market
							</a>{" "}
							— this is where the community, the stories and the celebrations continue.
						</p>
						<dl className={styles.stats}>
							<div>
								<dt>Merkado PH founded in Gothenburg</dt>
								<dd>2023</dd>
							</div>
							<div>
								<dt>Stories about Filipino culture</dt>
								<dd>{W.blogs?.count ?? 0}</dd>
							</div>
							<div>
								<dt>Highlights to explore</dt>
								<dd>{worlds.length}</dd>
							</div>
						</dl>
						{worlds.length > 0 && (
							<ol className={styles.index}>
								{worlds.map((w) => (
									<li key={w.id}>
										<a href={`#${w.id}`} data-dive={w.id} style={style(w)}>
											<span className={`${styles.indexNum} ${styles.mono}`}>{W[w.id]!.n}</span>
											<span className={styles.indexTitle}>
												<i aria-hidden="true" />
												{w.label}
												<sup>{w.count}</sup>
											</span>
											<span className={styles.indexDesc}>{w.sub}</span>
										</a>
									</li>
								))}
							</ol>
						)}
					</div>
				</section>

				{/* Blogs */}
				{W.blogs && (
					<section className={styles.world} id="blogs" aria-labelledby="blogs-title" style={style(W.blogs)}>
						<div className={`${styles.wrap} ${styles.zoom}`}>
							{head(
								"blogs",
								<>
									Mga <em>Kuwento</em>
								</>,
								"Food, faith, fiestas and family — stories about Filipino life, at home and in Sweden.",
								"All stories",
							)}
							{storyCats.length > 1 && <ChipFilter categories={storyCats} target="blog-grid" label="Filter stories" />}
							<div className={styles.blogGrid} id="blog-grid">
								{stories.slice(0, 5).map((b, i) => {
									const cat = firstTag(b.tags);
									return (
										<article
											key={b.id}
											className={`${styles.post} ${styles.card} ${i === 0 ? styles.feature : ""}`}
											style={{ "--i": i } as React.CSSProperties}
											data-reveal=""
											data-key={`blog-${b.slug}`}
											data-cat={cat ? cap(cat) : ""}
										>
											{cover(b.cover_image_url, b.cover_image_alt || "", i === 0 ? "(max-width: 1000px) 100vw, 640px" : "(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 420px", glyph(b.title), i)}
											<div className={styles.postBody}>
												<div className={`${styles.meta} ${styles.mono}`}>
													{cat && <span>{cap(cat)}</span>}
													{b.published_at && <time dateTime={b.published_at}>{formatDate(b.published_at)}</time>}
												</div>
												<h3>
													<Link href={`/blogs/${b.slug}`} className={styles.stretch}>
														{b.title}
													</Link>
												</h3>
												{plain(b.excerpt) && <p>{plain(b.excerpt)}</p>}
												<span className={`${styles.more} ${styles.mono}`} aria-hidden="true">
													Read story →
												</span>
											</div>
										</article>
									);
								})}
							</div>
						</div>
					</section>
				)}

				{/* Events */}
				{W.events && (
					<section className={styles.world} id="events" aria-labelledby="events-title" style={style(W.events)}>
						<div className={`${styles.wrap} ${styles.zoom}`}>
							{head(
								"events",
								<>
									Pista &amp; <em>pop-ups</em>
								</>,
								live ? "Community and cultural events, pop-ups and festivals with Merkado PH and friends." : "No events coming up right now. These are our most recent ones; follow the Bulletin Board for news.",
								live ? "All events" : "Events archive",
							)}
							<div className={styles.events}>
								{events.slice(0, 4).map((e, i) => (
									<article key={e.id} className={styles.event} style={{ "--i": i } as React.CSSProperties} data-reveal="" data-key={`event-${e.slug}`}>
										<time className={styles.date} dateTime={e.starts_at}>
											{formatDate(e.starts_at, { day: "numeric" })}
											<small className={styles.mono}>{formatDate(e.starts_at, { month: "short", year: "numeric" })}</small>
										</time>
										<div>
											<h3>{e.title}</h3>
											{plain(e.excerpt) && <p>{plain(e.excerpt)}</p>}
											<span className={`${styles.where} ${styles.mono}`}>{[formatDayRange(e.starts_at, e.ends_at), e.venue_name].filter(Boolean).join(" · ")}</span>
										</div>
										<Link href={`/events/${e.slug}`} className={styles.btn} aria-label={`Details: ${e.title}`}>
											Details
										</Link>
									</article>
								))}
							</div>
						</div>
					</section>
				)}

				{/* Community Impact */}
				{W.impact && (
					<section className={styles.world} id="impact" aria-labelledby="impact-title" style={style(W.impact)}>
						<div className={`${styles.wrap} ${styles.zoom}`}>
							{head(
								"impact",
								<>
									Sama-<em>sama</em>
								</>,
								"Projects with impact: events and initiatives that brought the community together.",
								"All projects",
							)}
							<div className={styles.timeline}>
								{portfolio.portfolios
									.slice(0, 4)
									// A timeline: oldest first.
									.sort((a, b) => (a.completed_on ?? "9999").localeCompare(b.completed_on ?? "9999"))
									.map((p, i) => (
										<article key={p.id} className={`${styles.year} ${styles.card}`} style={{ "--i": i } as React.CSSProperties} data-reveal="" data-key={`project-${p.slug}`}>
											<b aria-hidden={!p.completed_on}>{p.completed_on?.slice(0, 4) ?? "—"}</b>
											<h3>
												<Link href={`/impact/${p.slug}`} className={styles.stretch}>
													{p.title}
												</Link>
											</h3>
											{plain(p.excerpt) && <p>{plain(p.excerpt)}</p>}
											{p.location && <span className={`${styles.tag} ${styles.mono}`}>{p.location}</span>}
										</article>
									))}
							</div>
						</div>
					</section>
				)}

				{/* The two businesses: Merkado Byggnadsavdelning (Swedish page) and Merkado PH Digital */}
				{(["bygg", "digital"] as const).map((id) => {
					const w = W[id];
					const { b, excerpt, offerings: list } = biz[id];
					if (!w) return null;
					return (
						<section key={id} className={styles.world} id={id} aria-labelledby={`${id}-title`} style={style(w)}>
							<div className={`${styles.wrap} ${styles.zoom}`}>
								{head(
									id,
									id === "bygg" ? (
										<>
											Merkado{" "}
											<em lang="sv" className={styles.long}>
												Byggnadsavdelning
											</em>
										</>
									) : (
										<>
											Merkado PH <em>Digital</em>
										</>
									),
									excerpt,
									w.allLabel,
									b.lang === "en" ? undefined : b.lang,
								)}
								{list.length > 0 && (
									<div className={styles.services} lang={b.lang === "en" ? undefined : b.lang}>
										{list.slice(0, 4).map((s, i) => {
											const chips = [s.price, ...s.tags.map(cap)].filter((c, j, a): c is string => !!c && a.indexOf(c) === j).slice(0, 3);
											return (
												<article key={s.id} className={`${styles.service} ${styles.card}`} style={{ "--i": i } as React.CSSProperties} data-reveal="" data-key={`service-${s.slug}`}>
													<span className={`${styles.num} ${styles.mono}`}>{String(i + 1).padStart(2, "0")}</span>
													<h3>
														<Link href={s.href} className={styles.stretch}>
															{s.title}
														</Link>
													</h3>
													{plain(s.excerpt) && <p>{plain(s.excerpt)}</p>}
													{chips.length > 0 && (
														<ul>
															{chips.map((c) => (
																<li key={c}>{c}</li>
															))}
														</ul>
													)}
												</article>
											);
										})}
									</div>
								)}
							</div>
						</section>
					);
				})}

				{/* Tahooo Corner */}
				{W.tahooo && (
					<section className={styles.world} id="tahooo" aria-labelledby="tahooo-title" style={style(W.tahooo)}>
						<div className={`${styles.wrap} ${styles.zoom}`}>
							{head(
								"tahooo",
								<>
									Tahooo <em>Corner</em>
								</>,
								`${TAHOOO.tagline.en} Book the taho cart for birthdays, weddings, baptisms, community and company events in ${TAHOOO.area}.`,
								W.tahooo.allLabel,
							)}
							<div className={styles.services}>
								<article className={`${styles.service} ${styles.card}`} data-key="tahooo-menu">
									<span className={`${styles.num} ${styles.mono}`}>01</span>
									<h3>
										<Link href="/tahooo#meny" className={styles.stretch}>
											The menu
										</Link>
									</h3>
									<p>{TAHOOO.whatIsTaho.split(". ")[0]}.</p>
									<ul lang="sv">
										{TAHOOO.flavours.map((f) => (
											<li key={f.id}>{f.sv}</li>
										))}
									</ul>
								</article>
								<article className={`${styles.service} ${styles.card}`} data-key="tahooo-book">
									<span className={`${styles.num} ${styles.mono}`}>02</span>
									<h3>
										<Link href="/tahooo#boka" className={styles.stretch}>
											Book the cart
										</Link>
									</h3>
									<p>We bring the cart and serve fresh taho at your event in {TAHOOO.area}.</p>
									<ul>
										{TAHOOO.occasions.map((o) => (
											<li key={o}>{o}</li>
										))}
									</ul>
								</article>
							</div>
						</div>
					</section>
				)}

				{/* Bulletin Board: notices (posts tagged "Announcement") and current partner offers */}
				{W.bulletin && (
					<section className={styles.world} id="bulletin" aria-labelledby="bulletin-title" style={style(W.bulletin)}>
						<div className={`${styles.wrap} ${styles.zoom}`}>
							{head(
								"bulletin",
								<>
									Mga <em>Paalala</em>
								</>,
								"News from the Philippine Embassy in Sweden, community notices and offers from friends of Merkado PH.",
								"Bulletin Board",
							)}
							{notices.blogs.length > 0 && (
								<div className={styles.notices}>
									{notices.blogs.slice(0, 3).map((b, i) => (
										<article key={b.id} className={`${styles.notice} ${styles.card}`} style={{ "--i": i } as React.CSSProperties} data-reveal="" data-key={`notice-${b.slug}`}>
											<div className={`${styles.src} ${styles.mono}`}>
												<span>{b.author_name || "Merkado PH"}</span>
												{b.published_at && <time dateTime={b.published_at}>{formatDate(b.published_at, { month: "short", year: "numeric" })}</time>}
											</div>
											<h3>
												<Link href={`/blogs/${b.slug}`} className={styles.stretch}>
													{b.title}
												</Link>
											</h3>
											{plain(b.excerpt) && <p>{plain(b.excerpt)}</p>}
											<span className={`${styles.badge} ${styles.mono}`}>{cap(firstTag(b.tags) ?? "Notice")}</span>
										</article>
									))}
								</div>
							)}
							{promotions.promotions.length > 0 && (
								<div className={styles.promos}>
									{(() => {
										const card = (p: PromotionSummary, i: number) => (
											<article key={p.id} className={styles.promo} style={{ "--i": i } as React.CSSProperties} data-reveal="" data-key={`promo-offer-${p.slug}`}>
												{cover(p.cover_image_url, p.cover_image_alt || "", i === 0 ? "(max-width: 860px) 100vw, 760px" : "(max-width: 860px) 100vw, 540px", undefined, i + 1)}
												<span className={styles.scrim} aria-hidden="true" />
												<span className={`${styles.promoKicker} ${styles.mono}`}>{p.discount_label || "Offer"}</span>
												<h3>
													<Link href={`/promotions/${p.slug}`} className={styles.stretch}>
														{p.title}
													</Link>
												</h3>
												{plain(p.excerpt) && <p>{plain(p.excerpt)}</p>}
												{i === 0 && (
													<span className={`${styles.btn} ${styles.promoCta}`} aria-hidden="true">
														{p.ends_at ? `Until ${formatDate(p.ends_at, { month: "short", day: "numeric" })}` : "View offer"} →
													</span>
												)}
											</article>
										);
										const [first, ...rest] = promotions.promotions.slice(0, 3);
										return (
											<>
												{card(first!, 0)}
												{rest.length > 0 && <div className={styles.promoStack}>{rest.map((p, i) => card(p, i + 1))}</div>}
											</>
										);
									})()}
								</div>
							)}
						</div>
					</section>
				)}

				{/* Contact (the business pages' default button links to /#contact) */}
				<section className={styles.contact} id="contact" aria-labelledby="contact-title">
					<div className={`${styles.wrap} ${styles.contactGrid}`}>
						<div>
							<p className={styles.eyebrow}>Kumusta?</p>
							<h2 id="contact-title">
								Get in <em>touch</em>.
							</h2>
							<p className={styles.aboutLede}>
								Submit an event, list your business, write for us or ask a question. We usually reply within 1–2 business days — in English, Filipino or Swedish.
							</p>
						</div>
						<div className={styles.form}>
							<ContactForm topics={[BUSINESSES.bygg.name, BUSINESSES.digital.name, ...offerings.map((s) => s.title)]} />
						</div>
					</div>
				</section>

				<section className={styles.signoff} aria-label="Sign-off">
					<div className={`${styles.wrap} ${styles.signoffRow}`}>
						<div>
							<p className={styles.signoffTitle}>Salamat, kababayan.</p>
							<p>Merkado PH · Gothenburg, Sweden</p>
						</div>
						<p>
							<a href={GROCERY_URL} rel="noopener">
								Groceries → PH Asian Market ↗
							</a>
						</p>
					</div>
				</section>
			</main>
		</SiteShell>
	);
}
