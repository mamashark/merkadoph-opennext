#!/usr/bin/env node
/**
 * Imports blog articles exported from the old Shopify store into public.blogs as drafts.
 *
 *   node scripts/import-shopify-blogs.mjs --dry-run            # convert only; writes Markdown previews to local/shopify-preview/
 *   node scripts/import-shopify-blogs.mjs --bucket media       # copy images to Supabase storage and insert the drafts
 *
 * Options
 *   --file <path>    Shopify export (array of Article nodes). Default: local/shopify-articles.json
 *   --bucket <name>  Public storage bucket for images. Default: media. Images go to <bucket>/blogs/shopify/<slug>/.
 *   --update         Overwrite posts whose slug already exists (default: skip them, so re-runs are safe).
 *
 * - Shopify HTML becomes Markdown (the site renders Markdown only; raw HTML is never allowed).
 * - Cover and inline images are downloaded from cdn.shopify.com and uploaded to Supabase storage.
 * - YouTube embeds become links; widget scripts and other embeds are dropped.
 * - Every post is saved as a draft with no publish date: review and publish each one in Admin → Blogs.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL from .env.local and SUPABASE_SERVICE_ROLE_KEY from .dev.vars (not needed for --dry-run).
 */
import fs from "node:fs";
import path from "node:path";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const DRY = flag("dry-run");
const UPDATE = flag("update");
const FILE = path.resolve(root, option("file", "local/shopify-articles.json"));
const BUCKET = option("bucket", "media");

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
if (!DRY && (!SUPABASE || !KEY)) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (.env.local) or SUPABASE_SERVICE_ROLE_KEY (.dev.vars or environment).");
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

/* --------------------------------- Helpers -------------------------------- */

const slugify = (s) =>
	s
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80)
		.replace(/-+$/g, "");

const decodeEntities = (s) =>
	s
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

const plainText = (html) =>
	decodeEntities(String(html ?? "").replace(/<[^>]*>/g, " "))
		.replace(/\s+/g, " ")
		.replace(/ ([,.;:!?])/g, "$1")
		.trim();

/** Cuts at a word boundary and adds an ellipsis when the text is longer than max. */
const clip = (s, max) => {
	if (!s || s.length <= max) return s || null;
	const cut = s.slice(0, max - 1);
	return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max * 0.6)).replace(/[\s,.;:–-]+$/, "")}…`;
};

/** Full-size Shopify CDN URL: drops the "_600x600" size suffix and asks for at most 1600px wide. */
const shopifySource = (url) => {
	const u = new URL(url.startsWith("//") ? `https:${url}` : url);
	u.pathname = u.pathname.replace(/_(\d+x\d*|\d*x\d+|small|medium|large|grande|compact|master)(?=\.[a-z]+$)/i, "");
	u.searchParams.set("width", "1600");
	return u.toString();
};
const isShopifyCdn = (url) => /^(https?:)?\/\/cdn\.shopify\.com\//.test(url);

const fileName = (url) => {
	const base = decodeURIComponent(new URL(url).pathname.split("/").pop() || "image");
	const dot = base.lastIndexOf(".");
	const stem = (dot > 0 ? base.slice(0, dot) : base)
		.toLowerCase()
		.replace(/_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	const ext = dot > 0 ? base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "jpg";
	return `${stem || "image"}.${ext}`;
};

/* ------------------------------ HTML → Markdown ---------------------------- */

const td = new TurndownService({ headingStyle: "atx", hr: "---", bulletListMarker: "-", codeBlockStyle: "fenced", emDelimiter: "*" });
td.use(gfm);
td.remove(["script", "style", "meta", "noscript", "form", "button", "input"]);
// YouTube embeds become a plain link; anything else embedded is dropped.
td.addRule("iframe", {
	filter: "iframe",
	replacement: (_c, node) => {
		const src = (node.getAttribute("src") || "").replace(/&amp;/g, "&");
		const yt = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/);
		if (!yt) return "";
		const list = new URL(src.startsWith("//") ? `https:${src}` : src).searchParams.get("list");
		const href = yt[1] === "videoseries" && list ? `https://www.youtube.com/playlist?list=${list}` : `https://www.youtube.com/watch?v=${yt[1]}`;
		return `\n\n[▶ Watch on YouTube](${href})\n\n`;
	},
});
// Elfsight and similar widgets leave empty placeholder divs behind.
td.addRule("widgets", { filter: (node) => node.nodeName === "DIV" && /elfsight-app/.test(node.getAttribute("class") || ""), replacement: () => "" });

/** Shopify-era links to our own site point to the new paths. */
const rewriteLinks = (md, slugByHandle) =>
	md.replace(/\]\((https?:\/\/(?:www\.)?merkadoph\.se)(\/[^)\s]*)?\)/g, (_m, _host, p = "/") => {
		const blog = p.match(/^\/blogs\/[^/]+\/([^/?#]+)/);
		if (blog) return `](/blogs/${slugByHandle.get(decodeURIComponent(blog[1])) ?? slugify(decodeURIComponent(blog[1]))})`;
		if (/^\/products\//.test(p)) return `](/shop${p})`;
		return `](${p || "/"})`;
	});

const tidy = (md) =>
	md
		.replace(/ /g, " ")
		.replace(/[ \t]+$/gm, (m) => (m.length >= 2 && m === "  " ? m : "")) // keep Markdown hard breaks ("  ")
		// "### **Heading**" → "### Heading"
		.replace(/^(#{1,6}) +\*\*(.+?)\*\*\s*$/gm, "$1 $2")
		// A heading that only wraps an image is just the image.
		.replace(/^#{1,6} +(!\[[^\]]*\]\([^)]+\))\s*$/gm, "\n$1\n")
		// Small italic "headings" were used as photo captions: make them italic paragraphs.
		.replace(/^#{4,6} +(\*[^*].*\*)\s*$/gm, "\n$1\n")
		// "- item<br>" lines that Turndown escaped become a real list.
		.replace(/^\\([-+*]) +(.*?) *$/gm, "- $2")
		// Decorative "------" lines become a rule (blank lines so it is not read as a heading underline).
		.replace(/^\\?-{3,}\s*$/gm, "\n\n---\n\n")
		// A list right after a paragraph line needs a blank line before it.
		.replace(/^(?!- )(.+)\n(- )/gm, "$1\n\n$2")
		// Lines that are only emphasis markers or stray escapes.
		.replace(/^\s*(\*\*|\*|__|_)\s*\1?\s*$/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

/* ----------------------------------- Storage --------------------------------- */

async function publicBuckets() {
	const res = await fetch(`${SUPABASE}/storage/v1/bucket`, { headers });
	if (!res.ok) throw new Error(`Could not list buckets: ${res.status} ${await res.text()}`);
	return (await res.json()).filter((b) => b.public).map((b) => b.name);
}

const uploaded = new Map(); // Shopify URL → public URL (shared across posts)
async function copyImage(url, slug) {
	const source = shopifySource(url);
	if (uploaded.has(source)) return uploaded.get(source);
	const res = await fetch(source);
	if (!res.ok) throw new Error(`Download failed (${res.status}): ${source}`);
	const type = res.headers.get("content-type") || "image/jpeg";
	if (!type.startsWith("image/")) throw new Error(`Not an image (${type}): ${source}`);
	const body = Buffer.from(await res.arrayBuffer());
	const objectPath = `blogs/shopify/${slug}/${fileName(source)}`;
	const up = await fetch(`${SUPABASE}/storage/v1/object/${BUCKET}/${objectPath}`, {
		method: "POST",
		headers: { ...headers, "Content-Type": type, "x-upsert": "true", "Cache-Control": "max-age=31536000" },
		body,
	});
	if (!up.ok) throw new Error(`Upload failed (${up.status}) for ${objectPath}: ${await up.text()}`);
	const publicUrl = `${SUPABASE}/storage/v1/object/public/${BUCKET}/${objectPath}`;
	uploaded.set(source, publicUrl);
	return publicUrl;
}

/* ------------------------------------ Run ------------------------------------ */

const articles = JSON.parse(fs.readFileSync(FILE, "utf8"));
if (!Array.isArray(articles)) throw new Error(`${FILE} must hold an array of Shopify Article nodes.`);
// Oldest first, so created_at order matches Shopify.
articles.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

const slugByHandle = new Map();
const used = new Set();
for (const a of articles) {
	let slug = slugify(a.handle) || slugify(a.title) || "post";
	for (let n = 2; used.has(slug); n++) slug = `${slugify(a.handle).slice(0, 76)}-${n}`;
	used.add(slug);
	slugByHandle.set(a.handle, slug);
}

let existing = new Map();
if (!DRY) {
	const buckets = await publicBuckets();
	if (!buckets.includes(BUCKET)) throw new Error(`No public bucket "${BUCKET}". Public buckets: ${buckets.join(", ") || "(none)"}. Pass --bucket <name>.`);
	const list = [...slugByHandle.values()].map((s) => `"${s}"`).join(",");
	const res = await fetch(`${SUPABASE}/rest/v1/blogs?select=id,slug&slug=in.(${encodeURIComponent(list)})`, { headers });
	if (!res.ok) throw new Error(`Could not read existing blogs: ${res.status} ${await res.text()}`);
	existing = new Map((await res.json()).map((r) => [r.slug, r.id]));
}

const previewDir = path.join(root, "local/shopify-preview");
if (DRY) fs.mkdirSync(previewDir, { recursive: true });

const summary = { inserted: 0, updated: 0, skipped: 0, failed: 0, images: 0 };
for (const a of articles) {
	const slug = slugByHandle.get(a.handle);
	try {
		if (!DRY && existing.has(slug) && !UPDATE) {
			console.log(`skip  ${slug} (already exists; use --update to overwrite)`);
			summary.skipped++;
			continue;
		}

		let content = tidy(rewriteLinks(td.turndown(a.body || ""), slugByHandle));
		const excerpt = clip(plainText(a.summary) || plainText(content.replace(/!\[[^\]]*\]\([^)]*\)/g, "").split(/\n\n/).find((p) => plainText(p).length > 60) || ""), 500);
		let cover = a.image?.url ?? null;

		const shopifyUrls = [...new Set([...content.matchAll(/\]\(((?:https?:)?\/\/cdn\.shopify\.com\/[^)\s]+)\)/g)].map((m) => m[1]))];
		if (!DRY) {
			for (const url of shopifyUrls) content = content.split(url).join(await copyImage(url, slug));
			if (cover) cover = await copyImage(cover, slug);
			summary.images += shopifyUrls.length + (cover ? 1 : 0);
		}

		const row = {
			title: a.title.trim().slice(0, 200),
			slug,
			excerpt,
			content,
			cover_image_url: cover,
			cover_image_alt: a.image?.altText?.trim() || a.title.trim(),
			meta_title: a.title.trim().length <= 70 ? a.title.trim() : null,
			meta_description: clip(plainText(a.seoDesc?.value) || excerpt, 160),
			tags: a.tags ?? [],
			status: "draft",
			published_at: null,
			author_name: a.author?.name || null,
			created_at: a.createdAt,
		};

		if (DRY) {
			const front = Object.entries({ ...row, content: undefined, images: shopifyUrls.length + (cover ? 1 : 0) })
				.filter(([, v]) => v !== undefined)
				.map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
				.join("\n");
			fs.writeFileSync(path.join(previewDir, `${slug}.md`), `---\n${front}\n---\n\n${content}\n`);
			console.log(`dry   ${slug} (${content.length} chars, ${shopifyUrls.length} inline images${isShopifyCdn(cover ?? "") ? ", cover" : ""})`);
			continue;
		}

		const id = existing.get(slug);
		const res = await fetch(`${SUPABASE}/rest/v1/blogs${id ? `?id=eq.${id}` : ""}`, {
			method: id ? "PATCH" : "POST",
			headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
			body: JSON.stringify(id ? { ...row, created_at: undefined } : row),
		});
		if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
		console.log(`${id ? "update" : "add  "} ${slug}`);
		summary[id ? "updated" : "inserted"]++;
	} catch (err) {
		console.error(`FAIL  ${slug}: ${err.message}`);
		summary.failed++;
	}
}

console.log(DRY ? `\nDry run: previews in ${path.relative(root, previewDir)}/` : `\nDone: ${JSON.stringify(summary)}`);
if (!DRY) console.log("Posts are drafts. Review them in Admin → Blogs, then purge the blogs cache in Admin → Cache after publishing.");
if (summary.failed) process.exitCode = 1;
