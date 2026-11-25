import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ANNOUNCEMENT_TAG, BLOGS_PER_PAGE, getPublishedBlogs, type BlogSummary } from "@/lib/blogs";
import { getPublicPromotions, PROMOTIONS_PER_PAGE, type PromotionSummary } from "@/lib/promotions";
import { EMBASSY_LINKS } from "@/lib/businesses";
import { pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { pageMetadata } from "@/lib/seo";
import { ContentCard, EmptyNotice, LinkTabs, PageIntro } from "@/components/site/content-card";
import { Pagination } from "@/components/admin/pagination";

// Renders per request (it reads the tab/page from the URL); the data itself comes from the cache.

const description = "News and updates for Filipinos in Sweden: notices from the Philippine Embassy, community announcements and offers from friends of Merkado PH.";

/** "" = both lists (first page of each); "notices" / "offers" = one list, paginated. Unknown values show both. */
const SHOWS = ["notices", "offers"] as const;
type Show = (typeof SHOWS)[number] | "";

async function readFilters(searchParams: PageProps<"/bulletin">["searchParams"]) {
	const params = await searchParams;
	const raw = param(params, "show");
	const show: Show = (SHOWS as readonly string[]).includes(raw) ? (raw as Show) : "";
	return { show, page: show ? pageParam(params) : 1 };
}

const listHref = (show: Show, page = 1) => {
	const qs = new URLSearchParams({ ...(show ? { show } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString();
	return qs ? `/bulletin?${qs}` : "/bulletin";
};

export async function generateMetadata({ searchParams }: PageProps<"/bulletin">): Promise<Metadata> {
	const { show, page } = await readFilters(searchParams);
	const label = show === "notices" ? ": Notices" : show === "offers" ? ": Offers" : "";
	return pageMetadata({ title: `Bulletin Board${label}${page > 1 ? ` — Page ${page}` : ""}`, description, path: listHref(show, page) });
}

export default async function BulletinPage({ searchParams }: PageProps<"/bulletin">) {
	const { show, page } = await readFilters(searchParams);
	const [notices, offers] = await Promise.all([
		show === "offers" ? null : getPublishedBlogs(page, BLOGS_PER_PAGE, { tag: ANNOUNCEMENT_TAG }).catch(() => ({ blogs: [] as BlogSummary[], total: 0 })),
		show === "notices" ? null : getPublicPromotions("current", page, PROMOTIONS_PER_PAGE).catch(() => ({ promotions: [] as PromotionSummary[], total: 0 })),
	]);
	const shown = show === "notices" ? notices!.blogs.length : show === "offers" ? offers!.promotions.length : 1;
	if (page > 1 && shown === 0) notFound();

	return (
		<main className="accent-bulletin mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<PageIntro eyebrow="Bulletin Board" title="Mga Paalala" description={description} />

			{EMBASSY_LINKS.length > 0 && (
				<aside aria-labelledby="embassy-title" className="mb-10 border border-site-line bg-site-surface p-5">
					<h2 id="embassy-title" className="font-semibold text-site-ink">
						Philippine Embassy in Sweden
					</h2>
					<p className="mt-1 text-sm text-site-ink-2">For consular services and official announcements, always check the Embassy&rsquo;s own channels.</p>
					<ul className="mt-3 flex flex-wrap gap-3">
						{EMBASSY_LINKS.map((l) => (
							<li key={l.href}>
								<a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-site-line-2 px-4 font-label text-xs font-medium tracking-[0.1em] text-site-ink uppercase transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
									{l.label} ↗<span className="sr-only"> (opens in a new tab)</span>
								</a>
							</li>
						))}
					</ul>
				</aside>
			)}

			<LinkTabs
				label="Show"
				current={show}
				tabs={[
					{ label: "Everything", value: "", href: listHref("") },
					{ label: "Notices", value: "notices", href: listHref("notices") },
					{ label: "Offers", value: "offers", href: listHref("offers") },
				]}
			/>

			{notices && (
				<section aria-labelledby="notices-title" className="mt-8">
					<h2 id="notices-title" className="text-2xl font-semibold tracking-tight text-site-ink">
						Notices
					</h2>
					{notices.blogs.length === 0 ? (
						<EmptyNotice title="No notices right now." description="Embassy updates and community announcements will appear here." />
					) : (
						<>
							<div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
								{notices.blogs.map((b) => (
									<ContentCard
										key={b.id}
										href={`/blogs/${b.slug}`}
										title={b.title}
										excerpt={b.excerpt}
										image={b.cover_image_url}
										imageAlt={b.cover_image_alt}
										eyebrow={b.tags.filter((t) => t !== ANNOUNCEMENT_TAG).slice(0, 2).join(" · ") || undefined}
										meta={<time dateTime={b.published_at ?? undefined}>{formatDate(b.published_at, { dateStyle: "long" })}</time>}
										headingLevel="h3"
									/>
								))}
							</div>
							{show === "notices" ? (
								<div className="mt-12">
									<Pagination tone="site" page={page} perPage={BLOGS_PER_PAGE} total={notices.total} basePath="/bulletin" params={{ show }} />
								</div>
							) : (
								notices.total > notices.blogs.length && (
									<p className="mt-6">
										<a href={listHref("notices")} className="font-semibold text-accent hover:underline">
											All {notices.total} notices →
										</a>
									</p>
								)
							)}
						</>
					)}
				</section>
			)}

			{offers && (
				<section aria-labelledby="offers-title" className="mt-14">
					<h2 id="offers-title" className="text-2xl font-semibold tracking-tight text-site-ink">
						Offers from friends of Merkado PH
					</h2>
					{offers.promotions.length === 0 ? (
						<EmptyNotice title="No offers right now." description="Partner offers will appear here when there are any." />
					) : (
						<>
							<div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
								{offers.promotions.map((p) => (
									<ContentCard
										key={p.id}
										href={`/promotions/${p.slug}`}
										title={p.title}
										excerpt={p.excerpt}
										image={p.cover_image_url}
										imageAlt={p.cover_image_alt}
										eyebrow={p.discount_label ?? undefined}
										meta={p.ends_at ? <>Until {formatDate(p.ends_at, { dateStyle: "long" })}</> : undefined}
										headingLevel="h3"
									/>
								))}
							</div>
							{show === "offers" ? (
								<div className="mt-12">
									<Pagination tone="site" page={page} perPage={PROMOTIONS_PER_PAGE} total={offers.total} basePath="/bulletin" params={{ show }} />
								</div>
							) : (
								offers.total > offers.promotions.length && (
									<p className="mt-6">
										<a href={listHref("offers")} className="font-semibold text-accent hover:underline">
											All {offers.total} offers →
										</a>
									</p>
								)
							)}
						</>
					)}
				</section>
			)}
		</main>
	);
}
