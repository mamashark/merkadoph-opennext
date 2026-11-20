#!/usr/bin/env node
/**
 * Moves blog posts to Community Impact (the portfolios table, public at /impact, grouped by year):
 *   1. creates an entry with the post's title, slug, text and cover, the date it took place, and every photo
 *      in the post (cover + inline images, with their captions) as its gallery,
 *   2. sets the blog post to draft (nothing is deleted, so it can be undone in Admin → Blogs),
 *   3. if the post was public, adds a 301 redirect /blogs/<slug> → /impact/<slug> (Admin → SEO → Redirects).
 * A published post becomes a published entry; a draft post becomes a draft entry (finish it in Admin → Community Impact).
 *
 * One post:
 *   node scripts/move-blog-to-impact.mjs --slug <blog-slug> --date YYYY-MM-DD [--location "…"] [--excerpt "…"] [--title "…"] [--tags "A, B"] [--dry-run]
 * Several posts (a JSON list of { slug, date, location?, excerpt?, title?, tags? }):
 *   node scripts/move-blog-to-impact.mjs --plan scripts/impact-moves.json [--dry-run]
 *
 * Always run with --dry-run first. Afterwards purge "Blogs" and "Community Impact" in Admin → Cache.
 * Reads NEXT_PUBLIC_SUPABASE_URL from .env.local and SUPABASE_SERVICE_ROLE_KEY from .dev.vars or the environment.
 *
 * Done on 2026-11-19 (Kay): a-concert-for-a-cause-song-weavers-philippines-live-in-alvangen (2025-10-25, Smyrnakyrkan, Älvängen).
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const args = process.argv.slice(2);
const option = (name) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined;
};
const DRY = args.includes("--dry-run");

/** @type {{ slug: string, date: string, location?: string, excerpt?: string, title?: string, tags?: string[] | string }[]} */
let plan;
if (option("plan")) {
	plan = JSON.parse(fs.readFileSync(path.resolve(root, option("plan")), "utf8"));
	if (!Array.isArray(plan)) throw new Error("The plan must be a JSON list.");
} else {
	if (!option("slug")) throw new Error("Pass --slug <blog-slug> --date YYYY-MM-DD, or --plan <file.json>.");
	plan = [{ slug: option("slug"), date: option("date"), location: option("location"), excerpt: option("excerpt"), title: option("title"), tags: option("tags") }];
}
plan.forEach((p, i) => {
	const at = `Plan item ${i + 1} (${p.slug ?? "no slug"})`;
	if (!p.slug) throw new Error(`${at}: slug is required.`);
	// The date puts the entry under its year; Community Impact needs it to publish.
	if (!p.date || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) throw new Error(`${at}: date (YYYY-MM-DD) is required.`);
	if (p.location && p.location.length > 120) throw new Error(`${at}: location is at most 120 characters.`);
	if (p.excerpt && p.excerpt.length > 500) throw new Error(`${at}: excerpt is at most 500 characters.`);
	if (p.title && p.title.length > 200) throw new Error(`${at}: title is at most 200 characters.`);
});

const readEnv = (file) => {
	const full = path.join(root, file);
	if (!fs.existsSync(full)) return {};
	return Object.fromEntries(
		fs
			.readFileSync(full, "utf8")
			.split(/\r?\n/)
			.filter((l) => /^[A-Z_]+=/.test(l))
			.map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
	);
};
const env = { ...readEnv(".env.local"), ...readEnv(".dev.vars"), ...process.env };
const SUPABASE = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (.env.local) or SUPABASE_SERVICE_ROLE_KEY (.dev.vars or environment).");
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
/** Only our own storage images can go in a gallery (the site checks this too). */
const MEDIA_PREFIX = `${SUPABASE}/storage/v1/object/public/`;

async function rest(method, pathAndQuery, body, prefer = "return=representation") {
	const res = await fetch(`${SUPABASE}/rest/v1/${pathAndQuery}`, { method, headers: { ...headers, Prefer: prefer }, body: body ? JSON.stringify(body) : undefined });
	if (!res.ok) throw new Error(`${method} ${pathAndQuery}: ${res.status} ${await res.text()}`);
	// "return=minimal" answers with an empty body (201 or 204).
	const text = await res.text();
	return text ? JSON.parse(text) : null;
}

/** Plain text for summaries: drops Markdown emphasis, links and line breaks. */
const plain = (s) =>
	(s ?? "")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[*_`>#]/g, "")
		.replace(/\s+/g, " ")
		.trim();
const clip = (s, n) => (s.length > n ? `${s.slice(0, s.lastIndexOf(" ", n - 1)).trimEnd()}…` : s);

/** The post's photos for the gallery: the cover, then each inline image with the italic caption under it. */
function galleryFrom(blog) {
	const out = [];
	const add = (url, alt, description = "") => {
		if (!url?.startsWith(MEDIA_PREFIX) || out.some((g) => g.url === url) || out.length >= 40) return;
		out.push({ url, alt: clip(plain(alt) || blog.title, 200), description: clip(plain(description), 500) });
	};
	add(blog.cover_image_url, blog.cover_image_alt);
	const lines = (blog.content ?? "").split(/\r?\n/);
	lines.forEach((line, i) => {
		for (const m of line.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)) {
			// A caption is the next non-empty line when it's in italics: *…* or _…_
			const next = lines.slice(i + 1).find((l) => l.trim());
			const caption = next && /^\s*[*_][^*_].*[*_]\s*$/.test(next) ? next : "";
			add(m[2], m[1] || caption, caption);
		}
	});
	return out;
}
const tagList = (t, fallback) => (Array.isArray(t) ? t : typeof t === "string" ? t.split(",") : fallback ?? []).map((x) => String(x).trim()).filter(Boolean).slice(0, 10);

let failed = 0;
for (const p of plan) {
	console.log(`\n— ${p.slug}`);
	try {
		const [blog] = await rest("GET", `blogs?select=*&slug=eq.${encodeURIComponent(p.slug)}`);
		if (!blog) throw new Error(`No blog post with slug "${p.slug}".`);
		const [taken] = await rest("GET", `portfolios?select=id&slug=eq.${encodeURIComponent(p.slug)}`);
		if (taken) {
			console.log(`  Skipped: a Community Impact entry with this slug already exists (id ${taken.id}).`);
			continue;
		}
		const live = blog.status === "published" && (!blog.published_at || new Date(blog.published_at) <= new Date());
		const excerpt = clip(plain(p.excerpt ?? blog.excerpt), 500);
		const images = galleryFrom(blog);
		const entry = {
			title: p.title ?? blog.title,
			slug: blog.slug,
			excerpt,
			content: blog.content,
			cover_image_url: blog.cover_image_url,
			cover_image_alt: blog.cover_image_alt,
			images,
			location: p.location ?? null,
			completed_on: p.date,
			tags: tagList(p.tags, blog.tags),
			meta_title: blog.meta_title && blog.meta_title.length <= 70 ? blog.meta_title : null,
			meta_description: clip(excerpt, 160),
			// Same visibility as the post: publishing also needs at least one photo.
			status: live && images.length ? "published" : "draft",
			published_at: live && images.length ? (blog.published_at ?? new Date().toISOString()) : null,
		};
		const redirect = live ? { from_path: `/blogs/${blog.slug}`, to_path: `/impact/${blog.slug}`, status: 301, source: "manual", note: "Moved from Blog to Community Impact" } : null;

		if (DRY) {
			console.log(`  Would create a ${entry.status} entry "${entry.title}" dated ${entry.completed_on}${entry.location ? `, ${entry.location}` : ""}, ${images.length} photo(s), tags: ${entry.tags.join(", ") || "none"}.`);
			console.log(`  Would set the blog post to draft${redirect ? ` and add the redirect ${redirect.from_path} → ${redirect.to_path}` : " (it isn't public, so no redirect)"}.`);
			continue;
		}
		const [created] = await rest("POST", "portfolios", entry);
		console.log(`  Created ${entry.status} entry ${created.id}: /impact/${created.slug} (${images.length} photos)`);
		try {
			if (blog.status !== "draft") await rest("PATCH", `blogs?id=eq.${blog.id}`, { status: "draft" }, "return=minimal");
			console.log("  Blog post set to draft.");
			if (redirect) {
				await rest("POST", "redirects", redirect, "return=minimal");
				console.log(`  Redirect added: ${redirect.from_path} → ${redirect.to_path}`);
			}
		} catch (err) {
			failed++;
			console.error(`  The entry was created, but a later step failed: ${err.message}`);
			console.error("  Finish it by hand: set the blog post to draft in Admin → Blogs and add the redirect in Admin → SEO → Redirects.");
		}
	} catch (err) {
		failed++;
		console.error(`  Not moved: ${err.message}`);
	}
}
if (failed) process.exitCode = 1;
console.log(DRY ? "\nDry run: nothing changed." : '\nNext: purge "Blogs" and "Community Impact" in Admin → Cache.');
