#!/usr/bin/env node
/**
 * Moves a blog post to Community Impact (the portfolios table, public at /impact):
 *   1. creates a published project with the post's title, slug, text and cover (cover also added to the gallery),
 *   2. sets the blog post back to draft (nothing is deleted, so it can be undone in Admin → Blogs),
 *   3. adds a 301 redirect /blogs/<slug> → /impact/<slug> (Admin → SEO → Redirects).
 *
 *   node scripts/move-blog-to-impact.mjs --slug <blog-slug> [--date YYYY-MM-DD] [--location "…"] [--excerpt "…"] [--dry-run]
 *
 * Without --excerpt the post's excerpt is used. Afterwards purge "Blogs" and "Community Impact" in Admin → Cache.
 * Reads NEXT_PUBLIC_SUPABASE_URL from .env.local and SUPABASE_SERVICE_ROLE_KEY from .dev.vars or the environment.
 *
 * The move asked for on 2026-11-19 (Kay):
 *   node scripts/move-blog-to-impact.mjs --slug a-concert-for-a-cause-song-weavers-philippines-live-in-alvangen \
 *     --date 2025-10-25 --location "Smyrnakyrkan, Älvängen" \
 *     --excerpt "Made possible through the joint efforts and initiative of individual Filipinos from Västra Götaland region. All proceeds went toward supporting the mission of Song Weavers Philippines to nurture young talents, giving them the opportunity to grow as singers while pursuing their university studies as scholars."
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
const SLUG = option("slug");
const DATE = option("date");
const LOCATION = option("location");
const EXCERPT = option("excerpt");
if (!SLUG) throw new Error("Pass --slug <blog-slug>.");
if (DATE && !/^\d{4}-\d{2}-\d{2}$/.test(DATE)) throw new Error("--date must be YYYY-MM-DD.");
if (LOCATION && LOCATION.length > 120) throw new Error("--location is at most 120 characters.");
if (EXCERPT && EXCERPT.length > 500) throw new Error("--excerpt is at most 500 characters.");

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
const SUPABASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (.env.local) or SUPABASE_SERVICE_ROLE_KEY (.dev.vars or environment).");
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(method, pathAndQuery, body, prefer = "return=representation") {
	const res = await fetch(`${SUPABASE}/rest/v1/${pathAndQuery}`, { method, headers: { ...headers, Prefer: prefer }, body: body ? JSON.stringify(body) : undefined });
	if (!res.ok) throw new Error(`${method} ${pathAndQuery}: ${res.status} ${await res.text()}`);
	return res.status === 204 ? null : res.json();
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

const [blog] = await rest("GET", `blogs?select=*&slug=eq.${encodeURIComponent(SLUG)}`);
if (!blog) throw new Error(`No blog post with slug "${SLUG}".`);
const [taken] = await rest("GET", `portfolios?select=id&slug=eq.${encodeURIComponent(SLUG)}`);
if (taken) throw new Error(`A Community Impact project with slug "${SLUG}" already exists (id ${taken.id}). Nothing changed.`);

const excerpt = clip(plain(EXCERPT ?? blog.excerpt), 500);
const project = {
	title: blog.title,
	slug: blog.slug,
	excerpt,
	content: blog.content,
	cover_image_url: blog.cover_image_url,
	cover_image_alt: blog.cover_image_alt,
	images: blog.cover_image_url ? [{ url: blog.cover_image_url, alt: blog.cover_image_alt || blog.title }] : [],
	location: LOCATION ?? null,
	completed_on: DATE ?? null,
	tags: blog.tags ?? [],
	meta_title: blog.meta_title && blog.meta_title.length <= 70 ? blog.meta_title : null,
	meta_description: clip(excerpt, 160),
	status: "published",
	published_at: blog.published_at ?? new Date().toISOString(),
};
const redirect = { from_path: `/blogs/${blog.slug}`, to_path: `/impact/${blog.slug}`, status: 301, source: "manual", note: "Moved from Blog to Community Impact" };

if (DRY) {
	console.log("Would create the project:\n", JSON.stringify({ ...project, content: `${project.content.length} characters` }, null, 2));
	console.log(`Would set blog "${blog.title}" (${blog.id}) to draft.`);
	console.log("Would add the redirect:", JSON.stringify(redirect));
	process.exit(0);
}

const [created] = await rest("POST", "portfolios", project);
console.log(`Created Community Impact project ${created.id}: /impact/${created.slug}`);
try {
	await rest("PATCH", `blogs?id=eq.${blog.id}`, { status: "draft" }, "return=minimal");
	console.log(`Blog post set to draft: ${blog.title}`);
	await rest("POST", "redirects", redirect, "return=minimal");
	console.log(`Redirect added: ${redirect.from_path} → ${redirect.to_path}`);
} catch (err) {
	console.error(`The project was created, but a later step failed: ${err.message}`);
	console.error("Finish it by hand: set the blog post to draft in Admin → Blogs and add the redirect in Admin → SEO → Redirects.");
	process.exitCode = 1;
}
console.log('Next: purge "Blogs" and "Community Impact" in Admin → Cache.');
