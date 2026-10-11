import { getPublishedBlogs } from "@/lib/blogs";
import { getSeoSettings } from "@/lib/site-settings";
import { stageGateEnabled } from "@/lib/stage";
import { SITE_NAME, SITE_URL } from "@/lib/env";

/**
 * Blog RSS 2.0 feed: [site]/blogs/rss.xml (linked from every page's <head> and the footer).
 * Cached like the blog pages; refreshed when posts are saved and via Admin → Cache → Blogs.
 */
export const revalidate = 300;

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export async function GET() {
	// The proxy doesn't run for .xml paths, so honour the "coming soon" gate here.
	if (stageGateEnabled()) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

	const [{ blogs }, seo] = await Promise.all([getPublishedBlogs(1, 30).catch(() => ({ blogs: [] })), getSeoSettings()]);
	const items = blogs
		.map((b) => {
			const url = `${SITE_URL}/blogs/${b.slug}`;
			return `
		<item>
			<title>${esc(b.title)}</title>
			<link>${esc(url)}</link>
			<guid isPermaLink="true">${esc(url)}</guid>
			<pubDate>${new Date(b.published_at ?? b.created_at).toUTCString()}</pubDate>${b.excerpt ? `\n\t\t\t<description>${esc(b.excerpt)}</description>` : ""}${b.author_name ? `\n\t\t\t<dc:creator>${esc(b.author_name)}</dc:creator>` : ""}${(b.tags ?? []).map((t) => `\n\t\t\t<category>${esc(t)}</category>`).join("")}${
				b.cover_image_url ? `\n\t\t\t<enclosure url="${esc(b.cover_image_url)}" type="image/webp" length="0" />` : ""
			}
		</item>`;
		})
		.join("");

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
	<channel>
		<title>${esc(`${SITE_NAME} blog`)}</title>
		<link>${SITE_URL}/blogs</link>
		<description>${esc(seo.site_description)}</description>
		<language>en</language>
		<atom:link href="${SITE_URL}/blogs/rss.xml" rel="self" type="application/rss+xml" />${blogs[0] ? `\n\t\t<lastBuildDate>${new Date(blogs[0].updated_at).toUTCString()}</lastBuildDate>` : ""}${items}
	</channel>
</rss>
`;
	return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
