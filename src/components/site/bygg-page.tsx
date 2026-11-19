import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BYGG } from "@/lib/bygg-content";
import { BUSINESSES } from "@/lib/businesses";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { SiteShell } from "@/components/site/site-shell";
import { JsonLd } from "@/components/site/json-ld";
import { ContactForm } from "@/components/home/contact-form";
import { plexMono } from "@/components/constellation/fonts";
import hl from "@/components/highlights/highlights.module.css";
import styles from "./bygg-page.module.css";

const b = BUSINESSES.bygg;
const pad = (n: number) => String(n).padStart(2, "0");
/** The Bygg Highlight's colour on the homepage, as this page's accent. */
const accent = { "--c": "var(--orange)", "--c-fill": "var(--orange-fill)" } as React.CSSProperties;

export async function byggMetadata(): Promise<Metadata> {
	const meta = await pageMetadata({ title: BYGG.metaTitle, description: BYGG.metaDescription, path: b.path, image: { url: BYGG.hero.src, alt: BYGG.hero.alt } });
	return { ...meta, openGraph: { ...meta.openGraph, locale: "sv_SE" } };
}

/**
 * Merkado Byggnadsavdelning, in Swedish, in the homepage's theme (day sky / night sky, brand palette):
 * hero photo → about with figures → roofing services → reasons → contact with the form → sign-off.
 * Content: src/lib/bygg-content.ts.
 */
export function ByggPage() {
	return (
		<SiteShell contactHref="#kontakt" tone="night">
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
			<main lang="sv" className={`${hl.root} ${plexMono.variable}`} style={accent} aria-labelledby="bygg-title">
				{/* Hero */}
				<header className={styles.hero}>
					<Image src={BYGG.hero.src} alt={BYGG.hero.alt} fill priority sizes="100vw" className={styles.heroImg} />
					<div className={`${hl.wrap} ${styles.heroText}`}>
						<span className={styles.logoTile}>
							{/* eslint-disable-next-line @next/next/no-img-element -- small SVG logo */}
							<img src={BYGG.logo.vertical} alt="" width={132} height={132} />
						</span>
						<p className={`${hl.kicker} ${hl.mono}`} style={{ marginTop: 22 }}>
							{b.eyebrow} · Västra Götaland
						</p>
						<h1 id="bygg-title">{b.name}</h1>
						<p className={styles.lede}>{BYGG.metaDescription}</p>
						<div className={styles.heroActions}>
							<a href="#kontakt" className={`${hl.btn} ${hl.btnSolid}`}>
								Boka kostnadsfri konsultation
							</a>
							<a href="#tjanster" className={hl.btn}>
								{BYGG.servicesHeading} ↓
							</a>
						</div>
					</div>
				</header>

				{/* About + figures */}
				<section className={hl.about} aria-labelledby="bygg-about">
					<div className={hl.wrap}>
						<p className={hl.eyebrow}>Merkado PH · Bygg</p>
						<h2 id="bygg-about">
							Din Byggare i <em>Tiden!</em>
						</h2>
						<p className={hl.aboutLede}>{BYGG.intro}</p>
						<p className={styles.partner}>{BYGG.partner}</p>
						<dl className={hl.stats}>
							<div>
								<dt>Takläggningstjänster</dt>
								<dd>{BYGG.services.length}</dd>
							</div>
							<div>
								<dt>Egen byggnadsställning, upp till</dt>
								<dd>9 m</dd>
							</div>
							<div>
								<dt>Konsultation, kostnadsfri</dt>
								<dd>0 kr</dd>
							</div>
						</dl>
					</div>
				</section>

				{/* Roofing services */}
				<section className={hl.world} id="tjanster" aria-labelledby="bygg-services">
					<div className={hl.wrap}>
						<div className={hl.worldHead}>
							<div>
								<span className={`${hl.kicker} ${hl.mono}`}>01 — Tjänster</span>
								<h2 id="bygg-services">
									Våra <em className={hl.long}>Takläggnings&shy;tjänster</em>
								</h2>
							</div>
						</div>
						<div className={styles.rows}>
							{BYGG.services.map((s, i) => (
								<article key={s.slug} id={s.slug} className={`${hl.card} ${styles.row}`}>
									<div className={styles.rowImg}>
										<Image src={s.image.src} alt={s.image.alt} fill sizes="(max-width: 760px) 100vw, 640px" />
									</div>
									<div className={styles.rowText}>
										<span className={`${hl.num} ${hl.mono}`}>{pad(i + 1)}</span>
										<h3>{s.title}</h3>
										<p>{s.text}</p>
									</div>
								</article>
							))}
						</div>
					</div>
				</section>

				{/* Why us */}
				<section className={hl.world} aria-labelledby="bygg-why">
					<div className={hl.wrap}>
						<div className={hl.worldHead}>
							<div>
								<span className={`${hl.kicker} ${hl.mono}`}>02 — Varför oss</span>
								<h2 id="bygg-why">
									Varför Välja <em>Merkado PH?</em>
								</h2>
							</div>
						</div>
						<ul className={styles.reasons}>
							{BYGG.reasons.map((r, i) => (
								<li key={r.title} className={`${hl.card} ${styles.reason}`}>
									<span className={`${hl.num} ${hl.mono}`}>{pad(i + 1)}</span>
									<h3>{r.title}</h3>
									<p>{r.text}</p>
								</li>
							))}
						</ul>
					</div>
				</section>

				{/* Contact */}
				<section className={hl.contact} id="kontakt" aria-labelledby="bygg-contact">
					<div className={`${hl.wrap} ${hl.contactGrid}`}>
						<div>
							<p className={hl.eyebrow}>Kontakta oss</p>
							<h2 id="bygg-contact">
								Redo att starta ditt <em>byggprojekt?</em>
							</h2>
							<p className={hl.aboutLede}>{BYGG.cta.text}</p>
							<ul className={styles.reach}>
								<li>
									<span className={`${styles.reachLabel} ${hl.mono}`}>Ring</span>
									<a href={BYGG.cta.phone.href}>{BYGG.cta.phone.label}</a>
								</li>
								<li>
									<span className={`${styles.reachLabel} ${hl.mono}`}>Mejl</span>
									<a href={`mailto:${BYGG.cta.email}`}>{BYGG.cta.email}</a>
								</li>
							</ul>
							<div className={styles.photo}>
								<Image src={BYGG.cta.image.src} alt={BYGG.cta.image.alt} fill sizes="420px" />
							</div>
						</div>
						<div className={hl.form}>
							<p className={styles.partner} style={{ margin: "0 0 18px" }}>
								{BYGG.cta.formLead}
							</p>
							<ContactForm topics={[b.name, ...BYGG.services.map((s) => s.title)]} locale="sv" />
						</div>
					</div>
				</section>

				{/* Sign-off */}
				<section className={hl.signoff} aria-label={b.name}>
					<div className={`${hl.wrap} ${hl.signoffRow}`}>
						<div>
							<span className={styles.signLogo}>
								<Image src={BYGG.logo.horizontal} alt="" width={200} height={67} />
							</span>
							<p className={hl.signoffTitle} style={{ marginTop: 18, fontSize: "clamp(22px, 2.6vw, 34px)" }}>
								{BYGG.footerTitle}
							</p>
							<p>{BYGG.partner}</p>
						</div>
						<p>
							<Link href="/" lang="en">
								← Merkado PH
							</Link>
						</p>
					</div>
				</section>
			</main>
		</SiteShell>
	);
}
