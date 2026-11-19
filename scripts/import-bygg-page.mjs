#!/usr/bin/env node
/**
 * Recreates the old Shopify page "Merkado PH Bygg- och Entreprenadtjänster i Västra Götaland" (theme template
 * page.building-page, which is what visitors saw) as the /bygg page, Merkado Byggnadsavdelning: the main service
 * `merkado-byggnadsavdelning` plus its four roofing services (category "Bygg"). The page stays in Swedish, with the
 * original wording (Kay, 2026-11-19); nothing is added that wasn't on the page.
 *
 *   node scripts/import-bygg-page.mjs --dry-run      # print what would be saved
 *   node scripts/import-bygg-page.mjs                # copy the photos to Supabase storage and save the rows as drafts
 *   node scripts/import-bygg-page.mjs --publish      # same, but published (shows on /bygg straight away)
 *
 * Options
 *   --bucket <name>  Public storage bucket for the photos. Default: media. Photos go to <bucket>/services/bygg/.
 *   --update         Overwrite services whose slug already exists (default: skip them, so re-runs are safe).
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL from .env.local and SUPABASE_SERVICE_ROLE_KEY from .dev.vars or the environment.
 * Afterwards: check the rows in Admin → Services, publish them, then purge "Services" in Admin → Cache.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const DRY = flag("dry-run");
const UPDATE = flag("update");
const PUBLISH = flag("publish");
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

/* --------------------------------- Content --------------------------------- */

const CDN = "https://cdn.shopify.com/s/files/1/0789/4941/7307/files";
const PHOTOS = {
	banner: `${CDN}/DAV05565.jpg`,
	installation: `${CDN}/DAV05581.jpg`,
	renovation: `${CDN}/DAV05539.jpg`,
	maintenance: `${CDN}/DJI_0694.jpg`,
	solar: `${CDN}/DJI_0895.jpg`,
	contact: `${CDN}/DAV02213_32c00d81-c986-418b-9846-453218ed2810.jpg`,
};

/** Rows to save. `{photo:name}` in content is replaced with the photo's new URL. */
const ROWS = [
	{
		slug: "merkado-byggnadsavdelning",
		title: "Merkado Byggnadsavdelning",
		excerpt:
			"På Merkado PH erbjuder vi högkvalitativa bygg- och entreprenadtjänster, med särskild inriktning på takläggning. Vi strävar efter att leverera hållbara och estetiskt tilltalande lösningar för både bostäder och kommersiella fastigheter i Västra Götaland.",
		photo: "banner",
		cover_image_alt: "Röd fasad i falsad plåt ovanför ett rött tegeltak, mot blå himmel",
		cta_label: "Boka kostnadsfri konsultation",
		sort_order: 0,
		// The old page's SEO title; its description was longer than 170 characters, so it is shortened here.
		meta_title: "Merkado Bygg- och Entreprenadtjänster i Västra Götaland",
		meta_description:
			"Högkvalitativa bygg- och entreprenadtjänster med särskild inriktning på takläggning, för bostäder och kommersiella fastigheter i Västra Götaland.",
		content: `**Din Byggare i Tiden!**

*I samarbete med A. R. Tak & Byggservice i Göteborg AB*

## Varför Välja Merkado PH?

- **Lokal Expertis.** Vi har lång erfarenhet av takläggning i Västra Götaland och anpassar våra lösningar efter regionens klimat.
- **Högkvalitativa Material.** Vi arbetar endast med hållbara och certifierade material.
- **Professionellt Team.** Våra yrkesarbetare är utbildade och erfarna inom alla typer av tak och fasadarbeten.
- **Kundfokus.** Vi lyssnar på våra kunders behov och levererar skräddarsydda lösningar.
- **Kompetens.** Vi har utbildad personal och bygger egen byggnadsställning upp till 9 meter.

## Redo att starta ditt byggprojekt?

![]({photo:contact})

Kontakta oss idag för en kostnadsfri konsultation och låt Merkado PH ta hand om ditt takprojekt i Västra Götaland!

- **Ring:** +46 70 432 60 21
- **Mejl:** [bygg@merkadoph.se](mailto:bygg@merkadoph.se)

Eller fyll i kontaktuppgifter nedan.`,
	},
	{
		slug: "takinstallation",
		title: "Takinstallation",
		excerpt:
			"Vi specialiserar oss på installation av nya tak med material av högsta kvalitet, anpassade efter kundens behov och byggnadens stil. Oavsett om det är tegel, plåt, bandtäckning eller papptak, så ser vi till att ditt tak är både hållbart och estetiskt tilltalande.",
		photo: "installation",
		cover_image_alt: "Närbild på rader av röda takpannor",
		sort_order: 1,
	},
	{
		slug: "takrenovering-och-reparation",
		title: "Takrenovering och Reparation",
		excerpt:
			"Vi erbjuder omfattande takrenoveringar och reparationer för att säkerställa att ditt tak håller sig i bästa skick. Våra tjänster inkluderar läckagekontroll, utbyte av skadade takpannor och förstärkning av takkonstruktioner.",
		photo: "renovation",
		cover_image_alt: "En takläggare med hjälm skruvar fast takpannor på läkten med en skruvdragare",
		sort_order: 2,
	},
	{
		slug: "takunderhall",
		title: "Takunderhåll",
		excerpt:
			"Regelbundet underhåll av taket förlänger dess livslängd och minskar risken för kostsamma skador. Vi erbjuder takrengöring, mossborttagning och inspektioner för att säkerställa att ditt tak är i toppskick året runt.",
		photo: "maintenance",
		cover_image_alt: "Flygfoto över en lång byggnad vars tak är öppnat ner till takstolarna under renovering",
		sort_order: 3,
	},
	{
		slug: "solpaneler",
		title: "Solpaneler",
		excerpt: "Vi samarbetar med några olika solcellsleverantörer och är då behjälpliga med montering av dessa.",
		photo: "solar",
		cover_image_alt: "Svarta solpaneler monterade på ett rött tegeltak, sett ovanifrån",
		sort_order: 4,
	},
];

/* ----------------------------------- Storage --------------------------------- */

const uploaded = new Map();
async function copyPhoto(name) {
	const source = PHOTOS[name];
	if (uploaded.has(source)) return uploaded.get(source);
	// Shopify serves a resized copy; 2000px is plenty for a full-width cover.
	const res = await fetch(`${source}?width=2000`);
	if (!res.ok) throw new Error(`Download failed (${res.status}): ${source}`);
	const type = res.headers.get("content-type") || "image/jpeg";
	if (!type.startsWith("image/")) throw new Error(`Not an image (${type}): ${source}`);
	const objectPath = `services/bygg/${path.basename(new URL(source).pathname)}`;
	const up = await fetch(`${SUPABASE}/storage/v1/object/${BUCKET}/${objectPath}`, {
		method: "POST",
		headers: { ...headers, "Content-Type": type, "x-upsert": "true", "Cache-Control": "max-age=31536000" },
		body: Buffer.from(await res.arrayBuffer()),
	});
	if (!up.ok) throw new Error(`Upload failed (${up.status}) for ${objectPath}: ${await up.text()}`);
	const url = `${SUPABASE}/storage/v1/object/public/${BUCKET}/${objectPath}`;
	uploaded.set(source, url);
	return url;
}

/* ------------------------------------ Run ------------------------------------ */

const clip = (s, n) => (s.length > n ? `${s.slice(0, s.lastIndexOf(" ", n - 1)).trimEnd()}…` : s);
let existing = new Map();
if (!DRY) {
	const list = ROWS.map((r) => r.slug).join(",");
	const res = await fetch(`${SUPABASE}/rest/v1/services?select=id,slug&slug=in.(${list})`, { headers });
	if (!res.ok) throw new Error(`Could not read services: ${res.status} ${await res.text()}`);
	existing = new Map((await res.json()).map((r) => [r.slug, r.id]));
}

const summary = { inserted: 0, updated: 0, skipped: 0, failed: 0 };
for (const r of ROWS) {
	try {
		const id = existing.get(r.slug);
		if (id && !UPDATE) {
			console.log(`skip  ${r.slug} (exists; use --update to overwrite)`);
			summary.skipped++;
			continue;
		}
		const cover = DRY ? PHOTOS[r.photo] : await copyPhoto(r.photo);
		// The four services are short: their text is the excerpt, shown at the top of their page.
		let content = r.content ?? "";
		for (const [, name] of content.matchAll(/\{photo:(\w+)\}/g)) content = content.replace(`{photo:${name}}`, DRY ? PHOTOS[name] : await copyPhoto(name));
		const row = {
			slug: r.slug,
			title: r.title,
			excerpt: r.excerpt,
			content,
			cover_image_url: cover,
			cover_image_alt: r.cover_image_alt,
			category: "Bygg",
			cta_label: r.cta_label ?? null,
			sort_order: r.sort_order,
			meta_title: r.meta_title ?? null,
			meta_description: r.meta_description ?? clip(r.excerpt, 160),
			status: PUBLISH ? "published" : "draft",
			published_at: PUBLISH ? new Date().toISOString() : null,
		};
		if (DRY) {
			console.log(`\n--- ${r.slug} (${row.status}) ---\n${JSON.stringify({ ...row, content: undefined }, null, 2)}\n${content}`);
			continue;
		}
		const res = await fetch(`${SUPABASE}/rest/v1/services${id ? `?id=eq.${id}` : ""}`, {
			method: id ? "PATCH" : "POST",
			headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
			body: JSON.stringify(row),
		});
		if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
		console.log(`${id ? "update" : "add  "} ${r.slug}`);
		summary[id ? "updated" : "inserted"]++;
	} catch (err) {
		console.error(`FAIL  ${r.slug}: ${err.message}`);
		summary.failed++;
	}
}

if (!DRY) {
	console.log(`\nDone: ${JSON.stringify(summary)}`);
	console.log(
		PUBLISH
			? "Published. Purge “Services” in Admin → Cache to see /bygg update right away."
			: "Saved as drafts. Check them in Admin → Services, publish, then purge “Services” in Admin → Cache.",
	);
}
if (summary.failed) process.exitCode = 1;
