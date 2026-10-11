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
			<header className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
				<h1 className="text-3xl font-semibold tracking-tight text-stone-950 dark:text-white sm:text-4xl">{title}</h1>
				{page.updated_at && (
					<p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
						Last updated <time dateTime={page.updated_at}>{formatDate(page.updated_at)}</time>
					</p>
				)}
			</header>
			<Body content={body} />
		</main>
	);
}
