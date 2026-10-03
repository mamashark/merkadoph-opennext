import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Layers, Wallet } from "lucide-react";
import { getPublicServiceBySlug } from "@/lib/services";
import { summarize } from "@/lib/content";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { BackFooter, Body, CoverFigure, CtaLink, DetailHeader, Facts } from "@/components/site/detail";
import { JsonLd } from "@/components/site/json-ld";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
	const service = await getPublicServiceBySlug((await params).slug);
	if (!service) return { title: "Service not found", robots: { index: false } };

	return pageMetadata({
		title: service.meta_title || service.title,
		description: summarize(service),
		path: `/services/${service.slug}`,
		image: service.cover_image_url ? { url: service.cover_image_url, alt: service.cover_image_alt } : null,
		tags: service.tags,
	});
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
	const service = await getPublicServiceBySlug((await params).slug);
	if (!service) notFound();

	const path = `/services/${service.slug}`;

	return (
		<main>
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "Service",
						name: service.title,
						description: summarize(service),
						url: absoluteUrl(path),
						image: service.cover_image_url ?? undefined,
						serviceType: service.category ?? undefined,
						provider: organization,
						areaServed: { "@type": "Country", name: "Philippines" },
					},
					breadcrumbs([
						{ name: "Services", path: "/services" },
						{ name: service.title, path },
					]),
				]}
			/>

			<article>
				<DetailHeader backHref="/services" backLabel="All services" tags={service.tags} title={service.title} excerpt={service.excerpt} />

				<Facts
					facts={[
						{ icon: Layers, label: "Category", value: service.category },
						{ icon: Wallet, label: "Pricing", value: service.price_label },
					]}
				>
					{service.cta_url && <CtaLink href={service.cta_url}>{service.cta_label || "Get in touch"}</CtaLink>}
				</Facts>

				<CoverFigure src={service.cover_image_url} alt={service.cover_image_alt || service.title} caption={service.cover_image_alt} />
				<Body content={service.content} />
			</article>

			<BackFooter href="/services" label="Back to all services" />
		</main>
	);
}
