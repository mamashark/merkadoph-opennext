import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import { getSeoSettings } from "@/lib/site-settings";

type Input = {
	title: string;
	description: string;
	path: string;
	image?: { url: string; alt?: string | null } | null;
	type?: "website" | "article";
	publishedTime?: string | null;
	modifiedTime?: string | null;
	authors?: string[];
	tags?: string[];
};

/**
 * Consistent title/description/canonical/Open Graph/Twitter metadata for public pages.
 * Pages without their own image share the default image from Admin → SEO.
 */
export async function pageMetadata({ title, description, path, image, type = "website", publishedTime, modifiedTime, authors, tags }: Input): Promise<Metadata> {
	const seo = await getSeoSettings();
	const images = image?.url ? [{ url: image.url, alt: image.alt || title }] : seo.default_og_image ? [{ url: seo.default_og_image, alt: seo.default_og_alt || SITE_NAME }] : undefined;
	return {
		title,
		description,
		alternates: { canonical: path, types: { "application/rss+xml": [{ url: "/blogs/rss.xml", title: `${SITE_NAME} blog` }] } },
		keywords: tags?.length ? tags : undefined,
		authors: authors?.map((name) => ({ name })),
		openGraph: {
			type,
			url: path,
			title,
			description,
			siteName: SITE_NAME,
			locale: "en_PH",
			images,
			...(type === "article" ? { publishedTime: publishedTime ?? undefined, modifiedTime: modifiedTime ?? undefined, authors, tags } : {}),
		},
		twitter: { card: images ? "summary_large_image" : "summary", title, description, images: images?.map((i) => i.url) },
	};
}

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;

export const organization = {
	"@type": "Organization",
	"@id": `${SITE_URL}/#organization`,
	name: SITE_NAME,
	url: SITE_URL,
	logo: { "@type": "ImageObject", url: `${SITE_URL}/android-chrome-512x512.png` },
} as const;

export function breadcrumbs(items: Array<{ name: string; path: string }>) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: absoluteUrl(item.path) })),
	};
}
