import type { MetadataRoute } from "next";
import { getAllPublishedSlugs } from "@/lib/blogs";
import { SITE_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const posts = await getAllPublishedSlugs();
	return [
		{ url: SITE_URL, changeFrequency: "weekly", priority: 1 },
		{ url: `${SITE_URL}/blogs`, changeFrequency: "daily", priority: 0.8 },
		...posts.map((post) => ({ url: `${SITE_URL}/blogs/${post.slug}`, lastModified: post.updated_at, changeFrequency: "weekly" as const, priority: 0.7 })),
	];
}
