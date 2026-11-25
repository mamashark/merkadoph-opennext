import type { Metadata } from "next";
import { getLegalPages, getSeoSettings, LEGAL_PAGES, type LegalPageId } from "@/lib/site-settings";
import { fillLegal, legalTemplate } from "@/lib/legal-defaults";
import { breadcrumbs, pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/datetime";
import { Body } from "./detail";
import { JsonLd } from "./json-ld";

export function legalMetadata(id: LegalPageId): Promise<Metadata> {
	const { title, description, path } = LEGAL_PAGES[id];
	return pageMetadata({ title, description, path });
}

/** /privacy, /terms, /cookies: Markdown from Admin → SEO → Legal pages (or the starter template). */
export async function LegalPage({ id }: { id: LegalPageId }) {
	const [pages, seo] = await Promise.all([getLegalPages(), getSeoSettings()]);
	const { title, path } = LEGAL_PAGES[id];
	const page = pages[id];
	const body = fillLegal(page.body.trim() || legalTemplate(id), seo);

	return (
		<main>
			<JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: title, path }])} />
			{/* Same header as the other detail pages: kicker, display title, Plex Mono date line, 42rem column. */}
			<header className="mx-auto w-full max-w-[42rem] px-4 pt-10 sm:px-8 sm:pt-16">
				<p className="kicker-mark font-label text-xs font-medium tracking-[0.14em] text-accent uppercase">Information</p>
				<h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.04] font-bold tracking-tight text-site-ink">{title}</h1>
				{page.updated_at && (
					<p className="mt-4 font-label text-xs tracking-wide text-site-muted">
						Last updated <time dateTime={page.updated_at}>{formatDate(page.updated_at)}</time>
					</p>
				)}
			</header>
			<Body content={body} />
		</main>
	);
}
