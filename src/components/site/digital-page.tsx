import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Megaphone, MonitorSmartphone, Palette } from "lucide-react";
import { DIGITAL } from "@/lib/digital-content";
import { BUSINESSES } from "@/lib/businesses";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { SiteShell } from "@/components/site/site-shell";
import { JsonLd } from "@/components/site/json-ld";
import { ContactForm } from "@/components/home/contact-form";
import { plexMono } from "@/components/constellation/fonts";
import hl from "@/components/highlights/highlights.module.css";
import styles from "./digital-page.module.css";

const b = BUSINESSES.digital;
const pad = (n: number) => String(n).padStart(2, "0");
/** The Digital Highlight's colour on the homepage, as this page's accent. */
const accent = { "--c": "var(--blue)", "--c-fill": "var(--blue-fill)" } as React.CSSProperties;
const ICONS = { palette: Palette, megaphone: Megaphone, monitor: MonitorSmartphone, compass: Compass } as const;

export function digitalMetadata(): Promise<Metadata> {
	return pageMetadata({ title: DIGITAL.metaTitle, description: DIGITAL.metaDescription, path: b.path });
}

/**
 * Merkado PH Digital, in the homepage's theme (day sky / night sky, brand palette), like /bygg:
 * hero → about → the four services → how we work → contact with the form → sign-off.
 * Content: src/lib/digital-content.ts.
 */
export function DigitalPage() {
	return (
		<SiteShell contactHref="#contact" tone="night">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "ProfessionalService",
						name: b.name,
						description: DIGITAL.metaDescription,
						url: absoluteUrl(b.path),
						email: DIGITAL.contact.email,
						areaServed: { "@type": "Country", name: "Sweden" },
						parentOrganization: organization,
						hasOfferCatalog: {
							"@type": "OfferCatalog",
							name: DIGITAL.servicesHeading,
							itemListElement: DIGITAL.services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.title, description: s.text, url: absoluteUrl(`${b.path}#${s.slug}`) } })),
						},
					},
					breadcrumbs([{ name: b.name, path: b.path }]),
				]}
			/>
			<main className={`${hl.root} ${plexMono.variable}`} style={accent} aria-labelledby="digital-title">
				{/* Hero: the four services as a small constellation behind the title */}
				<header className={styles.hero}>
					<svg className={styles.sky} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
						<g className={styles.lines}>
							<line x1="200" y1="150" x2="92" y2="78" />
							<line x1="200" y1="150" x2="318" y2="64" />
							<line x1="200" y1="150" x2="326" y2="226" />
							<line x1="200" y1="150" x2="84" y2="236" />
							<line x1="92" y1="78" x2="318" y2="64" />
							<line x1="326" y1="226" x2="84" y2="236" />
						</g>
						<g className={styles.nodes}>
							<rect x="195" y="145" width="10" height="10" />
							<rect x="88" y="74" width="8" height="8" />
							<rect x="314" y="60" width="8" height="8" />
							<rect x="322" y="222" width="8" height="8" />
							<rect x="80" y="232" width="8" height="8" />
						</g>
					</svg>
					<div className={`${hl.wrap} ${styles.heroText}`}>
						<p className={`${hl.kicker} ${hl.mono}`}>{DIGITAL.eyebrow}</p>
						<h1 id="digital-title">
							Merkado PH <em>Digital</em>
						</h1>
						<p className={styles.lede}>{DIGITAL.lede}</p>
						<div className={styles.heroActions}>
							<a href="#contact" className={`${hl.btn} ${hl.btnSolid}`}>
								Start a project
							</a>
							<a href="#services" className={hl.btn}>
								{DIGITAL.servicesHeading} ↓
							</a>
						</div>
						<ul className={styles.jump} aria-label={DIGITAL.servicesHeading}>
							{DIGITAL.services.map((s, i) => (
								<li key={s.slug}>
									<a href={`#${s.slug}`}>
										<span className={hl.mono}>{pad(i + 1)}</span> {s.title}
									</a>
								</li>
							))}
						</ul>
					</div>
				</header>

				{/* About */}
				<section className={hl.about} aria-labelledby="digital-about">
					<div className={hl.wrap}>
						<p className={hl.eyebrow}>Merkado PH · Digital</p>
						<h2 id="digital-about">
							Para sa <em>negosyo mo</em>
						</h2>
						<p className={hl.aboutLede}>{DIGITAL.intro}</p>
					</div>
				</section>

				{/* Services */}
				<section className={hl.world} id="services" aria-labelledby="digital-services">
					<div className={hl.wrap}>
						<div className={hl.worldHead}>
							<div>
								<span className={`${hl.kicker} ${hl.mono}`}>01 — Services</span>
								<h2 id="digital-services">
									What we <em>do</em>
								</h2>
							</div>
						</div>
						<div className={styles.services}>
							{DIGITAL.services.map((s, i) => {
								const Icon = ICONS[s.icon];
								return (
									<article key={s.slug} id={s.slug} className={`${hl.card} ${styles.service}`} aria-labelledby={`${s.slug}-title`}>
										<div className={styles.serviceHead}>
											<span className={styles.icon}>
												<Icon aria-hidden />
											</span>
											<span className={`${hl.num} ${hl.mono}`}>{pad(i + 1)}</span>
										</div>
										<h3 id={`${s.slug}-title`}>{s.title}</h3>
										<p className={styles.tagline}>{s.tagline}</p>
										<p>{s.text}</p>
										<ul className={styles.includes} aria-label={`${s.title}: what's included`}>
											{s.includes.map((x) => (
												<li key={x}>{x}</li>
											))}
										</ul>
									</article>
								);
							})}
						</div>
					</div>
				</section>

				{/* How we work */}
				<section className={hl.world} aria-labelledby="digital-process">
					<div className={hl.wrap}>
						<div className={hl.worldHead}>
							<div>
								<span className={`${hl.kicker} ${hl.mono}`}>02 — {DIGITAL.processHeading}</span>
								<h2 id="digital-process">
									Step by <em>step</em>
								</h2>
							</div>
						</div>
						<ol className={styles.steps}>
							{DIGITAL.process.map((p, i) => (
								<li key={p.title} className={`${hl.card} ${styles.step}`}>
									<span className={`${hl.num} ${hl.mono}`}>{pad(i + 1)}</span>
									<h3>{p.title}</h3>
									<p>{p.text}</p>
								</li>
							))}
						</ol>
					</div>
				</section>

				{/* Contact */}
				<section className={hl.contact} id="contact" aria-labelledby="digital-contact">
					<div className={`${hl.wrap} ${hl.contactGrid}`}>
						<div>
							<p className={hl.eyebrow}>Get in touch</p>
							<h2 id="digital-contact">
								Tara, <em>usap tayo</em>
							</h2>
							<p className={hl.aboutLede}>{DIGITAL.contact.text}</p>
							<p className={styles.mail}>
								<span className={hl.mono}>Email</span>
								<a href={`mailto:${DIGITAL.contact.email}`}>{DIGITAL.contact.email}</a>
							</p>
						</div>
						<div className={hl.form}>
							<h3 className={styles.formTitle}>{DIGITAL.contact.heading}</h3>
							<ContactForm topics={DIGITAL.services.map((s) => `${b.name}: ${s.title}`)} />
						</div>
					</div>
				</section>

				{/* Sign-off */}
				<section className={hl.signoff} aria-label={b.name}>
					<div className={`${hl.wrap} ${hl.signoffRow}`}>
						<p className={hl.signoffTitle}>
							Merkado PH <em>Digital</em>
						</p>
						<p>
							<Link href="/">← Merkado PH</Link>
						</p>
					</div>
				</section>
			</main>
		</SiteShell>
	);
}
