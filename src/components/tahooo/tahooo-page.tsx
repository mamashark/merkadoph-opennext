import type { Metadata } from "next";
import Image from "next/image";
import { TAHOOO, flavourImage } from "@/lib/tahooo-content";
import { absoluteUrl, breadcrumbs, organization, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/site/json-ld";
import { ContactForm } from "@/components/home/contact-form";
import { tahoooDisplay } from "./fonts";
import s from "./tahooo.module.css";

const PATH = "/tahooo";
const T = TAHOOO;
const pad = (n: number) => String(n).padStart(2, "0");
const Photo = ({ image, sizes = "(max-width: 820px) 100vw, 50vw", priority = false }: { image: { src: string; alt: string }; sizes?: string; priority?: boolean }) => (
	<div className={s.photo}>
		<Image src={image.src} alt={image.alt} fill sizes={sizes} priority={priority} />
	</div>
);
/** Swedish first, English second, as on the slides. */
const Label = ({ text }: { text: { sv: string; en: string } }) => (
	<p className={s.label}>
		<span lang="sv">{text.sv}</span> · {text.en}
	</p>
);

export async function tahoooMetadata(): Promise<Metadata> {
	return pageMetadata({ title: T.metaTitle, description: T.metaDescription, path: PATH, image: { url: T.book.image.src, alt: T.book.image.alt } });
}

/**
 * Tahooo Corner, after Kay's slides: hero → the call → what taho is → how it works → eight flavours →
 * perfect for (four occasions) → how to book → book now + form → inquiries. Content: src/lib/tahooo-content.ts.
 */
export function TahoooPage() {
	return (
		<main className={`${s.root} ${tahoooDisplay.variable}`} aria-labelledby="tahooo-title">
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

			{/* Hero */}
			<section className={s.split} aria-labelledby="tahooo-title">
				<div className={`${s.panel} ${s.heroText}`}>
					<Label text={T.hero.eyebrow} />
					<div className={s.panelTop}>
						<h1 id="tahooo-title" className={s.display}>
							Tahooo!
							<br />
							Corner
						</h1>
						<p className={s.svLine} lang="sv">
							{T.hero.lead.sv}
						</p>
						<p className={s.enLine}>{T.hero.lead.en}</p>
					</div>
					<div className={s.ctas}>
						<a href="#boka" className={s.btn}>
							<span lang="sv">Boka</span>&nbsp;· Book
						</a>
						<a href="#smaker" className={`${s.btn} ${s.btnGhost}`}>
							<span lang="sv">Smaker</span>&nbsp;· Flavours
						</a>
					</div>
				</div>
				<div className={s.heroCart}>
					<Image src={T.hero.cart.src} alt={T.hero.cart.alt} width={T.hero.cart.width} height={T.hero.cart.height} priority sizes="(max-width: 820px) 90vw, 640px" />
				</div>
			</section>

			{/* The call */}
			<section className={`${s.split} ${s.flip}`} aria-labelledby="call-title">
				<div className={s.panel}>
					<div className={s.panelTop}>
						<h2 id="call-title" className={s.display} style={{ fontStyle: "italic" }}>
							{T.call.title}
						</h2>
						<p className={s.svLine} lang="sv">
							{T.call.line.sv}
						</p>
						<p className={s.enLine}>{T.call.line.en}</p>
					</div>
					<div>
						<hr className={s.rule} />
						<p className={s.svLine} lang="sv">
							{T.call.now.sv}
						</p>
						<p className={s.enLine}>{T.call.now.en}</p>
					</div>
				</div>
				<Photo image={T.call.image} />
			</section>

			{/* What is taho */}
			<section className={s.split} aria-labelledby="taho-title">
				<div className={s.panel}>
					<div className={s.panelTop}>
						<Label text={T.whatIsTaho.eyebrow} />
						<h2 id="taho-title" className={s.display} lang="sv">
							{T.whatIsTaho.title.sv}
						</h2>
						<p className={s.svLine}>{T.whatIsTaho.title.en}</p>
					</div>
					<ol className={s.layers}>
						{T.whatIsTaho.layers.map((l, i) => (
							<li key={l.sv}>
								<b aria-hidden="true">{pad(i + 1)}</b>
								<span>
									<i lang="sv">{l.sv}</i>
									{l.en}
								</span>
							</li>
						))}
					</ol>
				</div>
				<div className={s.meet}>
					<div className={s.meetText}>
						<p>{T.whatIsTaho.meet}</p>
						<p>{T.whatIsTaho.meetLine}</p>
					</div>
					<Photo image={T.whatIsTaho.image} />
				</div>
			</section>

			{/* How it works */}
			<section className={s.split} aria-labelledby="how-title">
				<div className={s.panel}>
					<div className={s.panelTop}>
						<Label text={T.howItWorks.eyebrow} />
						<h2 id="how-title" className={s.display}>
							{T.howItWorks.title}
						</h2>
						<p className={s.svLine} lang="sv">
							{T.howItWorks.line.sv}
						</p>
						<p className={s.enLine}>{T.howItWorks.line.en}</p>
					</div>
					<ol className={s.points}>
						{T.howItWorks.points.map((p, i) => (
							<li key={p.sv}>
								<b aria-hidden="true">{pad(i + 1)}</b>
								<strong lang="sv">{p.sv}</strong>
								<span>{p.en}</span>
							</li>
						))}
					</ol>
				</div>
				<Photo image={T.howItWorks.image} />
			</section>

			{/* Flavours */}
			<section className={s.flavours} id="smaker" aria-labelledby="flavours-title">
				<Label text={T.flavoursIntro.eyebrow} />
				<h2 id="flavours-title" className={s.display} lang="sv">
					{T.flavoursIntro.title.sv}
				</h2>
				<p className={s.sub}>{T.flavoursIntro.title.en}</p>
				<ul className={s.flavourGrid}>
					{T.flavours.map((f) => (
						<li key={f.id} id={f.id}>
							<h3 className={s.srOnly}>
								{f.name}
								{f.premium ? " (premium)" : ""}: {f.line}
							</h3>
							<div className={s.flavourImg}>
								<Image
									src={flavourImage(f.id)}
									alt={`${f.name} taho: ${f.ingredients.join(", ").toLowerCase()}`}
									fill
									sizes="(max-width: 1000px) 50vw, 25vw"
								/>
							</div>
						</li>
					))}
				</ul>
			</section>

			{/* Perfect for */}
			{T.occasions.map((o, i) => (
				<section key={o.id} id={o.id} className={s.split} aria-labelledby={`${o.id}-title`}>
					<div className={s.panel}>
						<div className={s.panelTop}>
							<Label text={T.occasionsEyebrow} />
							<h2 id={`${o.id}-title`} className={s.display} lang="sv">
								{o.sv}
							</h2>
							<p className={s.sub}>{o.en}</p>
						</div>
						<div>
							<hr className={s.rule} />
							<p className={s.svLine} lang="sv">
								{o.line.sv}
							</p>
							<p className={s.enLine}>{o.line.en}</p>
						</div>
					</div>
					<div className={s.occPhoto}>
						<Photo image={o.image} />
						<p className={s.band} lang="sv">
							{o.examples}
						</p>
					</div>
				</section>
			))}

			{/* How to book */}
			<section className={s.split} aria-labelledby="steps-title">
				<div className={s.panel}>
					<div className={s.panelTop}>
						<Label text={T.howToBook.eyebrow} />
						<h2 id="steps-title" className={s.display} lang="sv">
							{T.howToBook.title.sv}
						</h2>
						<p className={s.sub}>{T.howToBook.title.en}</p>
					</div>
					<ol className={s.steps}>
						{T.howToBook.steps.map((st, i) => (
							<li key={st.sv}>
								<b>
									Step {i + 1}: <span lang="sv">{st.sv}</span>
								</b>
								{st.en}
							</li>
						))}
					</ol>
				</div>
				<Photo image={T.howToBook.image} />
			</section>

			{/* Book now */}
			<section className={`${s.split} ${s.flip}`} aria-labelledby="book-title">
				<div className={s.panel}>
					<Label text={T.book.eyebrow} />
					<div className={s.panelTop}>
						<h2 id="book-title" className={s.display} lang="sv">
							{T.book.title.sv}
						</h2>
						<p className={s.sub} lang="sv">
							{T.book.occasions}
						</p>
						<p className={s.enLine}>{T.book.line}</p>
					</div>
					<div className={s.ctas}>
						<a href="#boka" className={s.btn}>
							<span lang="sv">Skicka en förfrågan</span>&nbsp;· Send a request
						</a>
					</div>
				</div>
				<Photo image={T.book.image} />
			</section>

			<section className={s.formWrap} id="boka" aria-labelledby="form-title">
				<h2 id="form-title">
					<span lang="sv">Boka ditt Tahooo Corner</span> · {T.book.title.en}
				</h2>
				<div className={s.form}>
					<ContactForm topics={T.occasions.map((o) => `Tahooo Corner: ${o.en}`)} />
				</div>
			</section>

			{/* Inquiries */}
			<section className={s.split} aria-labelledby="inquiries-title">
				<div className={`${s.panel} ${s.inquiries}`} style={{ justifyContent: "center" }}>
					<h2 id="inquiries-title">{T.contact.title}</h2>
					<dl>
						<div>
							<dt>Email</dt>
							<dd>
								<a href={`mailto:${T.contact.email}`}>{T.contact.email}</a>
							</dd>
						</div>
						<div>
							<dt>Social Media</dt>
							<dd>{T.contact.social}</dd>
						</div>
						<div>
							<dt>Call us</dt>
							<dd>
								<a href={T.contact.phone.href}>{T.contact.phone.label}</a>
							</dd>
						</div>
					</dl>
				</div>
				<Photo image={T.contact.image} />
			</section>
		</main>
	);
}
