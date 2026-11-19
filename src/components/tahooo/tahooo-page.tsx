import type { Metadata } from "next";
import Image from "next/image";
import { TAHOOO } from "@/lib/tahooo-content";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/site/json-ld";
import { ContactForm } from "@/components/home/contact-form";
import { tahoooBody, tahoooDisplay } from "./fonts";
import styles from "./tahooo.module.css";

const PATH = "/tahooo";

export async function tahoooMetadata(): Promise<Metadata> {
	return pageMetadata({ title: TAHOOO.metaTitle, description: TAHOOO.metaDescription, path: PATH, image: { url: TAHOOO.cart.src, alt: TAHOOO.cart.alt } });
}

/**
 * Tahooo Corner, in the Tahooo brand: hero with the cart → what taho is → the menu → occasions → booking form.
 * English, with the brand's Swedish lines (tagline, flavour names) marked lang="sv". Content: src/lib/tahooo-content.ts.
 */
export function TahoooPage() {
	return (
		<main className={`${styles.root} ${tahoooDisplay.variable} ${tahoooBody.variable}`} aria-labelledby="tahooo-title">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "FoodService",
						name: TAHOOO.name,
						description: TAHOOO.metaDescription,
						url: absoluteUrl(PATH),
						image: absoluteUrl(TAHOOO.cart.src),
						areaServed: { "@type": "City", name: TAHOOO.area },
						provider: organization,
					},
					breadcrumbs([{ name: TAHOOO.name, path: PATH }]),
				]}
			/>

			{/* Hero */}
			<div className={`${styles.wrap} ${styles.hero}`}>
				<div>
					<span className={styles.logoTile}>
						{/* eslint-disable-next-line @next/next/no-img-element -- vector logo */}
						<img src={TAHOOO.logo.src} alt={TAHOOO.brand} width={TAHOOO.logo.width} height={TAHOOO.logo.height} />
					</span>
					<h1 id="tahooo-title">{TAHOOO.name}</h1>
					<p className={styles.tagline} lang="sv">
						{TAHOOO.tagline.sv}
					</p>
					<p className={styles.taglineEn}>{TAHOOO.tagline.en} Taho at your event in Gothenburg.</p>
					<div className={styles.actions}>
						<a href="#boka" className={styles.btn}>
							Book Tahooo Corner
						</a>
						<a href="#meny" className={`${styles.btn} ${styles.btnGhost}`}>
							See the flavours
						</a>
					</div>
					<p className={styles.sister}>{TAHOOO.sister}</p>
				</div>
				<div className={styles.cart}>
					<Image src={TAHOOO.cart.src} alt={TAHOOO.cart.alt} fill priority sizes="(max-width: 860px) 90vw, 520px" />
				</div>
			</div>

			{/* What is taho */}
			<section className={styles.section} aria-labelledby="taho-title">
				<div className={`${styles.wrap} ${styles.explain}`}>
					<div>
						<p className={styles.eyebrow}>Taho</p>
						<h2 id="taho-title">The morning call of the Philippines</h2>
					</div>
					<p>{TAHOOO.whatIsTaho}</p>
				</div>
			</section>

			{/* Menu */}
			<section className={styles.section} id="meny" aria-labelledby="menu-title">
				<div className={styles.wrap}>
					<div className={styles.head}>
						<p className={styles.eyebrow} lang="sv">
							Meny · Menu
						</p>
						<h2 id="menu-title">Flavours</h2>
					</div>
					<ul className={styles.menu}>
						{TAHOOO.flavours.map((f) => (
							<li key={f.id} id={f.id} className={styles.flavour}>
								<span className={styles.dot} data-c={f.colour} aria-hidden="true" />
								<span>
									<b lang="sv">{f.sv}</b>
									{f.en !== f.sv && <small>{f.en}</small>}
								</span>
							</li>
						))}
					</ul>
					<ul className={styles.facts}>
						<li>
							<b>Sizes</b> {TAHOOO.sizes}
						</li>
						<li>
							<b lang="sv">{TAHOOO.addOns.sv}</b> · {TAHOOO.addOns.en}
						</li>
						<li>
							<b lang="sv">{TAHOOO.allergens.sv}</b> · {TAHOOO.allergens.en}
						</li>
					</ul>
				</div>
			</section>

			{/* Occasions */}
			<section className={styles.section} aria-labelledby="occasions-title">
				<div className={styles.wrap}>
					<div className={styles.head}>
						<p className={styles.eyebrow}>Tahooo Corner</p>
						<h2 id="occasions-title">Bring the cart to your celebration</h2>
						<p className={styles.lede}>We come with the cart and serve fresh taho at your event in {TAHOOO.area}.</p>
					</div>
					<ul className={styles.occasions}>
						{TAHOOO.occasions.map((o) => (
							<li key={o}>{o}</li>
						))}
					</ul>
				</div>
			</section>

			{/* Booking */}
			<section className={styles.section} id="boka" aria-labelledby="book-title">
				<div className={`${styles.wrap} ${styles.book}`}>
					<div>
						<p className={styles.eyebrow} lang="sv">
							Boka · Book
						</p>
						<h2 id="book-title">Book Tahooo Corner</h2>
						<p className={styles.lede}>Send us a message and we&rsquo;ll get back to you with availability and a price. Tell us:</p>
						<ul className={styles.checklist}>
							<li>the date and time</li>
							<li>where the event is</li>
							<li>roughly how many guests</li>
							<li>which flavours you&rsquo;d like</li>
						</ul>
					</div>
					<div className={styles.form}>
						<ContactForm topics={TAHOOO.occasions.map((o) => `Tahooo Corner: ${o.toLowerCase()}`)} />
					</div>
				</div>
			</section>
		</main>
	);
}
