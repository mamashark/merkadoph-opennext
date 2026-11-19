import type { Metadata } from "next";
import { getPublicServiceBySlug, getPublicServices } from "@/lib/services";
import { summarize } from "@/lib/content";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import type { Business } from "@/lib/businesses";
import { Body, CoverFigure, CtaLink } from "@/components/site/detail";
import { ContentCard, PageIntro } from "@/components/site/content-card";
import { JsonLd } from "@/components/site/json-ld";

/** Up to this many offerings are listed (services in the business's category). */
const MAX_OFFERINGS = 24;

async function load(b: Business) {
	const [main, list] = await Promise.all([
		getPublicServiceBySlug(b.slug).catch(() => null),
		getPublicServices(b.category, 1, MAX_OFFERINGS + 1).catch(() => ({ services: [], total: 0 })),
	]);
	return { main, offerings: list.services.filter((s) => s.slug !== b.slug).slice(0, MAX_OFFERINGS) };
}

export async function businessMetadata(b: Business): Promise<Metadata> {
	const { main } = await load(b);
	return pageMetadata({
		title: main?.meta_title || b.name,
		description: main ? summarize(main) : b.intro,
		path: b.path,
		image: main?.cover_image_url ? { url: main.cover_image_url, alt: main.cover_image_alt } : null,
	});
}

/**
 * /bygg and /digital: the business's main text from Admin → Services, its offerings and a way to get in touch.
 * Until the main service is published, the page shows only the short intro and any offerings.
 */
export async function BusinessPage({ business: b }: { business: Business }) {
	const { main, offerings } = await load(b);
	const description = main ? summarize(main) : b.intro;

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "Service",
						name: b.name,
						description,
						url: absoluteUrl(b.path),
						image: main?.cover_image_url ?? undefined,
						provider: organization,
						...(offerings.length > 0 && {
							hasOfferCatalog: {
								"@type": "OfferCatalog",
								name: b.name,
								itemListElement: offerings.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.title, url: absoluteUrl(`/services/${s.slug}`) } })),
							},
						}),
					},
					breadcrumbs([{ name: b.name, path: b.path }]),
				]}
			/>

			<PageIntro eyebrow={b.eyebrow} title={b.name} description={main?.excerpt || b.intro}>
				<div className="mt-6 flex flex-wrap gap-3">
					<CtaLink href={main?.cta_url || "/#contact"}>{main?.cta_label || "Get in touch"}</CtaLink>
				</div>
			</PageIntro>

			{main && (
				<article className="mt-10">
					<CoverFigure src={main.cover_image_url} alt={main.cover_image_alt || b.name} caption={main.cover_image_alt} />
					<Body content={main.content} />
				</article>
			)}

			{offerings.length > 0 && (
				<section className="mt-14" aria-labelledby={`${b.id}-offer-title`}>
					<h2 id={`${b.id}-offer-title`} className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
						What we offer
					</h2>
					<div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{offerings.map((s) => (
							<ContentCard
								key={s.id}
								href={`/services/${s.slug}`}
								title={s.title}
								excerpt={s.excerpt}
								image={s.cover_image_url ?? undefined}
								imageAlt={s.cover_image_alt ?? undefined}
								eyebrow={s.price_label ?? undefined}
								headingLevel="h3"
							/>
						))}
					</div>
				</section>
			)}
		</main>
	);
}
