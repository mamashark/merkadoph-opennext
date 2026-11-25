import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { TAHOOO, FLAVOUR_RATIO, flavourImage } from "@/lib/tahooo-content";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { SiteShell } from "@/components/site/site-shell";
import { JsonLd } from "@/components/site/json-ld";
import { ContactForm } from "@/components/home/contact-form";
import { plexMono } from "@/components/constellation/fonts";
import hl from "@/components/highlights/highlights.module.css";
import styles from "./tahooo.module.css";

const PATH = "/tahooo";
const T = TAHOOO;
const pad = (n: number) => String(n).padStart(2, "0");
/** The Project Taho Highlight's colour on the homepage (caramel), as this page's accent. */
const accent = { "--c": "var(--caramel)", "--c-fill": "var(--caramel-fill)" } as React.CSSProperties;
/** Swedish label with its English twin, as on Kay's slides. */
const Sv = ({ text }: { text: { sv: string; en: string } }) => (
	<>
		<span lang="sv">{text.sv}</span> · {text.en}
	</>
);

export async function tahoooMetadata(): Promise<Metadata> {
	return pageMetadata({ title: T.metaTitle, description: T.metaDescription, path: PATH, image: { url: T.book.image.src, alt: T.book.image.alt } });
}

/**
 * Tahooo Corner (the Project Taho Highlight), in the homepage's theme like /bygg and /digital:
 * hero with the cart → what taho is → eight flavours → perfect for → how to book → book with the form → sign-off.
 * Content: src/lib/tahooo-content.ts.
 */
export function TahoooPage() {
	return (
		<SiteShell contactHref="#boka">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "FoodService",
						name: T.name,
						description: T.metaDescription,
						url: absoluteUrl(PATH),
						image: absoluteUrl(T.book.image.src),
						email: T.contact.email,
						telephone: T.contact.phone.href.replace("tel:", ""),
						areaServed: { "@type": "City", name: "Gothenburg" },
						provider: organization,
						hasMenu: { "@type": "Menu", hasMenuItem: T.flavours.map((f) => ({ "@type": "MenuItem", name: f.name, description: `${f.line}. ${f.ingredients.join(", ")}.` })) },
					},
					breadcrumbs([{ name: T.name, path: PATH }]),
				]}
			/>
			<main className={`${hl.root} ${plexMono.variable}`} style={accent} aria-labelledby="tahooo-title">
				{/* Hero: the cart beside the title */}
				<header className={styles.hero}>
					<div className={`${hl.wrap} ${styles.heroGrid}`}>
						<div className={styles.heroText}>
							<p className={`${hl.kicker} ${hl.mono}`}>
								<Sv text={T.hero.eyebrow} /> · {T.area}
							</p>
							<h1 id="tahooo-title">
								Tahooo! <em>Corner</em>
							</h1>
							<p className={styles.lede}>{T.hero.lead.en}</p>
							<div className={styles.heroActions}>
								<a href="#boka" className={`${hl.btn} ${hl.btnSolid}`}>
									Book your corner
								</a>
								<a href="#smaker" className={hl.btn}>
									Flavours ↓
								</a>
							</div>
						</div>
						<div className={styles.cart}>
							<Image src={T.hero.cart.src} alt={T.hero.cart.alt} width={T.hero.cart.width} height={T.hero.cart.height} priority sizes="(max-width: 860px) 80vw, 560px" />
						</div>
					</div>
				</header>

				{/* What is taho */}
				<section className={hl.about} aria-labelledby="tahooo-about">
					<div className={hl.wrap}>
						<p className={hl.eyebrow}>
							{T.call.title} <Sv text={T.whatIsTaho.eyebrow} />
						</p>
						<h2 id="tahooo-about">
							Three layers. <em>One memory.</em>
						</h2>
						<p className={hl.aboutLede}>
							{T.call.line.en} {T.whatIsTaho.meet} {T.whatIsTaho.meetLine} {T.call.now.en}
						</p>
						<ol className={styles.layers}>
							{T.whatIsTaho.layers.map((l, i) => (
								<li key={l.sv}>
									<span className={`${hl.num} ${hl.mono}`}>{pad(i + 1)}</span>
									<strong lang="sv">{l.sv}</strong>
									<span>{l.en}</span>
								</li>
							))}
						</ol>
					</div>
				</section>

				{/* Flavours */}
				<section className={hl.world} id="smaker" aria-labelledby="tahooo-flavours">
					<div className={hl.wrap}>
						<div className={hl.worldHead}>
							<div>
								<span className={`${hl.kicker} ${hl.mono}`}>
									01 — <Sv text={T.flavoursIntro.eyebrow} />
								</span>
								<h2 id="tahooo-flavours">
									Eight <em>flavours</em>
								</h2>
								<p>Warm or chilled, served cup by cup.</p>
							</div>
						</div>
						<ul className={styles.flavours}>
							{T.flavours.map((f) => (
								<li key={f.id} id={f.id} className={`${hl.card} ${styles.flavour}`}>
									<h3 className="sr-only">
										{f.name}
										{f.premium ? " (premium)" : ""}: {f.line}
									</h3>
									<div className={styles.flavourImg} style={{ aspectRatio: FLAVOUR_RATIO }}>
										<Image src={flavourImage(f.id)} alt={`${f.name} taho: ${f.ingredients.join(", ").toLowerCase()}`} fill sizes="(max-width: 860px) 50vw, 25vw" />
									</div>
								</li>
							))}
						</ul>
					</div>
				</section>

				{/* Perfect for */}
				<section className={hl.world} aria-labelledby="tahooo-occasions">
					<div className={hl.wrap}>
						<div className={hl.worldHead}>
							<div>
								<span className={`${hl.kicker} ${hl.mono}`}>
									02 — <Sv text={T.occasionsEyebrow} />
								</span>
								<h2 id="tahooo-occasions">
									Every <em>celebration</em>
								</h2>
							</div>
						</div>
						<ul className={styles.occasions}>
							{T.occasions.map((o) => (
								<li key={o.id} id={o.id} className={`${hl.card} ${styles.occasion}`}>
									<div className={styles.occasionImg}>
										<Image src={o.image.src} alt={o.image.alt} fill sizes="(max-width: 860px) 100vw, 33vw" />
									</div>
									<div className={styles.occasionText}>
										<span className={`${styles.tag} ${hl.mono}`} lang="sv">
											{o.sv}
										</span>
										<h3>{o.en}</h3>
										<p>{o.line.en}</p>
										<p className={styles.examples} lang="sv">
											{o.examples}
										</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				</section>

				{/* How to book */}
				<section className={hl.world} aria-labelledby="tahooo-steps">
					<div className={hl.wrap}>
						<div className={hl.worldHead}>
							<div>
								<span className={`${hl.kicker} ${hl.mono}`}>
									03 — <Sv text={T.howToBook.eyebrow} />
								</span>
								<h2 id="tahooo-steps">
									Three <em>steps</em>
								</h2>
							</div>
						</div>
						<ol className={styles.steps}>
							{T.howToBook.steps.map((st, i) => (
								<li key={st.sv} className={`${hl.card} ${styles.step}`}>
									<span className={`${hl.num} ${hl.mono}`}>{pad(i + 1)}</span>
									<h3 lang="sv">{st.sv}</h3>
									<p>{st.en}</p>
								</li>
							))}
						</ol>
					</div>
				</section>

				{/* Book */}
				<section className={hl.contact} id="boka" aria-labelledby="tahooo-book">
					<div className={`${hl.wrap} ${hl.contactGrid}`}>
						<div>
							<p className={hl.eyebrow}>
								<Sv text={T.book.eyebrow} />
							</p>
							<h2 id="tahooo-book">
								Book your <em>Tahooo Corner</em>
							</h2>
							<p className={hl.aboutLede}>{T.book.line}</p>
							<ul className={styles.reach}>
								<li>
									<span className={hl.mono}>Call</span>
									<a href={T.contact.phone.href}>{T.contact.phone.label}</a>
								</li>
								<li>
									<span className={hl.mono}>Email</span>
									<a href={`mailto:${T.contact.email}`}>{T.contact.email}</a>
								</li>
								<li>
									<span className={hl.mono}>Social media</span>
									<span>{T.contact.social}</span>
								</li>
							</ul>
							<div className={styles.photo}>
								<Image src={T.book.image.src} alt={T.book.image.alt} fill sizes="420px" />
							</div>
						</div>
						<div className={hl.form}>
							<h3 className={styles.formTitle}>
								<span lang="sv">Skicka en förfrågan</span> · Send a request
							</h3>
							<ContactForm topics={T.occasions.map((o) => `${T.name}: ${o.en}`)} />
						</div>
					</div>
				</section>

				{/* Sign-off */}
				<section className={hl.signoff} aria-label={T.name}>
					<div className={`${hl.wrap} ${hl.signoffRow}`}>
						<div>
							<p className={hl.signoffTitle}>
								Tahooo! <em>Corner</em>
							</p>
							<p>{T.brand}</p>
						</div>
						<p>
							<Link href="/">← Merkado PH</Link>
						</p>
					</div>
				</section>
			</main>
		</SiteShell>
	);
}
