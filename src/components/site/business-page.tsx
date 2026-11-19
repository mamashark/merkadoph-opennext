import type { Metadata } from "next";
import { getPublicServiceBySlug, getPublicServices } from "@/lib/services";
import { summarize } from "@/lib/content";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import type { ServiceBusiness as Business } from "@/lib/businesses";
import { Body, CoverFigure, CtaLink } from "@/components/site/detail";
import { ContentCard, PageIntro } from "@/components/site/content-card";
import { JsonLd } from "@/components/site/json-ld";
import { ContactForm } from "@/components/home/contact-form";

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
	const meta = await pageMetadata({
		title: main?.meta_title || b.name,
		description: main ? summarize(main) : b.intro,
		path: b.path,
		image: main?.cover_image_url ? { url: main.cover_image_url, alt: main.cover_image_alt } : null,
	});
	return meta;
}

/**
 * /digital: the business's main text from Admin → Services, its offerings and the contact form.
 * Until the main service is published, the page shows only the short intro and any offerings.
 */
export async function BusinessPage({ business: b }: { business: Business }) {
	const { main, offerings } = await load(b);
	const description = main ? summarize(main) : b.intro;

	return (
		<main lang={b.lang} className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "Service",
						name: b.name,
						description,
						url: absoluteUrl(b.path),
						inLanguage: b.lang,
						image: main?.cover_image_url ?? undefined,
						provider: organization,
						...(offerings.length > 0 && {
							hasOfferCatalog: {
								"@type": "OfferCatalog",
								name: b.servicesHeading,
								itemListElement: offerings.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.title, url: absoluteUrl(`/services/${s.slug}`) } })),
							},
						}),
					},
					breadcrumbs([{ name: b.name, path: b.path }]),
				]}
			/>

			<PageIntro eyebrow={b.eyebrow} title={b.name} description={main?.excerpt || b.intro}>
				<div className="mt-6 flex flex-wrap gap-3">
					<CtaLink href={main?.cta_url || "#contact"}>{main?.cta_label || b.ctaDefault}</CtaLink>
				</div>
			</PageIntro>

			{main?.cover_image_url && <CoverFigure src={main.cover_image_url} alt={main.cover_image_alt || b.name} caption={null} />}

			{offerings.length > 0 && (
				<section className="mt-14" aria-labelledby={`${b.id}-offer-title`}>
					<h2 id={`${b.id}-offer-title`} className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
						{b.servicesHeading}
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

			{main && <Body content={main.content} />}

			<section id="contact" className="mx-auto mt-6 max-w-3xl scroll-mt-24" aria-labelledby={`${b.id}-contact-title`}>
				<h2 id={`${b.id}-contact-title`} className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
					{b.contactHeading}
				</h2>
				<p className="mt-2 text-stone-700 dark:text-stone-300">{b.contactLede}</p>
				<div className="mt-6">
					<ContactForm topics={[b.name, ...offerings.map((s) => s.title)]} locale={b.lang} />
				</div>
			</section>
		</main>
	);
}
