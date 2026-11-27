import Image from "next/image";
import Link from "next/link";
import { ANNOUNCEMENT_TAG, getPublishedBlogs, PINNED_BLOG_TITLE, getPublishedBlogByTitle, type BlogSummary } from "@/lib/blogs";
import { getPublicEvents, type EventSummary } from "@/lib/events";
import { entryYear, getImpactTimeline, portfolioCover, type PortfolioSummary } from "@/lib/portfolio";
import { getPublicPromotions, type PromotionSummary } from "@/lib/promotions";
import { getHomeBulletin, getPublicBulletin, type BulletinCard } from "@/lib/bulletin";
import { issuedBy, itemPath } from "@/lib/bulletin-shared";
import { BUSINESSES, type Business, type BusinessId } from "@/lib/businesses";
import { HIGHLIGHTS, type HighlightId } from "@/lib/highlights";
import { BYGG } from "@/lib/bygg-content";
import { DIGITAL } from "@/lib/digital-content";
import { TAHOOO, FLAVOUR_RATIO, flavourImage } from "@/lib/tahooo-content";
import { HOME } from "@/lib/home-content";
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
const H = HOME.highlights;
const L = HOME.labels;

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
/** Text from home-content.ts with *stars* around a word: that word becomes the heading's highlighted <em>. */
const emph = (text: string, emProps?: React.HTMLAttributes<HTMLElement>) =>
	text.split(/\*([^*]+)\*/).map((part, i) => (i % 2 ? <em key={i} {...emProps}>{part}</em> : part));
/** Short excerpt for the preview panel inside a Highlight. */
const clip = (s: string | null | undefined, n = 240) => {
	const t = plain(s);
	return t.length > n ? `${t.slice(0, t.lastIndexOf(" ", n - 1) > n * 0.6 ? t.lastIndexOf(" ", n - 1) : n - 1).trimEnd()}…` : t;
};

type WorldId = HighlightId;
type World = { id: WorldId; label: string; sub: string; color: ConstellationColor; count: number; list: string; dots: number; allLabel: string; cta: string };

/** Events in the sky: what's coming up; when nothing is, the most recent ones (the rest are in the /events archive). */
const RECENT_EVENTS = 5;

/** One thing a business offers, as the homepage shows it (tile, preview, card). */
type Offering = { id: string; slug: string; title: string; excerpt: string; image?: string; imageAlt: string; price?: string; tags: string[]; href: string };
type Biz = { b: Business; excerpt: string; cover?: string; coverAlt: string; offerings: Offering[] };

export async function HighlightsHome() {
	const [blogsRes, pinned, notices, noticeCount, upcoming, past, impact, promotions, seo] = await Promise.all([
		safe(getPublishedBlogs(1, PER_TYPE), { blogs: [] as BlogSummary[], total: 0 }),
		safe(getPublishedBlogByTitle(PINNED_BLOG_TITLE), null),
		safe(getHomeBulletin(6), [] as BulletinCard[]),
		safe(getPublicBulletin("", "", 1, 1).then((r) => r.total), 0),
		safe(getPublicEvents("upcoming", 1, PER_TYPE), { events: [] as EventSummary[], total: 0 }),
		safe(getPublicEvents("past", 1, RECENT_EVENTS), { events: [] as EventSummary[], total: 0 }),
		safe(getImpactTimeline(), [] as PortfolioSummary[]),
safe(getPublicPromotions("current", 1, 4), { promotions: [] as PromotionSummary[], total: 0 }),
		getSeoSettings(),
	]);

	// Stories: the pinned post first. Notices are Bulletin Board items (public.bulletin_items, Kay 2026-11-25).
	const stories = pinned ? [pinned, ...blogsRes.blogs.filter((b) => b.id !== pinned.id)] : blogsRes.blogs;
	const live = upcoming.events.length > 0;
	const events = live ? upcoming.events : past.events;
	// Each business: its main service (the page's text) and its offerings (same category).
	// Both are fixed pages: Bygg in Swedish (src/lib/bygg-content.ts), Digital in English (src/lib/digital-content.ts).
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
			excerpt: DIGITAL.lede,
			coverAlt: "",
			offerings: DIGITAL.services.map((s) => ({ id: s.slug, slug: s.slug, title: s.title, excerpt: s.text, imageAlt: "", tags: [], href: `${BUSINESSES.digital.path}#${s.slug}` })),
		},
	};
	const offerings = [...biz.bygg.offerings, ...biz.digital.offerings];

	// Community Impact by year: newest year first; within a year, in calendar order.
	const impactYears = [...new Set(impact.map(entryYear).filter((y): y is string => !!y))];
	const ofYear = (y: string) => impact.filter((p) => entryYear(p) === y).sort((a, b) => (a.completed_on ?? "").localeCompare(b.completed_on ?? ""));
	const yearCover = (y: string) => ofYear(y).map((p) => portfolioCover(p)).find(Boolean)?.url;
	const entriesWord = (n: number) => `${n} ${n === 1 ? "entry" : "entries"}`;

	const worlds: World[] = (
		[
			{ ...HIGHLIGHTS.blogs, count: blogsRes.total, has: stories.length },
			{ ...HIGHLIGHTS.events, ...(live ? {} : HIGHLIGHTS.events.whenEmpty), count: live ? upcoming.total : past.total, has: events.length },
			{ ...HIGHLIGHTS.impact, count: impact.length, has: impactYears.length },
			// The two businesses always show: their page is worth visiting even before offerings are listed.
			{ ...HIGHLIGHTS.bygg, count: biz.bygg.offerings.length + 1, has: 1 },
			{ ...HIGHLIGHTS.digital, count: biz.digital.offerings.length + 1, has: 1 },
			{ ...HIGHLIGHTS.tahooo, count: TAHOOO.flavours.length + 1, has: 1 },
			{ ...HIGHLIGHTS.bulletin, count: noticeCount + promotions.total, has: notices.length + promotions.promotions.length },
		] as (World & { has: number; whenEmpty?: unknown })[]
	)
		.filter((w) => w.has > 0)
		.map(({ has: _has, whenEmpty: _whenEmpty, ...w }) => ({ ...w, count: Math.max(w.count, _has) }));
	const W = Object.fromEntries(worlds.map((w, i) => [w.id, { ...w, n: String(i + 1).padStart(2, "0") }])) as Partial<Record<WorldId, World & { n: string }>>;

	/* ------------------------- Graph: hubs + tiles ------------------------- */

	/** A graph tile plus what the Highlight's preview panel shows. */
	type Entry = Omit<ConstellationItem, "links"> & { id: string; tags: string[]; slug: string; excerpt: string; cover?: string; coverAlt: string; coverRatio?: number; group?: string };
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
		// Community Impact shows its years in the big sky; the entries are inside each year.
		...impactYears.map((y) => ({
			id: `impact-year-${y}`,
			hub: "impact",
			title: y,
			note: entriesWord(ofYear(y).length),
			image: thumb(yearCover(y)),
			href: `/impact?year=${y}`,
			tags: [],
			slug: `year-${y}`,
			excerpt: "",
			coverAlt: "",
		})),
		...businessEntries("bygg"),
		...businessEntries("digital"),
		// Tahooo Corner: the page (cart photo), then each flavour on the menu.
		{
			id: "tahooo-page",
			hub: "tahooo",
			title: TAHOOO.name,
			note: TAHOOO.brand,
			image: thumb(TAHOOO.hero.cart.src),
			href: "/tahooo",
			tags: ["Tahooo"],
			slug: "tahooo-page",
			excerpt: `${TAHOOO.hero.lead.en} ${TAHOOO.howItWorks.line.en}`,
			cover: TAHOOO.hero.cart.src,
			coverAlt: TAHOOO.hero.cart.alt,
			coverRatio: TAHOOO.hero.cart.width / TAHOOO.hero.cart.height,
		},
		// Each flavour, with its photo from the menu.
		...TAHOOO.flavours.map((f) => ({
			id: `taho-${f.id}`,
			hub: "tahooo",
			title: f.name,
			note: f.premium ? `${f.line} · Premium` : f.line,
			image: thumb(flavourImage(f.id)),
			href: `/tahooo#${f.id}`,
			tags: [],
			slug: f.id,
			excerpt: `${f.ingredients.join(", ")}.`,
			cover: flavourImage(f.id),
			coverAlt: `${f.name} taho: ${f.ingredients.join(", ").toLowerCase()}`,
			// Menu photos are portrait: show each one whole in the side panel.
			coverRatio: FLAVOUR_RATIO,
		})),
		...notices.map((b) => ({
			id: `notice-${b.slug}`,
			hub: "bulletin",
			title: b.title,
			note: [b.category.name, b.published_at && formatDate(b.published_at, { month: "short", year: "numeric" })].filter(Boolean).join(" · "),
			image: thumb(b.cover_image_url),
			href: itemPath(b),
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
			note: [L.offer, p.discount_label, p.ends_at ? `${L.until.toLowerCase()} ${formatDate(p.ends_at, { month: "short", day: "numeric" })}` : null].filter(Boolean).join(" · "),
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
	// Inside Community Impact: each year, then that year's entries.
	const impactEntries: Entry[] = impactYears.flatMap((y) =>
		ofYear(y).map((p) => ({
			id: `project-${p.slug}`,
			hub: "impact",
			title: p.title,
			note: [p.completed_on && formatDate(p.completed_on, { day: "numeric", month: "short" }), p.location].filter(Boolean).join(" · ") || undefined,
			image: thumb(portfolioCover(p)?.url),
			href: `/impact/${p.slug}`,
			tags: shownTags(p.tags),
			slug: p.slug,
			excerpt: clip(p.excerpt),
			cover: portfolioCover(p)?.url,
			coverAlt: portfolioCover(p)?.alt ?? "",
			group: y,
		})),
	);
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
		entries: (w.id === "impact" ? impactEntries : entries.filter((e) => e.hub === w.id)).map((e) => ({
			slug: e.slug,
			itemId: e.id,
			title: e.title,
			note: e.note || undefined,
			thumb: e.image,
			cover: e.cover,
			coverAlt: e.coverAlt,
			coverRatio: e.coverRatio,
			group: e.group,
			excerpt: e.excerpt,
			href: e.href!,
			tags: e.tags,
		})),
		...(w.id === "impact" && {
			groupsLabel: H.impact.groupsLabel,
			groups: impactYears.map((y) => ({ slug: y, itemId: `impact-year-${y}`, title: y, note: entriesWord(ofYear(y).length), thumb: thumb(yearCover(y)), href: `/impact?year=${y}` })),
		}),
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
						{L.backToHighlights}
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
		<SiteShell contactHref="#contact" revealAt="index">
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
			<main className={`${styles.root} ${plexMono.variable}`} aria-labelledby="home-title">
				<HighlightsStage
					hubs={hubs}
					items={items}
					chapter={HOME.hero.chapter}
					label={label}
					worlds={worldInfo}
				/>

				{/* About + index */}
				<section className={styles.about} id="index">
					<div className={styles.wrap}>
						{/* The welcome moved here from the hero, which is now the sky and the chapter mark (Kay, 2026-11-25).
						    Same look as before: mono eyebrow, big heading (the page's h1) with a highlighted word, lede. */}
						<p className={styles.eyebrow}>
							<span lang="tl">{HOME.about.greeting.tl}</span> <span lang="sv">{HOME.about.greeting.sv}</span> {HOME.about.greeting.rest}
						</p>
						<h1 id="home-title" className={styles.aboutTitle}>
							{emph(HOME.about.tagline)}
						</h1>
						<p className={styles.aboutLede}>{HOME.about.body}</p>
						<dl className={styles.stats}>
							<div>
								<dt>{HOME.about.stats.founded.label}</dt>
								<dd>{HOME.about.stats.founded.value}</dd>
							</div>
							<div>
								<dt>{HOME.about.stats.stories}</dt>
								<dd>{W.blogs?.count ?? 0}</dd>
							</div>
							<div>
								<dt>{HOME.about.stats.highlights}</dt>
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
								emph(HOME.sections.blogs.heading),
								HOME.sections.blogs.body,
								H.blogs.allLabel,
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
													{L.readStory}
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
								emph(HOME.sections.events.heading),
								live ? HOME.sections.events.body : HOME.sections.events.bodyNoUpcoming,
								live ? H.events.upcoming.allLabel : H.events.past.allLabel,
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
											{L.eventDetails}
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
								emph(HOME.sections.impact.heading),
								HOME.sections.impact.body,
								H.impact.allLabel,
							)}
							<div className={styles.timeline}>
								{/* A timeline of the latest four years, oldest first; each year lists what happened. */}
								{impactYears
									.slice(0, 4)
									.reverse()
									.map((y, i) => {
										const list = ofYear(y);
										return (
											<article key={y} className={`${styles.year} ${styles.card}`} style={{ "--i": i } as React.CSSProperties} data-reveal="" data-key={`impact-year-${y}`}>
												<h3 className={styles.yearHead}>
													<Link href={`/impact?year=${y}`}>
														<b>{y}</b>
														<span className={styles.mono}>{entriesWord(list.length)} →</span>
													</Link>
												</h3>
												<ul className={styles.yearList}>
													{list.slice(0, 5).map((p) => (
														<li key={p.id}>
															<Link href={`/impact/${p.slug}`}>{p.title}</Link>
															{p.completed_on && <span className={styles.mono}>{formatDate(p.completed_on, { day: "numeric", month: "short" })}</span>}
														</li>
													))}
												</ul>
												{list.length > 5 && (
													<Link href={`/impact?year=${y}`} className={`${styles.tag} ${styles.mono}`}>
														+ {list.length - 5} more
													</Link>
												)}
											</article>
										);
									})}
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
									id === "bygg" ? emph(HOME.sections.bygg.heading, { lang: "sv", className: styles.long }) : emph(HOME.sections.digital.heading),
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

				{/* Project Taho (its booking page is Tahooo Corner) */}
				{W.tahooo && (
					<section className={styles.world} id="tahooo" aria-labelledby="tahooo-title" style={style(W.tahooo)}>
						<div className={`${styles.wrap} ${styles.zoom}`}>
							{head(
								"tahooo",
								emph(HOME.sections.tahooo.heading),
								`Tahooo Corner: ${TAHOOO.howItWorks.line.en.toLowerCase()} ${TAHOOO.book.line}`,
								W.tahooo.allLabel,
							)}
							<div className={styles.services}>
								<article className={`${styles.service} ${styles.card}`} data-key="tahooo-menu">
									<span className={`${styles.num} ${styles.mono}`}>01</span>
									<h3>
										<Link href="/tahooo#smaker" className={styles.stretch}>
											{TAHOOO.flavoursIntro.title.en}
										</Link>
									</h3>
									<p>{TAHOOO.whatIsTaho.meetLine.charAt(0).toUpperCase() + TAHOOO.whatIsTaho.meetLine.slice(1)}</p>
									<ul>
										{TAHOOO.flavours.map((f) => (
											<li key={f.id}>{f.name}</li>
										))}
									</ul>
								</article>
								<article className={`${styles.service} ${styles.card}`} data-key="tahooo-book">
									<span className={`${styles.num} ${styles.mono}`}>02</span>
									<h3>
										<Link href="/tahooo#boka" className={styles.stretch}>
											{HOME.sections.tahooo.bookCard}
										</Link>
									</h3>
									<p>{TAHOOO.howToBook.steps.map((st) => st.en).join(" ")}</p>
									<ul>
										{TAHOOO.occasions.map((o) => (
											<li key={o.id}>{o.en}</li>
										))}
									</ul>
								</article>
							</div>
						</div>
					</section>
				)}

				{/* Bulletin Board: featured or newest notices (public.bulletin_items) and current partner offers */}
				{W.bulletin && (
					<section className={styles.world} id="bulletin" aria-labelledby="bulletin-title" style={style(W.bulletin)}>
						<div className={`${styles.wrap} ${styles.zoom}`}>
							{head(
								"bulletin",
								emph(HOME.sections.bulletin.heading),
								HOME.sections.bulletin.body,
								H.bulletin.allLabel,
							)}
							{notices.length > 0 && (
								<div className={styles.notices}>
									{notices.slice(0, 3).map((b, i) => (
										<article key={b.id} className={`${styles.notice} ${styles.card}`} style={{ "--i": i } as React.CSSProperties} data-reveal="" data-key={`notice-${b.slug}`}>
											<div className={`${styles.src} ${styles.mono}`}>
												<span>{issuedBy(b)}</span>
												{b.published_at && <time dateTime={b.published_at}>{formatDate(b.published_at, { month: "short", year: "numeric" })}</time>}
											</div>
											<h3>
												<Link href={itemPath(b)} className={styles.stretch}>
													{b.title}
												</Link>
											</h3>
											{plain(b.excerpt) && <p>{plain(b.excerpt)}</p>}
											<span className={`${styles.badge} ${styles.mono}`}>{b.category.name}</span>
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
												<span className={`${styles.promoKicker} ${styles.mono}`}>{p.discount_label || L.offer}</span>
												<h3>
													<Link href={`/promotions/${p.slug}`} className={styles.stretch}>
														{p.title}
													</Link>
												</h3>
												{plain(p.excerpt) && <p>{plain(p.excerpt)}</p>}
												{i === 0 && (
													<span className={`${styles.btn} ${styles.promoCta}`} aria-hidden="true">
														{p.ends_at ? `${L.until} ${formatDate(p.ends_at, { month: "short", day: "numeric" })}` : L.viewOffer} →
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
							<p className={styles.eyebrow}>{HOME.contact.eyebrow}</p>
							<h2 id="contact-title">{emph(HOME.contact.heading)}</h2>
							<p className={styles.aboutLede}>{HOME.contact.lede}</p>
						</div>
						<div className={styles.form}>
							<ContactForm topics={[BUSINESSES.bygg.name, BUSINESSES.digital.name, ...offerings.map((s) => s.title)]} />
						</div>
					</div>
				</section>
			</main>
		</SiteShell>
	);
}
