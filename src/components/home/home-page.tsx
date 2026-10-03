import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, Hammer, HeartHandshake, Home as HomeIcon, MapPin, ShieldCheck, Store, Users } from "lucide-react";
import { getPublishedBlogs } from "@/lib/blogs";
import { getPublicEvents } from "@/lib/events";
import { getPublicPromotions } from "@/lib/promotions";
import { getPublicServices } from "@/lib/services";
import { formatDate, formatDayRange } from "@/lib/datetime";
import { organization, pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/env";
import { SiteShell } from "@/components/site/site-shell";
import { JsonLd } from "@/components/site/json-ld";
import { ContactForm } from "./contact-form";

export const homeMetadata: Metadata = {
	...pageMetadata({
		title: "Merkado PH — Roofing & construction in Sweden, built on community",
		description:
			"Merkado PH began as a Filipino store in Sweden and grew into a community. Today we carry that trust into roofing, renovation and construction work. Get a free quote.",
		path: "/",
	}),
	title: { absolute: "Merkado PH — Roofing & construction in Sweden, built on community" },
};

/** Never let one missing table take the whole homepage down. */
const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

const story = [
	{
		icon: Store,
		kicker: "Where it began",
		title: "A Filipino store in Sweden",
		body: "Merkado PH opened as a physical store and online shop, bringing familiar Filipino products to families far from home.",
	},
	{
		icon: Users,
		kicker: "What it became",
		title: "A Filipino-Swedish community",
		body: "Along the way the store became a meeting point — friendships, celebrations and a network of people who look out for each other.",
	},
	{
		icon: Hammer,
		kicker: "The next chapter",
		title: "Building homes, not just baskets",
		body: "With the online shop now sold, the family is carrying the name forward into roofing and construction — the same care, a new craft.",
	},
];

const promises = [
	{ icon: ShieldCheck, title: "Clear, written quotes", body: "You know the scope, price and timeline before work starts." },
	{ icon: HeartHandshake, title: "Community trust", body: "Recommended by the people who've known Merkado PH for years." },
	{ icon: HomeIcon, title: "Built for Swedish weather", body: "Materials and methods chosen for snow, rain and long winters." },
];

export async function HomePage() {
	const [services, promotions, events, blogs] = await Promise.all([
		safe(getPublicServices(undefined, 1, 6), { services: [], total: 0 }),
		safe(getPublicPromotions("current", 1, 3), { promotions: [], total: 0 }),
		safe(getPublicEvents("upcoming", 1, 3), { events: [], total: 0 }),
		safe(getPublishedBlogs(1, 3), { blogs: [], total: 0 }),
	]);
	const topics = services.services.map((s) => s.title);

	return (
		<SiteShell contactHref="#contact">
			<JsonLd
				data={{
					"@context": "https://schema.org",
					...organization,
					"@type": ["LocalBusiness", "RoofingContractor"],
					"@id": `${SITE_URL}/#business`,
					description: "Roofing, renovation and construction in Sweden, from the family behind the Merkado PH Filipino store.",
					areaServed: { "@type": "Country", name: "Sweden" },
					knowsAbout: services.services.map((s) => s.title),
				}}
			/>

			<main>
				{/* Hero */}
				<section className="relative overflow-hidden">
					<div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
						<div>
							<p className="inline-flex items-center gap-2 rounded-full border border-amber-900/15 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal-800 dark:border-white/10 dark:bg-white/5 dark:text-teal-300">
								<span className="h-1.5 w-1.5 rounded-full bg-orange-500" aria-hidden /> Bagong yugto · A new chapter
							</p>
							<h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-stone-950 dark:text-white sm:text-6xl">
								From our Filipino store
								<br className="hidden sm:block" /> <span className="text-teal-800 dark:text-teal-300">to the roof over your head.</span>
							</h1>
							<p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-700 dark:text-stone-300">
								Merkado PH grew from a Filipino shop in Sweden into a community. Now we&apos;re putting that trust to work in roofing, renovation and construction — done properly, explained
								clearly.
							</p>
							<div className="mt-8 flex flex-wrap gap-3">
								<a href="#contact" className="inline-flex h-12 items-center gap-2 rounded-xl bg-stone-900 px-6 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200">
									Get a free quote <ArrowRight className="h-4 w-4" aria-hidden />
								</a>
								<Link
									href="/services"
									className="inline-flex h-12 items-center gap-2 rounded-xl border border-stone-300 px-6 text-sm font-semibold text-stone-800 hover:bg-white dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-900"
								>
									Our services
								</Link>
							</div>
						</div>
						<div className="relative">
							<div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-amber-200/60 via-transparent to-teal-200/50 blur-2xl dark:from-amber-500/10 dark:to-teal-500/10" aria-hidden />
							<div className="overflow-hidden rounded-[1.75rem] border border-amber-900/10 bg-[#ddb989] shadow-xl dark:border-white/10">
								<Image
									src="/underconstruction-site.jpg"
									alt="Illustration of two Merkado PH team members fitting puzzle pieces together"
									width={2752}
									height={1536}
									preload
									sizes="(min-width: 1024px) 540px, 100vw"
									className="h-auto w-full"
								/>
							</div>
						</div>
					</div>
				</section>

				{/* Story */}
				<section aria-labelledby="story-title" className="border-y border-amber-900/10 bg-white/60 dark:border-white/10 dark:bg-stone-900/40">
					<div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
						<div className="max-w-2xl">
							<p className="text-sm font-semibold uppercase tracking-widest text-teal-800 dark:text-teal-300">Our story</p>
							<h2 id="story-title" className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 dark:text-white sm:text-4xl">
								Same name, same people, a new kind of work.
							</h2>
						</div>
						<ol className="mt-10 grid gap-6 md:grid-cols-3">
							{story.map(({ icon: Icon, kicker, title, body }, i) => (
								<li key={title} className="relative rounded-2xl border border-amber-900/10 bg-[#fbf7ef] p-6 dark:border-white/10 dark:bg-stone-950">
									<div className="flex items-center justify-between">
										<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
											<Icon className="h-5 w-5" aria-hidden />
										</span>
										<span className="text-sm font-semibold tabular-nums text-stone-600 dark:text-stone-400" aria-hidden>
											0{i + 1}
										</span>
									</div>
									<p className="mt-5 text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">{kicker}</p>
									<h3 className="mt-1 text-lg font-semibold text-stone-950 dark:text-white">{title}</h3>
									<p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">{body}</p>
								</li>
							))}
						</ol>
					</div>
				</section>

				{/* Services */}
				{services.services.length > 0 && (
					<section aria-labelledby="services-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
						<SectionHead id="services-title" eyebrow="Services" title="What we build and fix" href="/services" linkLabel="All services" />
						<ul className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-amber-900/10 bg-amber-900/10 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
							{services.services.map((s) => (
								<li key={s.id} className="group relative bg-[#fbf7ef] p-6 transition hover:bg-white dark:bg-stone-950 dark:hover:bg-stone-900">
									{s.category && <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">{s.category}</p>}
									<h3 className="mt-1.5 text-lg font-semibold text-stone-950 dark:text-white">
										<Link href={`/services/${s.slug}`} className="after:absolute after:inset-0 focus:outline-none focus-visible:underline">
											{s.title}
										</Link>
									</h3>
									{s.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">{s.excerpt}</p>}
									<div className="mt-4 flex items-center justify-between text-sm">
										<span className="font-medium text-stone-800 dark:text-stone-200">{s.price_label ?? ""}</span>
										<ArrowUpRight className="h-4 w-4 text-stone-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-teal-700 dark:group-hover:text-teal-300" aria-hidden />
									</div>
								</li>
							))}
						</ul>
					</section>
				)}

				{/* Promise */}
				<section aria-label="Why work with us" className="bg-stone-950 text-stone-100 dark:bg-black">
					<div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
						{promises.map(({ icon: Icon, title, body }) => (
							<div key={title} className="flex gap-4">
								<Icon className="mt-0.5 h-6 w-6 shrink-0 text-teal-300" aria-hidden />
								<div>
									<p className="font-semibold text-white">{title}</p>
									<p className="mt-1 text-sm leading-relaxed text-stone-300">{body}</p>
								</div>
							</div>
						))}
					</div>
				</section>

				{/* Promotions */}
				{promotions.promotions.length > 0 && (
					<section aria-labelledby="promos-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
						<SectionHead id="promos-title" eyebrow="Promotions" title="Current offers" href="/promotions" linkLabel="All promotions" />
						<ul className="mt-8 grid gap-4 md:grid-cols-3">
							{promotions.promotions.map((p) => (
								<li key={p.id} className="group relative flex flex-col rounded-2xl border border-amber-900/10 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-stone-900">
									{p.discount_label && (
										<span className="w-fit rounded-full bg-orange-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">{p.discount_label}</span>
									)}
									<h3 className="mt-4 text-lg font-semibold text-stone-950 dark:text-white">
										<Link href={`/promotions/${p.slug}`} className="after:absolute after:inset-0 focus:outline-none focus-visible:underline">
											{p.title}
										</Link>
									</h3>
									{p.excerpt && <p className="mt-2 line-clamp-2 flex-1 text-sm text-stone-700 dark:text-stone-300">{p.excerpt}</p>}
									<p className="mt-4 text-xs font-medium text-stone-600 dark:text-stone-400">{formatDayRange(p.starts_at, p.ends_at)}</p>
								</li>
							))}
						</ul>
					</section>
				)}

				{/* Events + Blog */}
				{(events.events.length > 0 || blogs.blogs.length > 0) && (
					<section aria-label="Community" className="border-t border-amber-900/10 dark:border-white/10">
						<div className="mx-auto grid max-w-6xl gap-14 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
							{events.events.length > 0 && (
								<div>
									<SectionHead id="events-title" eyebrow="Community" title="Upcoming events" href="/events" linkLabel="All events" />
									<ul className="mt-6 divide-y divide-amber-900/10 dark:divide-white/10">
										{events.events.map((e) => (
											<li key={e.id} className="group relative flex gap-4 py-4">
												<div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-amber-900/10 bg-white py-2 dark:border-white/10 dark:bg-stone-900" aria-hidden>
													<span className="text-[11px] font-semibold uppercase text-orange-700 dark:text-orange-400">{formatDate(e.starts_at, { month: "short" })}</span>
													<span className="text-xl font-semibold leading-none text-stone-950 dark:text-white">{formatDate(e.starts_at, { day: "numeric" })}</span>
												</div>
												<div className="min-w-0">
													<h3 className="font-semibold text-stone-950 dark:text-white">
														<Link href={`/events/${e.slug}`} className="after:absolute after:inset-0 focus:outline-none focus-visible:underline">
															{e.title}
														</Link>
													</h3>
													<p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600 dark:text-stone-400">
														<span className="inline-flex items-center gap-1">
															<CalendarDays className="h-3.5 w-3.5" aria-hidden />
															<time dateTime={e.starts_at}>{formatDate(e.starts_at, { weekday: "short", hour: "numeric", minute: "2-digit" })}</time>
														</span>
														{e.venue_name && (
															<span className="inline-flex items-center gap-1">
																<MapPin className="h-3.5 w-3.5" aria-hidden />
																{e.venue_name}
															</span>
														)}
													</p>
												</div>
											</li>
										))}
									</ul>
								</div>
							)}
							{blogs.blogs.length > 0 && (
								<div>
									<SectionHead id="blog-title" eyebrow="Blog" title="Guides & stories" href="/blogs" linkLabel="All posts" />
									<ul className="mt-6 divide-y divide-amber-900/10 dark:divide-white/10">
										{blogs.blogs.map((b) => (
											<li key={b.id} className="group relative py-4">
												<p className="text-xs text-stone-600 dark:text-stone-400">
													<time dateTime={b.published_at ?? undefined}>{formatDate(b.published_at, { dateStyle: "long" })}</time>
													{b.author_name && <> · {b.author_name}</>}
												</p>
												<h3 className="mt-1 font-semibold text-stone-950 group-hover:text-teal-800 dark:text-white dark:group-hover:text-teal-300">
													<Link href={`/blogs/${b.slug}`} className="after:absolute after:inset-0 focus:outline-none focus-visible:underline">
														{b.title}
													</Link>
												</h3>
												{b.excerpt && <p className="mt-1 line-clamp-2 text-sm text-stone-700 dark:text-stone-300">{b.excerpt}</p>}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					</section>
				)}

				{/* Contact */}
				<section id="contact" aria-labelledby="contact-title" className="scroll-mt-24 border-t border-amber-900/10 bg-white/60 dark:border-white/10 dark:bg-stone-900/40">
					<div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.4fr]">
						<div>
							<p className="text-sm font-semibold uppercase tracking-widest text-teal-800 dark:text-teal-300">Contact</p>
							<h2 id="contact-title" className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 dark:text-white sm:text-4xl">
								Tell us about your project.
							</h2>
							<p className="mt-4 leading-relaxed text-stone-700 dark:text-stone-300">
								A leaking roof, a tired facade or a full renovation — send a few details and we&apos;ll come back with next steps and a free, no-obligation quote. Kabayan? Feel free
								to write in Filipino.
							</p>
							<dl className="mt-8 space-y-4 text-sm">
								<div>
									<dt className="font-semibold text-stone-950 dark:text-white">Service area</dt>
									<dd className="text-stone-700 dark:text-stone-300">Sweden — ask us about your location.</dd>
								</div>
								<div>
									<dt className="font-semibold text-stone-950 dark:text-white">Response time</dt>
									<dd className="text-stone-700 dark:text-stone-300">Usually within 1–2 business days.</dd>
								</div>
							</dl>
						</div>
						<div className="relative rounded-2xl border border-amber-900/10 bg-[#fbf7ef] p-6 shadow-sm dark:border-white/10 dark:bg-stone-950 sm:p-8">
							<ContactForm topics={topics} />
						</div>
					</div>
				</section>
			</main>
		</SiteShell>
	);
}

function SectionHead({ id, eyebrow, title, href, linkLabel }: { id: string; eyebrow: string; title: string; href: string; linkLabel: string }) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p className="text-sm font-semibold uppercase tracking-widest text-teal-800 dark:text-teal-300">{eyebrow}</p>
				<h2 id={id} className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 dark:text-white">
					{title}
				</h2>
			</div>
			<Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-stone-800 hover:text-teal-800 dark:text-stone-200 dark:hover:text-teal-300">
				{linkLabel} <ArrowRight className="h-4 w-4" aria-hidden />
			</Link>
		</div>
	);
}
