import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { searchPublicBlogs } from "@/lib/blogs";
import { searchPublicEvents } from "@/lib/events";
import { searchPublicPortfolios } from "@/lib/portfolio";
import { searchPublicServices } from "@/lib/services";
import { searchPublicPromotions } from "@/lib/promotions";
import { BYGG } from "@/lib/bygg-content";
import { TAHOOO } from "@/lib/tahooo-content";
import { BUSINESSES } from "@/lib/businesses";
import { param, searchTerm, toPlainText } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { pageMetadata } from "@/lib/seo";
import { EmptyNotice, PageIntro } from "@/components/site/content-card";

// Renders per request (it reads ?q=); each section's results come from the cache.

const MIN = 2;
const MAX = 80;

type Hit = { href: string; title: string; text: string; meta?: string; lang?: string };
type Group = { id: string; label: string; swatch: string; hits: Hit[] };

const readQuery = async (searchParams: PageProps<"/search">["searchParams"]) => param(await searchParams, "q").trim().slice(0, MAX);
const short = (s: string | null | undefined, n = 180) => {
	const t = s ? toPlainText(s) : "";
	return t.length > n ? `${t.slice(0, t.lastIndexOf(" ", n - 1)).trimEnd()}…` : t;
};

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
	const q = await readQuery(searchParams);
	const meta = await pageMetadata({ title: q ? `Search: ${q}` : "Search", description: "Search stories, events, projects, services and notices on Merkado PH.", path: "/search" });
	// Result pages are views of other pages: keep them out of search engines.
	return { ...meta, robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
	const q = await readQuery(searchParams);
	const term = searchTerm(q);
	const ready = term.length >= MIN;

	let groups: Group[] = [];
	if (ready) {
		const none = <T,>(p: Promise<T[]>) => p.catch((): T[] => []);
		const [blogs, events, projects, services, offers] = await Promise.all([
			none(searchPublicBlogs(term)),
			none(searchPublicEvents(term)),
			none(searchPublicPortfolios(term)),
			none(searchPublicServices(term)),
			none(searchPublicPromotions(term)),
		]);
		// The Bygg page is fixed content in Swedish: search its sections directly.
		const needle = term.toLowerCase();
		const bygg: Hit[] = [
			{ href: BUSINESSES.bygg.path, title: BUSINESSES.bygg.name, text: BYGG.intro },
			...BYGG.services.map((s) => ({ href: `${BUSINESSES.bygg.path}#${s.slug}`, title: s.title, text: s.text })),
		]
			.filter((h) => `${h.title} ${h.text}`.toLowerCase().includes(needle))
			.map((h) => ({ ...h, text: short(h.text), lang: "sv" }));

		const tahooo: Hit[] = [
			{ href: "/tahooo", title: TAHOOO.name, text: `${TAHOOO.tagline.en} ${TAHOOO.whatIsTaho} ${TAHOOO.occasions.join(", ")}. Taho Tahooo` },
			...TAHOOO.flavours.map((f) => ({ href: `/tahooo#${f.id}`, title: f.en === f.sv ? f.sv : `${f.sv} · ${f.en}`, text: `Taho flavour. ${TAHOOO.sizes}. ${TAHOOO.allergens.en}.` })),
		]
			.filter((h) => `${h.title} ${h.text}`.toLowerCase().includes(needle))
			.map((h) => ({ ...h, text: short(h.text.replace(" Taho Tahooo", "")) }));

		groups = [
			{ id: "blogs", label: "Blog", swatch: "bg-brand-teal", hits: blogs.map((b) => ({ href: `/blogs/${b.slug}`, title: b.title, text: short(b.excerpt), meta: b.published_at ? formatDate(b.published_at) : undefined })) },
			{ id: "events", label: "Events", swatch: "bg-brand-red", hits: events.map((e) => ({ href: `/events/${e.slug}`, title: e.title, text: short(e.excerpt), meta: e.starts_at ? formatDate(e.starts_at) : undefined })) },
			{ id: "impact", label: "Community Impact", swatch: "bg-brand-yellow", hits: projects.map((p) => ({ href: `/impact/${p.slug}`, title: p.title, text: short(p.excerpt), meta: p.completed_on?.slice(0, 4) })) },
			{ id: "bygg", label: BUSINESSES.bygg.name, swatch: "bg-brand-orange", hits: bygg },
			{ id: "tahooo", label: TAHOOO.name, swatch: "bg-tahooo-caramel", hits: tahooo },
			{ id: "services", label: "Services", swatch: "bg-blue-600", hits: services.map((s) => ({ href: `/services/${s.slug}`, title: s.title, text: short(s.excerpt), meta: s.category ?? undefined })) },
			{ id: "offers", label: "Offers", swatch: "bg-brand-promo", hits: offers.map((p) => ({ href: `/promotions/${p.slug}`, title: p.title, text: short(p.excerpt), meta: p.ends_at ? `Until ${formatDate(p.ends_at)}` : undefined })) },
		].filter((g) => g.hits.length > 0);
	}
	const total = groups.reduce((n, g) => n + g.hits.length, 0);

	return (
		<main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
			<PageIntro eyebrow="Search" title="Find on Merkado PH" description="Stories, events, projects, services and notices." />

			{/* A plain GET form: works without JavaScript, and the URL (/search?q=…) can be shared. */}
			<form action="/search" method="get" role="search" className="flex gap-2">
				<label htmlFor="q" className="sr-only">
					Search
				</label>
				<input
					id="q"
					name="q"
					type="search"
					defaultValue={q}
					minLength={MIN}
					maxLength={MAX}
					autoFocus={!q}
					placeholder="e.g. Independence Day, takläggning, pop-up"
					className="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 placeholder:text-stone-500 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:[color-scheme:dark]"
				/>
				<button type="submit" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200">
					<Search className="h-4 w-4" aria-hidden />
					Search
				</button>
			</form>

			<div className="mt-10" aria-live="polite">
				{!q ? null : !ready ? (
					<p className="text-stone-700 dark:text-stone-300">Type at least {MIN} letters.</p>
				) : total === 0 ? (
					<EmptyNotice title={`Nothing found for “${q}”.`} description="Try another word, or browse the Highlights from the menu." />
				) : (
					<>
						<p className="text-sm text-stone-700 dark:text-stone-300">
							{total} {total === 1 ? "result" : "results"} for <strong>“{q}”</strong>
						</p>
						{groups.map((g) => (
							<section key={g.id} aria-labelledby={`r-${g.id}`} className="mt-8">
								<h2 id={`r-${g.id}`} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-stone-700 dark:text-stone-300">
									<span className={`h-3 w-3 ${g.swatch}`} aria-hidden />
									{g.label}
								</h2>
								<ul className="mt-3 divide-y divide-stone-900/10 border-y border-stone-900/10 dark:divide-white/10 dark:border-white/10">
									{g.hits.map((h) => (
										<li key={h.href} lang={h.lang}>
											<Link href={h.href} className="block py-4 hover:bg-stone-900/[0.03] focus-visible:bg-stone-900/[0.05] dark:hover:bg-white/5">
												<span className="block font-semibold text-stone-950 dark:text-white">{h.title}</span>
												{h.meta && <span className="mt-0.5 block text-xs text-stone-600 dark:text-stone-400">{h.meta}</span>}
												{h.text && <span className="mt-1 block text-sm text-stone-700 dark:text-stone-300">{h.text}</span>}
											</Link>
										</li>
									))}
								</ul>
							</section>
						))}
					</>
				)}
			</div>
		</main>
	);
}
