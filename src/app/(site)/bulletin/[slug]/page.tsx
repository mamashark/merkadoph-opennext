import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarClock, CalendarDays, Download, Languages, Newspaper, Landmark } from "lucide-react";
import { getPublicBulletinBySlug } from "@/lib/bulletin";
import { MEDIA_TYPE_LABEL, TYPE_LABEL, languageLabel } from "@/lib/bulletin-shared";
import { summarize } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { BackFooter, Body, CoverFigure, CtaLink, DetailHeader, Facts } from "@/components/site/detail";
import { JsonLd } from "@/components/site/json-ld";

// Cached as an ISR page; refreshed once a day, when saved, or within 15 minutes of expiring (scheduled refresh).
export const revalidate = 86400;

export function generateStaticParams() {
	return [];
}

export async function generateMetadata({ params }: PageProps<"/bulletin/[slug]">): Promise<Metadata> {
	const n = await getPublicBulletinBySlug((await params).slug);
	if (!n) return { title: "Notice not found", robots: { index: false } };
	return pageMetadata({
		title: n.meta_title || n.title,
		description: n.meta_description || summarize({ excerpt: n.excerpt, content: n.content, meta_description: null }),
		path: `/bulletin/${n.slug}`,
		image: n.cover_image_url ? { url: n.cover_image_url, alt: n.cover_image_alt } : null,
		type: "article",
		publishedTime: n.published_at,
		modifiedTime: n.updated_at,
		tags: n.tags,
	});
}

const LABEL = "font-label text-xs font-medium tracking-[0.14em] uppercase";

export default async function BulletinItemPage({ params }: PageProps<"/bulletin/[slug]">) {
	const n = await getPublicBulletinBySlug((await params).slug);
	if (!n) notFound();

	const path = `/bulletin/${n.slug}`;
	const official = n.content_type === "embassy_update";
	const external = !!n.publisher || official;
	const caption = [n.image_caption, n.image_credit && `Photo: ${n.image_credit}`].filter(Boolean).join(" · ") || null;

	return (
		<main className="accent-bulletin">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "Article",
						headline: n.title,
						description: summarize({ excerpt: n.excerpt, content: n.content, meta_description: n.meta_description }),
						url: absoluteUrl(path),
						image: n.cover_image_url ?? undefined,
						datePublished: n.published_at ?? undefined,
						dateModified: n.updated_at,
						inLanguage: n.language,
						// Our own summary page; the original source (if any) is linked, never claimed as ours.
						publisher: organization,
						...(n.source_url ? { isBasedOn: n.source_url } : {}),
					},
					breadcrumbs([
						{ name: "Bulletin Board", path: "/bulletin" },
						{ name: n.title, path },
					]),
				]}
			/>

			<article>
				<DetailHeader backHref="/bulletin" backLabel="Bulletin Board" tags={[n.category.name, ...n.tags]} title={n.title} excerpt={n.excerpt}>
					{official && (
						<p className="mt-5 border-l-2 border-accent pl-3 text-sm text-site-ink-2">
							Official information from the Philippine Embassy, summarised by Merkado PH. Always check the Embassy&rsquo;s original announcement for the
							exact details.
						</p>
					)}
				</DetailHeader>

				<Facts
					facts={[
						{ icon: official ? Landmark : Newspaper, label: n.publisher ? "Published by" : "Issued by", value: n.publisher?.name ?? n.author_name ?? (official ? "Philippine Embassy" : TYPE_LABEL[n.content_type]) },
						{ icon: CalendarDays, label: "Date", value: formatDate(n.original_published_on ?? n.published_at, { dateStyle: "long" }) },
						{ icon: CalendarClock, label: "Until", value: n.expires_at ? formatDate(n.expires_at, { dateStyle: "long" }) : null },
						{ icon: Newspaper, label: "Media", value: n.media_type ? MEDIA_TYPE_LABEL[n.media_type] : null },
						{ icon: Languages, label: "Language", value: n.language !== "en" ? languageLabel(n.language) : null },
					]}
				>
					{n.cta_url && <CtaLink href={n.cta_url}>{n.cta_label || "Find out more"}</CtaLink>}
					{n.source_url && (
						<CtaLink href={n.source_url} variant={n.cta_url ? "secondary" : "primary"}>
							{official ? "Read the official announcement" : external ? "Read the original" : "Source"}
						</CtaLink>
					)}
				</Facts>

				<CoverFigure src={n.cover_image_url} alt={n.cover_image_alt || n.title} caption={caption} />
				<Body content={n.content} />

				{(n.attachments.length > 0 || n.media_contact || n.event || n.project) && (
					<section aria-labelledby="more-heading" className="mx-auto w-full max-w-[42rem] space-y-6 px-4 pb-10 sm:px-8">
						<h2 id="more-heading" className={`kicker-mark ${LABEL} text-accent`}>
							More
						</h2>
						{n.attachments.length > 0 && (
							<ul className="space-y-2">
								{n.attachments.map((a) => (
									<li key={a.url}>
										<a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-site-ink underline-offset-4 hover:text-accent hover:underline">
											<Download className="h-4 w-4" aria-hidden /> {a.label}
											<span className="sr-only"> (opens in a new tab)</span>
										</a>
									</li>
								))}
							</ul>
						)}
						{n.media_contact && (
							<p className="text-sm text-site-ink-2">
								Media contact:{" "}
								<a href={`mailto:${n.media_contact}`} className="text-site-ink underline underline-offset-4 hover:text-accent">
									{n.media_contact}
								</a>
							</p>
						)}
						{(n.event || n.project) && (
							<ul className="space-y-2">
								{n.event && (
									<li>
										<Link href={`/events/${n.event.slug}`} className="inline-flex min-h-11 items-center gap-1.5 text-site-ink underline-offset-4 hover:text-accent hover:underline">
											Event: {n.event.title} <ArrowUpRight className="h-4 w-4" aria-hidden />
										</Link>
									</li>
								)}
								{n.project && (
									<li>
										<Link href={`/impact/${n.project.slug}`} className="inline-flex min-h-11 items-center gap-1.5 text-site-ink underline-offset-4 hover:text-accent hover:underline">
											Community Impact: {n.project.title} <ArrowUpRight className="h-4 w-4" aria-hidden />
										</Link>
									</li>
								)}
							</ul>
						)}
					</section>
				)}
			</article>

			<BackFooter href="/bulletin" label="Back to the Bulletin Board" />
		</main>
	);
}
