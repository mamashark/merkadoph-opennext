import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Newspaper, Radio, Tv, FileText } from "lucide-react";
import { BULLETIN_PER_PAGE, getPressFacets, getPressPublishers, getPublicPress, type PressCard } from "@/lib/bulletin";
import { MEDIA_TYPE_LABEL, TYPE_LABEL } from "@/lib/bulletin-shared";
import { pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { pageMetadata } from "@/lib/seo";
import { ContentCard, EmptyNotice, LinkTabs, PageIntro } from "@/components/site/content-card";
import { Pagination } from "@/components/admin/pagination";

// Renders per request (it reads the filters from the URL); the data itself comes from the cache.

const description = "Where Merkado PH has been featured, and what we've announced: press coverage and press releases, with a link to every original.";

type Filters = { year: string; media: string; publisher: string; q: string; page: number };

/** Only known values are used: a year with a count, a media type in the list, a publisher with live items. */
const readFilters = cache(async function readFilters(searchParams: PageProps<"/press">["searchParams"]): Promise<Filters> {
	const params = await searchParams;
	const rawYear = param(params, "year");
	const rawMedia = param(params, "media");
	const rawPublisher = param(params, "publisher");
	const [facets, publishers] = await Promise.all([getPressFacets(), getPressPublishers()]);
	const year = facets.years.some((y) => String(y.year) === rawYear) ? rawYear : "";
	const media = facets.media.some((m) => m.value === rawMedia) ? rawMedia : "";
	const publisher = publishers.some((p) => p.slug === rawPublisher) ? rawPublisher : "";
	return { year, media, publisher, q: param(params, "q").trim().slice(0, 80), page: pageParam(params) };
});

const listHref = ({ year, media, publisher, q, page }: Partial<Filters>) => {
	const qs = new URLSearchParams({
		...(year ? { year } : {}),
		...(media ? { media } : {}),
		...(publisher ? { publisher } : {}),
		...(q ? { q } : {}),
		...(page && page > 1 ? { page: String(page) } : {}),
	}).toString();
	return qs ? `/press?${qs}` : "/press";
};

export async function generateMetadata({ searchParams }: PageProps<"/press">): Promise<Metadata> {
	const { year, media, publisher, q, page } = await readFilters(searchParams);
	const parts = [year, media ? MEDIA_TYPE_LABEL[media as keyof typeof MEDIA_TYPE_LABEL] : "", publisher].map((p) => p && p.replace(/-/g, " "));
	const label = parts.filter(Boolean).length ? `: ${parts.filter(Boolean).join(", ")}` : "";
	const meta = pageMetadata({ title: `Press & Media${label}${page > 1 ? ` — Page ${page}` : ""}`, description, path: listHref({ year, media, publisher, page }) });
	// Search results aren't indexed (thin, endless variations).
	return q ? { ...meta, robots: { index: false, follow: true } } : meta;
}

const icon = (media: PressCard["media_type"]) =>
	media === "television" ? Tv : media === "radio_podcast" ? Radio : media === "newspaper" ? Newspaper : FileText;

const card = (p: PressCard, featured = false) => {
	const Icon = icon(p.media_type);
	return (
		<ContentCard
			key={p.id}
			href={`/press/${p.slug}`}
			title={p.title}
			excerpt={p.excerpt}
			image={p.cover_image_url}
			imageAlt={p.cover_image_alt}
			eyebrow={TYPE_LABEL[p.content_type]}
			meta={
				<>
					{p.publisher?.name && <span>{p.publisher.name}</span>}
					{p.publisher?.name && " · "}
					<time dateTime={p.original_published_on ?? p.published_at ?? undefined}>
						{formatDate(p.original_published_on ?? p.published_at, { dateStyle: "long" })}
					</time>
					{p.media_type && (
						<>
							{" · "}
							<span className="inline-flex items-center gap-1">
								<Icon className="h-3.5 w-3.5" aria-hidden /> {MEDIA_TYPE_LABEL[p.media_type]}
							</span>
						</>
					)}
				</>
			}
			badge={p.content_type === "press_release" ? TYPE_LABEL.press_release : undefined}
			featured={featured}
			headingLevel="h3"
		/>
	);
};

export default async function PressPage({ searchParams }: PageProps<"/press">) {
	const { year, media, publisher, q, page } = await readFilters(searchParams);
	const [facets, publishers, result] = await Promise.all([
		getPressFacets(),
		getPressPublishers(),
		getPublicPress({ year, media, publisher, q, page }),
	]);
	// Past the last page is a 404, like the other listings (guideline 0.5).
	if (page > 1 && result.items.length === 0) notFound();
	const filtered = Boolean(year || media || publisher || q);
	const total = result.total;

	const yearTabs = [
		{ label: "All years", href: listHref({ media, publisher, q }), value: "" },
		...facets.years.map((y) => ({ label: String(y.year), href: listHref({ year: String(y.year), media, publisher, q }), value: String(y.year) })),
	];
	const resultText = total === 0 ? "" : `${total} ${total === 1 ? "press item" : "press items"}${filtered ? " match these filters" : ""}`;

	return (
		<main className="accent-press mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<PageIntro eyebrow="Press & Media" title="Press & Media" description={description} />

			<LinkTabs tabs={yearTabs} current={year} label="Filter by year" />

			<form action="/press" method="get" role="search" className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end">
				{(year || media || publisher) && (
					<>
						{year && <input type="hidden" name="year" value={year} />}
						{media && <input type="hidden" name="media" value={media} />}
						{publisher && <input type="hidden" name="publisher" value={publisher} />}
					</>
				)}
				<div className="flex-1">
					<label htmlFor="q" className="mb-1 block text-sm text-site-ink-2">
						Search press items
					</label>
					<input
						id="q"
						name="q"
						type="search"
						defaultValue={q}
						maxLength={80}
						placeholder="e.g. Independence Day, kabayan"
						className="min-h-11 w-full border border-site-line-2 bg-site-surface px-3 text-base text-site-ink placeholder:text-site-muted focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-accent dark:[color-scheme:dark]"
					/>
				</div>
				<div>
					<label htmlFor="media" className="mb-1 block text-sm text-site-ink-2">
						Media
					</label>
					<select
						id="media"
						name="media"
						defaultValue={media}
						className="min-h-11 w-full border border-site-line-2 bg-site-surface px-3 text-base text-site-ink focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-accent dark:[color-scheme:dark] sm:w-auto"
					>
						<option value="">Any media</option>
						{facets.media.map((m) => (
							<option key={m.value} value={m.value}>
								{MEDIA_TYPE_LABEL[m.value]} ({m.count})
							</option>
						))}
					</select>
				</div>
				<div>
					<label htmlFor="publisher" className="mb-1 block text-sm text-site-ink-2">
						Publisher
					</label>
					<select
						id="publisher"
						name="publisher"
						defaultValue={publisher}
						className="min-h-11 w-full border border-site-line-2 bg-site-surface px-3 text-base text-site-ink focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-accent dark:[color-scheme:dark] sm:w-auto"
					>
						<option value="">Any publisher</option>
						{publishers.map((p) => (
							<option key={p.slug} value={p.slug}>
								{p.name} ({p.count})
							</option>
						))}
					</select>
				</div>
				<button
					type="submit"
					className="inline-flex min-h-11 items-center justify-center border border-site-ink bg-site-ink px-5 font-label text-xs font-medium tracking-[0.1em] text-site-bg uppercase transition-colors hover:bg-transparent hover:text-site-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
				>
					Apply
				</button>
				{filtered && (
					<Link href="/press" className="inline-flex min-h-11 items-center text-sm text-site-ink-2 underline underline-offset-4 hover:text-site-ink">
						Clear filters
					</Link>
				)}
			</form>

			{/* Announced when the filters change (spec §14). */}
			<p className="mb-6 text-sm text-site-muted empty:hidden" aria-live="polite">
				{resultText}
			</p>

			{result.items.length === 0 ? (
				<EmptyNotice
					title={filtered ? "Nothing matches these filters." : "No press items yet."}
					description={filtered ? "Try another year, media type or publisher, or clear the filters." : "Coverage and press releases will be collected here as they happen."}
				/>
			) : (
				<ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
					{result.items.map((p) => (
						<li key={p.id}>{card(p)}</li>
					))}
				</ul>
			)}

			<Pagination tone="site" page={page} total={total} perPage={BULLETIN_PER_PAGE} basePath="/press" params={{ ...(year ? { year } : {}), ...(media ? { media } : {}), ...(publisher ? { publisher } : {}), ...(q ? { q } : {}) }} />

			<section aria-labelledby="media-contact" className="mt-16 border-t border-site-line pt-8">
				<h2 id="media-contact" className="font-display text-xl font-bold text-site-ink">
					Media enquiries
				</h2>
				<p className="mt-2 max-w-2xl text-site-ink-2">
					For interviews, images or information about Merkado PH, write to{" "}
					<a href="mailto:press@merkadoph.se" className="text-site-ink underline underline-offset-4 hover:text-accent">
						press@merkadoph.se
					</a>
					.
				</p>
			</section>
		</main>
	);
}
