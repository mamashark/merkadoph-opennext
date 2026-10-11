import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, MapPin, Store, Tag, UserRound } from "lucide-react";
import { getPublishedBlogByTitle, getPublishedBlogs, PINNED_BLOG_TITLE } from "@/lib/blogs";
import { getEventTags, getPublicEvents } from "@/lib/events";
import { getPublicPromotions } from "@/lib/promotions";
import { getPublicServices } from "@/lib/services";
import { formatDate, formatDayRange } from "@/lib/datetime";
import { pageMetadata } from "@/lib/seo";
import { getSeoSettings, localBusinessDetails } from "@/lib/site-settings";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import { cn } from "@/lib/ui";
import { SiteShell } from "@/components/site/site-shell";
import { JsonLd } from "@/components/site/json-ld";
import { ContactForm } from "./contact-form";
import { bodyFont, displayFont } from "./fonts";

const DESCRIPTION = "Discover Filipino stories, community events, Filipino-owned businesses and special offers across Sweden. Mabuhay! Välkommen!";

export const homeMetadata = async (): Promise<Metadata> => {
	const seo = await getSeoSettings();
	const title = `${seo.business_name || SITE_NAME} — Connecting Filipinos, celebrating community in Sweden`;
	return { ...(await pageMetadata({ title, description: DESCRIPTION, path: "/" })), title: { absolute: title } };
};

/** Never let one missing table take the whole homepage down. */
const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

const categories = [
	{ href: "/blogs", icon: FileText, color: "#19b796", title: "Blogs", body: "Stories, recipes and practical guides to life in Sweden.", go: "Read stories" },
	{ href: "/events", icon: CalendarDays, color: "#ffcc3f", title: "Events", body: "Fiestas, meetups and celebrations near you.", go: "See what's on" },
	{ href: "/services", icon: Store, color: "#f47e20", title: "Services", body: "Filipino-owned businesses, from catering to translation.", go: "Find a business" },
	{ href: "/promotions", icon: Tag, color: "#f05d22", title: "Promotions", body: "Offers and discounts from participating businesses.", go: "View offers" },
];

/** Patterned stand-ins for posts without a cover image. */
const thumbPatterns = [
	"radial-gradient(circle at 75% 25%, #ffcc3f 0 18%, transparent 19%), linear-gradient(160deg, #9fe3d2, #19b796)",
	"repeating-linear-gradient(90deg, #f47e20 0 14px, #f69a4c 14px 28px)",
	"repeating-linear-gradient(45deg, #ffcc3f 0 10px, #ffd966 10px 20px)",
	"linear-gradient(135deg, #33331e 0 50%, #4a4a2c 50%)",
];
const logoColors = ["#f47e20", "#19b796", "#ffcc3f", "#f05d22"];

const values = [
	{ title: "Bayanihan", body: "We help each other settle in, find work and feel at home." },
	{ title: "Lokal first", body: "We highlight Filipino-owned businesses in Stockholm, Göteborg, Malmö, Uppsala and beyond." },
	{ title: "Open to everyone", body: "Swedes, families and friends of the Philippines are all welcome." },
];

const initials = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0]!.toUpperCase())
		.join("");

/** Stretched card link: the whole card is clickable, with one link per card for screen readers. */
const stretched = "after:absolute after:inset-0 after:rounded-xl focus:outline-none focus-visible:underline";

export async function HomePage() {
	const [services, promotions, events, eventTags, latestBlogs, pinnedBlog, seo] = await Promise.all([
		safe(getPublicServices(undefined, 1, 4), { services: [], total: 0 }),
		safe(getPublicPromotions("current", 1, 2), { promotions: [], total: 0 }),
		safe(getPublicEvents("upcoming", 1, 4), { events: [], total: 0 }),
		safe(getEventTags("upcoming"), []),
		safe(getPublishedBlogs(1, 4), { blogs: [], total: 0 }),
		safe(getPublishedBlogByTitle(PINNED_BLOG_TITLE), null),
		getSeoSettings(),
	]);
	const blogs = { blogs: (pinnedBlog ? [pinnedBlog, ...latestBlogs.blogs.filter((b) => b.id !== pinnedBlog.id)] : latestBlogs.blogs).slice(0, 4) };
	const brand = seo.business_name || SITE_NAME;
	// Each data section brings its own spacing; without any, the sections below need top padding.
	const hasContent = blogs.blogs.length + events.events.length + services.services.length + promotions.promotions.length > 0;
	const nextEvent = events.events[0];
	const stats = [
		{ n: events.total, one: "upcoming event", many: "upcoming events" },
		{ n: services.total, one: "local service", many: "local services" },
		{ n: promotions.total, one: "current offer", many: "current offers" },
	].filter((s) => s.n > 0);

	return (
		<SiteShell contactHref="#contact" tone="home">
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
					knowsAbout: services.services.map((s) => s.title),
				}}
			/>

			<main className={cn(displayFont.variable, bodyFont.variable, "bg-home-bg font-body text-[17px] leading-relaxed text-home-text [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display")}>
				{nextEvent && (
					<p className="bg-brand-red px-4 py-2 text-center text-[0.92rem] text-white">
						Next up: {nextEvent.title}, {formatDate(nextEvent.starts_at, { weekday: "short", month: "long", day: "numeric" })}.{" "}
						<Link href="/events" className="font-bold underline underline-offset-2">
							See all events
						</Link>
					</p>
				)}
				<div className="banig" aria-hidden />

				{/* Hero */}
				<section aria-labelledby="hero-title" className="overflow-hidden bg-home-tint-teal pb-20 pt-12 sm:pb-28 sm:pt-20 lg:pb-32">
					<div className="mx-auto grid max-w-6xl items-center gap-6 px-4 sm:px-6 md:grid-cols-[1.3fr_1fr] md:gap-12">
						<div>
							<p className="mb-3.5 font-display text-[1.05rem] font-bold text-home-ink">Mabuhay! Välkommen!</p>
							<h1 id="hero-title" className="text-balance text-[clamp(2.3rem,6vw,4.2rem)] font-extrabold leading-[1.08] tracking-tight">
								Connecting Filipinos,{" "}
								<em className="px-1 not-italic" style={{ background: "linear-gradient(transparent 62%, var(--home-highlight) 62%)" }}>
									Celebrating Community.
								</em>
							</h1>
							<p className="mb-8 mt-5 max-w-[34ch] text-xl">Discover Filipino stories, events, businesses and exciting offers across Sweden.</p>
							<div className="flex flex-wrap gap-3">
								<Link href="/services" className="inline-flex min-h-12 items-center rounded-xl bg-brand-teal px-6 font-bold text-brand-on hover:bg-[#16a386]">
									Explore services
								</Link>
								<Link
									href="/events"
									className="inline-flex min-h-12 items-center rounded-xl border-2 border-home-text px-6 font-bold text-home-text hover:bg-home-text hover:text-home-bg"
								>
									Upcoming events
								</Link>
							</div>
							{stats.length > 0 && (
								<p className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[0.92rem] text-home-muted">
									{stats.map((s) => (
										<span key={s.one}>
											<strong className="tabular-nums text-home-text">{s.n}</strong> {s.n === 1 ? s.one : s.many}
										</span>
									))}
								</p>
							)}
						</div>
						<Parol />
					</div>
				</section>

				{/* Category shortcuts */}
				<nav aria-labelledby="explore-title" className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
					<h2 id="explore-title" className="sr-only">
						Explore the site
					</h2>
					<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{categories.map(({ href, icon: Icon, color, title, body, go }) => (
							<li key={href} className="flex">
								<Link
									href={href}
									className="flex w-full flex-col gap-1.5 rounded-xl border-t-[6px] bg-home-surface p-5 shadow-[0_4px_18px_rgba(51,51,30,0.08)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none dark:shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
									style={{ borderTopColor: color }}
								>
									<span className="mb-1.5 grid h-11 w-11 place-items-center rounded-lg text-brand-on" style={{ background: color }} aria-hidden>
										<Icon className="h-5 w-5" />
									</span>
									<h3 className="text-xl font-bold">{title}</h3>
									<span className="text-[0.95rem] text-home-muted">{body}</span>
									<span className="mt-auto pt-2 text-[0.92rem] font-bold text-home-ink">
										{go} <span aria-hidden>→</span>
									</span>
								</Link>
							</li>
						))}
					</ul>
				</nav>

				{/* Blogs */}
				{blogs.blogs.length > 0 && (
					<section aria-labelledby="blogs-title" className="py-12 sm:py-20">
						<div className="mx-auto max-w-6xl px-4 sm:px-6">
							<SectionHead id="blogs-title" eyebrow="Featured blogs" title="Latest from the community" href="/blogs" linkLabel="All articles" />
							<ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
								{blogs.blogs.map((b, i) => (
									<li key={b.id} className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-home-line bg-home-surface">
										<div className="relative aspect-[16/10]" style={b.cover_image_url ? undefined : { background: thumbPatterns[i % thumbPatterns.length] }}>
											{b.cover_image_url && (
												<Image src={b.cover_image_url} alt={b.cover_image_alt ?? ""} fill sizes="(min-width: 1024px) 270px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
											)}
										</div>
										<div className="flex flex-1 flex-col gap-2 p-5">
											{b.tags[0] && <span className="self-start rounded-full bg-home-tint-teal px-2.5 py-0.5 text-[0.76rem] font-bold tracking-wide text-home-ink">{b.tags[0]}</span>}
											<h3 className="text-lg font-bold leading-snug">
												<Link href={`/blogs/${b.slug}`} className={stretched}>
													{b.title}
												</Link>
											</h3>
											{b.excerpt && <p className="line-clamp-3 text-[0.95rem] text-home-muted">{b.excerpt}</p>}
											<p className="text-[0.85rem] text-home-muted">
												{b.author_name && <>{b.author_name} · </>}
												<time dateTime={b.published_at ?? undefined}>{formatDate(b.published_at, { dateStyle: "long" })}</time>
											</p>
											<span className="mt-auto pt-1.5 font-bold text-home-ink" aria-hidden>
												Read more →
											</span>
										</div>
									</li>
								))}
							</ul>
						</div>
					</section>
				)}

				{/* Events */}
				{events.events.length > 0 && (
					<section aria-labelledby="events-title" className="border-y border-home-line bg-home-surface py-12 sm:py-20">
						<div className="mx-auto max-w-6xl px-4 sm:px-6">
							<SectionHead id="events-title" eyebrow="Upcoming events" title="What's on" href="/events" linkLabel="Full calendar" />
							{eventTags.length > 0 && (
								<nav aria-label="Browse events by tag" className="mb-5">
									<ul className="flex flex-wrap gap-2">
										{["", ...eventTags.slice(0, 6)].map((t) => (
											<li key={t || "all"}>
												<Link
													href={t ? `/events?${new URLSearchParams({ tag: t })}` : "/events"}
													className={cn(
														"inline-flex min-h-11 items-center rounded-full border px-4 text-[0.92rem] font-bold",
														t ? "border-home-line bg-home-bg text-home-text hover:border-home-text" : "border-brand-olive bg-brand-olive text-[#faf9f6] dark:border-brand-teal dark:bg-brand-teal dark:text-brand-on",
													)}
												>
													{t || "All events"}
												</Link>
											</li>
										))}
									</ul>
								</nav>
							)}
							<ul className="grid gap-3.5">
								{events.events.map((e) => (
									<li key={e.id} className="relative grid grid-cols-[72px_1fr] items-center gap-5 rounded-xl border border-home-line bg-home-bg p-4 sm:grid-cols-[92px_1fr_auto] sm:p-5">
										<div className="rounded-lg bg-brand-yellow px-1.5 py-2.5 text-center tabular-nums text-brand-on" aria-hidden>
											<div className="font-display text-[1.6rem] font-extrabold leading-none sm:text-[2rem]">{formatDate(e.starts_at, { day: "numeric" })}</div>
											<div className="text-[0.8rem] font-bold uppercase tracking-[0.08em]">{formatDate(e.starts_at, { month: "short" })}</div>
										</div>
										<div className="flex min-w-0 flex-col gap-1">
											<h3 className="text-xl font-bold leading-snug">
												<Link href={`/events/${e.slug}`} className={stretched}>
													{e.title}
												</Link>
											</h3>
											{e.excerpt && <p className="line-clamp-2">{e.excerpt}</p>}
											<p className="flex flex-wrap gap-x-4 gap-y-1 text-[0.9rem] tabular-nums text-home-muted">
												<span className="inline-flex items-center gap-1">
													<CalendarDays className="h-3.5 w-3.5" aria-hidden />
													<time dateTime={e.starts_at}>{formatDate(e.starts_at, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
												</span>
												{e.venue_name && (
													<span className="inline-flex items-center gap-1">
														<MapPin className="h-3.5 w-3.5" aria-hidden />
														{e.venue_name}
													</span>
												)}
												{e.organizer && (
													<span className="inline-flex items-center gap-1">
														<UserRound className="h-3.5 w-3.5" aria-hidden />
														By {e.organizer}
													</span>
												)}
											</p>
										</div>
										<div className="col-span-full flex items-center justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end">
											{e.price_info && <span className="font-bold tabular-nums">{e.price_info}</span>}
											<span className="inline-flex min-h-11 items-center rounded-xl bg-brand-orange px-5 font-bold text-brand-on" aria-hidden>
												Details
											</span>
										</div>
									</li>
								))}
							</ul>
						</div>
					</section>
				)}

				{/* Services */}
				{services.services.length > 0 && (
					<section aria-labelledby="services-title" className="py-12 sm:py-20">
						<div className="mx-auto max-w-6xl px-4 sm:px-6">
							<SectionHead
								id="services-title"
								eyebrow="Highlighted services"
								title="Filipino-owned businesses"
								description="Food, beauty, photography, translation and more, from Filipino entrepreneurs in Sweden."
								href="/services"
								linkLabel="Browse the directory"
							/>
							<ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
								{services.services.map((s, i) => (
									<li key={s.id} className="relative flex min-w-0 flex-col gap-2 rounded-xl border border-home-line bg-home-surface p-5">
										<div className="flex items-center gap-3">
											<span className="grid h-13 w-13 shrink-0 place-items-center rounded-full font-display text-lg font-extrabold text-brand-on" style={{ background: logoColors[i % logoColors.length] }} aria-hidden>
												{initials(s.title)}
											</span>
											<div className="min-w-0">
												<h3 className="text-lg font-bold leading-snug">
													<Link href={`/services/${s.slug}`} className={stretched}>
														{s.title}
													</Link>
												</h3>
												{s.category && <p className="text-[0.88rem] text-home-muted">{s.category}</p>}
											</div>
										</div>
										{s.excerpt && <p className="line-clamp-3 text-[0.95rem] text-home-muted">{s.excerpt}</p>}
										{s.price_label && <p className="text-[0.9rem] font-bold tabular-nums">{s.price_label}</p>}
										<span className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-teal px-4 text-[0.95rem] font-bold text-brand-on" aria-hidden>
											View service
										</span>
									</li>
								))}
							</ul>
						</div>
					</section>
				)}

				{/* Promotions */}
				{promotions.promotions.length > 0 && (
					<section aria-labelledby="promos-title" className={cn("pb-12 sm:pb-20", !(blogs.blogs.length || events.events.length || services.services.length) && "pt-12 sm:pt-20")}>
						<div className="mx-auto max-w-6xl px-4 sm:px-6">
							<SectionHead
								id="promos-title"
								eyebrow="Current promotions"
								title="Special offers"
								description="Every offer is confirmed with the business before it's published. Expired offers are removed automatically."
								href="/promotions"
								linkLabel="All promotions"
							/>
							<ul className="grid gap-5 md:grid-cols-2">
								{promotions.promotions.map((p) => (
									<li key={p.id} className="relative flex flex-col gap-2.5 overflow-hidden rounded-xl bg-home-tint-orange p-6">
										<span className="self-start rounded-md bg-brand-promo px-3 py-1 font-display text-[1.05rem] font-extrabold text-brand-on">{p.discount_label || "Offer"}</span>
										<h3 className="text-[1.35rem] font-bold leading-snug">
											<Link href={`/promotions/${p.slug}`} className={stretched}>
												{p.title}
											</Link>
										</h3>
										{p.excerpt && <p className="line-clamp-3">{p.excerpt}</p>}
										<p className="text-[0.9rem] text-home-muted">{p.ends_at ? `Valid until ${formatDate(p.ends_at, { dateStyle: "long" })}` : formatDayRange(p.starts_at, p.ends_at)}</p>
										<span className="mt-1.5 inline-flex min-h-12 items-center self-start rounded-xl bg-brand-orange px-6 font-bold text-brand-on" aria-hidden>
											Claim offer
										</span>
									</li>
								))}
							</ul>
						</div>
					</section>
				)}

				{/* About */}
				<section
					aria-labelledby="about-title"
					className={cn("mx-auto grid max-w-6xl gap-6 px-4 pb-12 sm:px-6 sm:pb-20 md:grid-cols-2 md:gap-10", !hasContent && "pt-12 sm:pt-20")}
				>
					<div>
						<Eyebrow>About us</Eyebrow>
						<h2 id="about-title" className="mb-4 text-balance text-[clamp(1.8rem,3.6vw,2.5rem)] font-extrabold leading-tight tracking-tight">
							A digital community center for Filipinos in Sweden
						</h2>
						<p className="max-w-[60ch]">
							{brand} brings together Filipinos living in Sweden, Swedish friends and customers, and local businesses. We share stories, promote community events and help people find
							Filipino-owned services near them.
						</p>
						<p className="mt-4 max-w-[60ch]">
							Have a story, event or business to share?{" "}
							<a href="#contact" className="font-bold text-home-ink underline underline-offset-2">
								Send us a message
							</a>
							. Every submission is reviewed before it&apos;s published.
						</p>
					</div>
					<ul className="grid content-start gap-3.5">
						{values.map((v) => (
							<li key={v.title} className="rounded-r-lg border-l-4 border-brand-teal bg-home-surface px-4.5 py-4">
								<strong className="block font-display text-[1.05rem]">{v.title}</strong>
								{v.body}
							</li>
						))}
					</ul>
				</section>

				{/* Contact */}
				<section id="contact" aria-labelledby="contact-title" className="scroll-mt-24 pb-16 sm:pb-24">
					<div className="mx-auto max-w-6xl px-4 sm:px-6">
						<div className="grid gap-8 rounded-[18px] bg-brand-yellow p-[clamp(28px,5vw,56px)] text-brand-on lg:grid-cols-[1fr_1.4fr] lg:items-start">
							<div>
								<h2 id="contact-title" className="text-balance text-[clamp(1.7rem,3.4vw,2.4rem)] font-extrabold leading-tight">
									Kumusta? Get in touch.
								</h2>
								<p className="mt-2.5">
									Submit an event, list your business, write for us or ask a question. We usually reply within 1–2 business days. Feel free to write in English, Filipino or Swedish.
								</p>
							</div>
							<div className="relative rounded-2xl bg-[#fbf7ef] p-6 text-stone-900 shadow-sm dark:bg-stone-950 dark:text-stone-100 sm:p-8">
								<ContactForm topics={services.services.map((s) => s.title)} />
							</div>
						</div>
					</div>
				</section>
			</main>
		</SiteShell>
	);
}

function Eyebrow({ children }: { children: React.ReactNode }) {
	return <p className="text-[0.78rem] font-bold uppercase tracking-[0.1em] text-home-muted">{children}</p>;
}

function SectionHead({ id, eyebrow, title, description, href, linkLabel }: { id: string; eyebrow: string; title: string; description?: string; href: string; linkLabel: string }) {
	return (
		<div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
			<div>
				<Eyebrow>{eyebrow}</Eyebrow>
				<h2 id={id} className="text-balance text-[clamp(1.8rem,3.6vw,2.5rem)] font-extrabold leading-tight tracking-tight">
					{title}
				</h2>
				{description && <p className="mt-1.5 max-w-[52ch] text-home-muted">{description}</p>}
			</div>
			<Link href={href} className="inline-flex items-center gap-1 whitespace-nowrap font-bold text-home-ink hover:underline">
				{linkLabel} <ArrowRight className="h-4 w-4" aria-hidden />
			</Link>
		</div>
	);
}

/** The parol (Filipino Christmas star lantern): inline SVG, so the hero needs no image download. */
function Parol() {
	return (
		<svg viewBox="0 0 400 400" role="img" aria-label="A parol, the Filipino Christmas star lantern" className="order-first w-full max-w-45 md:order-none md:max-w-95 md:justify-self-center">
			<g className="parol-rays" stroke="#ffcc3f" strokeWidth="6" strokeLinecap="round" opacity="0.9">
				<line x1="200" y1="20" x2="200" y2="52" />
				<line x1="200" y1="348" x2="200" y2="380" />
				<line x1="20" y1="200" x2="52" y2="200" />
				<line x1="348" y1="200" x2="380" y2="200" />
				<line x1="72" y1="72" x2="94" y2="94" />
				<line x1="306" y1="306" x2="328" y2="328" />
				<line x1="328" y1="72" x2="306" y2="94" />
				<line x1="94" y1="306" x2="72" y2="328" />
			</g>
			<circle cx="200" cy="200" r="132" fill="none" stroke="#19b796" strokeWidth="10" />
			<path d="M200 78l30 78 84 4-65 53 22 81-71-46-71 46 22-81-65-53 84-4z" fill="#f47e20" />
			<path d="M200 120l18 47 50 2-39 32 13 49-42-28-42 28 13-49-39-32 50-2z" fill="#ffcc3f" />
			<circle cx="200" cy="200" r="16" fill="#e10606" />
			<g stroke="#19b796" strokeWidth="4">
				<line x1="170" y1="332" x2="160" y2="384" />
				<line x1="200" y1="332" x2="200" y2="390" />
				<line x1="230" y1="332" x2="240" y2="384" />
			</g>
		</svg>
	);
}
