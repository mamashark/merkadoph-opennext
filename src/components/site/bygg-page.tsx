import type { Metadata } from "next";
import Image from "next/image";
import { BYGG } from "@/lib/bygg-content";
import { BUSINESSES } from "@/lib/businesses";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/site/json-ld";
import { ContactForm } from "@/components/home/contact-form";

const b = BUSINESSES.bygg;

export async function byggMetadata(): Promise<Metadata> {
	const meta = await pageMetadata({ title: BYGG.metaTitle, description: BYGG.metaDescription, path: b.path, image: { url: BYGG.hero.src, alt: BYGG.hero.alt } });
	return { ...meta, openGraph: { ...meta.openGraph, locale: "sv_SE" } };
}

/** White bands: a white page in light mode, the site's dark stone in dark mode. Headings in the brand orange. */
const heading = "font-display font-bold tracking-tight text-bygg-orange-ink dark:text-brand-orange";
/** Blue bands keep the old page's blue in both themes, with white text. */
const blue = "bg-bygg-blue text-white";

/**
 * Merkado Byggnadsavdelning, in Swedish: the old Shopify building page rebuilt with the site's components.
 * Banner photo → logo and intro → roofing services (blue) → reasons → contact (blue) with the form → logo sign-off.
 */
export function ByggPage() {
	return (
		<main lang="sv">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "RoofingContractor",
						name: b.name,
						description: BYGG.intro,
						url: absoluteUrl(b.path),
						image: absoluteUrl(BYGG.hero.src),
						logo: absoluteUrl(BYGG.logo.horizontal),
						email: BYGG.cta.email,
						telephone: BYGG.cta.phone.href.replace("tel:", ""),
						areaServed: { "@type": "AdministrativeArea", name: "Västra Götaland" },
						parentOrganization: organization,
						hasOfferCatalog: {
							"@type": "OfferCatalog",
							name: BYGG.servicesHeading,
							itemListElement: BYGG.services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.title, description: s.text, url: absoluteUrl(`${b.path}#${s.slug}`) } })),
						},
					},
					breadcrumbs([{ name: b.name, path: b.path }]),
				]}
			/>

			{/* Banner */}
			<div className="relative aspect-[3/2] max-h-[78svh] w-full overflow-hidden bg-stone-200 sm:aspect-[16/7] dark:bg-stone-800">
				<Image src={BYGG.hero.src} alt={BYGG.hero.alt} fill priority sizes="100vw" className="object-cover" />
			</div>

			{/* Logo, slogan and intro */}
			<section className="bg-white px-4 py-14 text-center sm:py-20 dark:bg-stone-950">
				<h1 className="mx-auto w-fit">
					{/* The logo is the page title; it has its own colours, so it sits on a light tile in dark mode. */}
					<span className="block rounded-2xl p-3 dark:bg-white">
						{/* eslint-disable-next-line @next/next/no-img-element -- small SVG logo, no optimisation needed */}
						<img src={BYGG.logo.vertical} alt={b.name} width={200} height={200} className="h-40 w-40 sm:h-48 sm:w-48" />
					</span>
				</h1>
				<p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-bygg-orange-ink dark:text-brand-orange">{BYGG.slogan}</p>
				<p className="mx-auto mt-4 max-w-2xl text-lg text-stone-800 dark:text-stone-200">{BYGG.intro}</p>
				<p className="mt-4 text-sm italic text-stone-700 dark:text-stone-300">{BYGG.partner}</p>
				<p className="mt-8">
					<a
						href="#kontakt"
						className="inline-flex min-h-11 items-center rounded-lg bg-bygg-blue px-5 text-sm font-semibold text-white hover:bg-bygg-blue/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bygg-blue focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-950"
					>
						Boka kostnadsfri konsultation
					</a>
				</p>
			</section>

			{/* Roofing services: photo and text side by side, alternating */}
			<section className={`${blue} px-4 py-16 sm:py-24`} aria-labelledby="bygg-services">
				<h2 id="bygg-services" className="text-center font-display text-3xl font-bold italic tracking-tight sm:text-4xl">
					{BYGG.servicesHeading}
				</h2>
				<div className="mx-auto mt-12 max-w-5xl space-y-10 sm:space-y-0">
					{BYGG.services.map((s, i) => (
						<article key={s.slug} id={s.slug} className="grid scroll-mt-24 items-center gap-6 sm:grid-cols-2 sm:gap-0">
							<div className={`relative aspect-[3/2] overflow-hidden ${i % 2 ? "sm:order-2" : ""}`}>
								<Image src={s.image.src} alt={s.image.alt} fill sizes="(max-width: 640px) 100vw, 512px" className="object-cover" />
							</div>
							<div className="sm:px-10">
								<h3 className="font-display text-xl font-bold italic tracking-tight sm:text-2xl">{s.title}</h3>
								<p className="mt-3 leading-relaxed text-white/90">{s.text}</p>
							</div>
						</article>
					))}
				</div>
			</section>

			{/* Why choose us */}
			<section className="bg-white px-4 py-16 sm:py-24 dark:bg-stone-950" aria-labelledby="bygg-why">
				<h2 id="bygg-why" className={`${heading} text-center text-3xl italic sm:text-4xl`}>
					{BYGG.whyHeading}
				</h2>
				<ul className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
					{BYGG.reasons.map((r) => (
						<li key={r.title} className="rounded-xl bg-orange-50/70 p-5 dark:bg-white/5">
							<h3 className={`${heading} text-base`}>{r.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-stone-800 dark:text-stone-300">{r.text}</p>
						</li>
					))}
				</ul>
			</section>

			{/* Contact */}
			<section id="kontakt" className={`${blue} scroll-mt-16 px-4 py-16 sm:py-24`} aria-labelledby="bygg-contact">
				<div className="mx-auto grid max-w-5xl items-center gap-8 sm:grid-cols-[2fr_3fr] sm:gap-12">
					<div className="relative aspect-[3/2] overflow-hidden rounded-xl">
						<Image src={BYGG.cta.image.src} alt={BYGG.cta.image.alt} fill sizes="(max-width: 640px) 100vw, 400px" className="object-cover" />
					</div>
					<div>
						<h2 id="bygg-contact" className="font-display text-3xl font-bold italic tracking-tight sm:text-4xl">
							{BYGG.cta.heading}
						</h2>
						<p className="mt-4 leading-relaxed text-white/90">{BYGG.cta.text}</p>
						<ul className="mt-4 space-y-1">
							<li>
								<span aria-hidden>📞 </span>Ring:{" "}
								<a href={BYGG.cta.phone.href} className="font-semibold underline underline-offset-4">
									{BYGG.cta.phone.label}
								</a>
							</li>
							<li>
								<span aria-hidden>📧 </span>Mejl:{" "}
								<a href={`mailto:${BYGG.cta.email}`} className="font-semibold underline underline-offset-4">
									{BYGG.cta.email}
								</a>
							</li>
						</ul>
						<p className="mt-4 text-white/90">{BYGG.cta.formLead}</p>
					</div>
				</div>
				<div className="mx-auto mt-10 max-w-3xl rounded-2xl bg-white p-5 text-stone-900 sm:p-8 dark:bg-stone-950 dark:text-stone-100">
					<ContactForm topics={[b.name, ...BYGG.services.map((s) => s.title)]} locale="sv" />
				</div>
			</section>

			{/* Sign-off */}
			<section className="bg-white px-4 py-12 text-center dark:bg-stone-950" aria-label="Merkado Byggnadsavdelning">
				<span className="mx-auto block w-fit rounded-xl p-2 dark:bg-white">
					<Image src={BYGG.logo.horizontal} alt="" width={240} height={80} className="h-auto w-56" />
				</span>
				<p className={`${heading} mt-4 text-base`}>{BYGG.footerTitle}</p>
				<p className="mt-1 text-sm italic text-stone-700 dark:text-stone-300">{BYGG.partner}</p>
			</section>
		</main>
	);
}
