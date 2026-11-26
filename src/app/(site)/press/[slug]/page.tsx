import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Download, ExternalLink, Languages, Newspaper } from "lucide-react";
import { getPublicBulletinBySlug } from "@/lib/bulletin";
import { MEDIA_TYPE_LABEL, TYPE_LABEL, itemBase, languageLabel } from "@/lib/bulletin-shared";
import { summarize } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { BackFooter, Body, CoverFigure, CtaLink, DetailHeader, Facts } from "@/components/site/detail";
import { JsonLd } from "@/components/site/json-ld";

// Cached as an ISR page; refreshed once a day or when saved.
export const revalidate = 86400;

export function generateStaticParams() {
	return [];
}

/**
 * Press items live on /press (spec §4.7). A request for one on /bulletin returns a plain 404 rather than redirecting
 * (Next forbids a redirect thrown from inside a cached page component).
 */
async function load(slug: string) {
	const item = await getPublicBulletinBySlug(slug);
	return item && itemBase(item.content_type) === "/press" ? item : null;
}

export async function generateMetadata({ params }: PageProps<"/press/[slug]">): Promise<Metadata> {
	const p = await load((await params).slug);
	if (!p) return { title: "Press item not found", robots: { index: false } };
	return pageMetadata({
		title: p.meta_title || p.title,
		// Never empty (guidelines §0.1).
		description:
			p.meta_description ||
			summarize({ excerpt: p.excerpt, content: p.content, meta_description: null }) ||
			`${TYPE_LABEL[p.content_type]}${p.publisher ? ` in ${p.publisher.name}` : ""}: ${p.title}. Merkado PH press & media.`,
		path: `/press/${p.slug}`,
		image: p.cover_image_url ? { url: p.cover_image_url, alt: p.cover_image_alt } : null,
		type: "article",
		publishedTime: p.original_published_on ?? p.published_at,
		modifiedTime: p.updated_at,
		tags: p.tags,
	});
}

const LABEL = "font-label text-xs font-medium tracking-[0.14em] uppercase";
const chrome = (p: { content_type: string }) => TYPE_LABEL[p.content_type as keyof typeof TYPE_LABEL] ?? "Press";

export default async function PressItemPage({ params }: PageProps<"/press/[slug]">) {
	const p = await load((await params).slug);
	if (!p) notFound();

	const path = `/press/${p.slug}`;
	const coverage = p.content_type === "media_coverage";
	const description = summarize({ excerpt: p.excerpt, content: p.content, meta_description: p.meta_description });
	const caption = [p.image_caption, p.image_credit && `Photo: ${p.image_credit}`].filter(Boolean).join(" · ") || null;

	return (
		<main className="accent-press">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": coverage ? "NewsArticle" : "Article",
						headline: p.title,
						...(description ? { description } : {}),
						url: absoluteUrl(path),
						image: p.cover_image_url ?? undefined,
						datePublished: p.original_published_on ?? p.published_at ?? undefined,
						dateModified: p.updated_at,
						inLanguage: p.language,
						// Our own summary page; the original (if any) is linked, never claimed as ours.
						publisher: organization,
						...(p.source_url ? { isBasedOn: p.source_url } : {}),
					},
					breadcrumbs([
						{ name: "Press & Media", path: "/press" },
						{ name: p.title, path },
					]),
				]}
			/>

			<article>
				<DetailHeader backHref="/press" backLabel="Press & Media" tags={[chrome(p), ...(p.publisher ? [p.publisher.name] : []), ...p.tags]} title={p.title} excerpt={p.excerpt}>
					{coverage && (
						<p className="mt-5 border-l-2 border-accent pl-3 text-sm text-site-ink-2">
							{p.publisher ? `Coverage of Merkado PH in ${p.publisher.name}` : "Coverage of Merkado PH"}
							{", summarised by us. "}
							Always read the original article for the full story.
						</p>
					)}
				</DetailHeader>

				<Facts
					facts={[
						{ icon: Newspaper, label: "Type", value: TYPE_LABEL[p.content_type] },
						{ icon: CalendarDays, label: "Published", value: formatDate(p.original_published_on ?? p.published_at, { dateStyle: "long" }) },
						{ icon: Newspaper, label: "Media", value: p.media_type ? MEDIA_TYPE_LABEL[p.media_type] : null },
						{ icon: Languages, label: "Language", value: p.source_language && p.source_language !== "en" ? languageLabel(p.source_language) : null },
					]}
				>
					{p.source_url && (
						<CtaLink href={p.source_url} variant={p.cta_url ? "secondary" : "primary"}>
							<ExternalLink className="h-4 w-4" aria-hidden /> {coverage ? `Read it in ${p.publisher?.name ?? "the original"}` : "Read the original"}
						</CtaLink>
					)}
					{p.cta_url && <CtaLink href={p.cta_url}>{p.cta_label || "Find out more"}</CtaLink>}
				</Facts>

				<CoverFigure src={p.cover_image_url} alt={p.cover_image_alt || p.title} caption={caption} />
				<Body content={p.content} />

				{(p.attachments.length > 0 || p.media_contact) && (
					<section aria-labelledby="press-more" className="mx-auto w-full max-w-[42rem] space-y-6 px-4 pb-10 sm:px-8">
						<h2 id="press-more" className={`kicker-mark ${LABEL} text-accent`}>
							More
						</h2>
						{p.attachments.length > 0 && (
							<ul className="space-y-2">
								{p.attachments.map((a) => (
									<li key={a.url}>
										<a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-site-ink underline-offset-4 hover:text-accent hover:underline">
											<Download className="h-4 w-4" aria-hidden /> {a.label}
											<span className="sr-only"> (opens in a new tab)</span>
										</a>
									</li>
								))}
							</ul>
						)}
						{p.media_contact && (
							<p className="text-sm text-site-ink-2">
								Media contact:{" "}
								<a href={`mailto:${p.media_contact}`} className="text-site-ink underline underline-offset-4 hover:text-accent">
									{p.media_contact}
								</a>
							</p>
						)}
					</section>
				)}
			</article>

			<BackFooter href="/press" label="Back to Press & Media" />
		</main>
	);
}
