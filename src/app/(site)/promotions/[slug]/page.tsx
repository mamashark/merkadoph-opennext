import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgePercent, CalendarRange, TicketPercent } from "lucide-react";
import { getPublicPromotionBySlug, promotionValidity } from "@/lib/promotions";
import { summarize } from "@/lib/content";
import { formatDayRange } from "@/lib/datetime";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { BackFooter, Body, CoverFigure, CtaLink, DetailHeader, Facts } from "@/components/site/detail";
import { JsonLd } from "@/components/site/json-ld";
import { CopyButton } from "@/components/ui/copy-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/promotions/[slug]">): Promise<Metadata> {
	const promo = await getPublicPromotionBySlug((await params).slug);
	if (!promo) return { title: "Promotion not found", robots: { index: false } };

	return pageMetadata({
		title: promo.meta_title || (promo.discount_label ? `${promo.discount_label} — ${promo.title}` : promo.title),
		description: summarize(promo),
		path: `/promotions/${promo.slug}`,
		image: promo.cover_image_url ? { url: promo.cover_image_url, alt: promo.cover_image_alt } : null,
		type: "article",
		publishedTime: promo.published_at,
		modifiedTime: promo.updated_at,
		tags: promo.tags,
	});
}

export default async function PromotionPage({ params }: PageProps<"/promotions/[slug]">) {
	const promo = await getPublicPromotionBySlug((await params).slug);
	if (!promo) notFound();

	const path = `/promotions/${promo.slug}`;
	const validity = promotionValidity(promo);
	const terms = promo.terms?.split(/\r?\n/).map((t) => t.replace(/^[-•*]\s*/, "").trim()).filter(Boolean) ?? [];

	return (
		<main>
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "Offer",
						name: promo.title,
						description: summarize(promo),
						url: absoluteUrl(path),
						image: promo.cover_image_url ?? undefined,
						validFrom: promo.starts_at ?? promo.published_at ?? undefined,
						validThrough: promo.ends_at ?? undefined,
						offeredBy: organization,
					},
					breadcrumbs([
						{ name: "Promotions", path: "/promotions" },
						{ name: promo.title, path },
					]),
				]}
			/>

			<article>
				<DetailHeader backHref="/promotions" backLabel="All promotions" tags={promo.tags} title={promo.title} excerpt={promo.excerpt}>
					{validity !== "active" && (
						<p className="mt-4 inline-flex rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-800 dark:bg-stone-800 dark:text-stone-200">
							{validity === "ended" ? "This promotion has ended" : "This promotion hasn't started yet"}
						</p>
					)}
				</DetailHeader>

				<Facts
					facts={[
						{ icon: BadgePercent, label: "Offer", value: promo.discount_label },
						{ icon: CalendarRange, label: "Valid", value: formatDayRange(promo.starts_at, promo.ends_at) },
						{
							icon: TicketPercent,
							label: "Promo code",
							value: promo.promo_code ? (
								<span className="inline-flex items-center gap-2">
									<code className="rounded-md bg-stone-100 px-2 py-1 font-mono text-base tracking-wider text-stone-900 dark:bg-stone-800 dark:text-white">{promo.promo_code}</code>
									<CopyButton value={promo.promo_code} label="Copy promo code" icon="copy" />
								</span>
							) : null,
						},
					]}
				>
					{validity !== "ended" && promo.cta_url && <CtaLink href={promo.cta_url}>{promo.cta_label || "Get the deal"}</CtaLink>}
				</Facts>

				<CoverFigure src={promo.cover_image_url} alt={promo.cover_image_alt || promo.title} caption={promo.cover_image_alt} />
				<Body content={promo.content} />

				{terms.length > 0 && (
					<section aria-labelledby="terms-heading" className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
						<h2 id="terms-heading" className="text-lg font-semibold text-stone-900 dark:text-white">
							Terms &amp; conditions
						</h2>
						<ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-stone-700 dark:text-stone-300">
							{terms.map((t, i) => (
								<li key={i}>{t}</li>
							))}
						</ul>
					</section>
				)}
			</article>

			<BackFooter href="/promotions" label="Back to all promotions" />
		</main>
	);
}
