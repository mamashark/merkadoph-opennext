#!/usr/bin/env node
/**
 * Seeds sample blogs, events, promotions and services so the homepage and listing pages have content.
 * Every row is tagged "sample" and can be removed in one go.
 *
 *   node scripts/seed-sample-content.mjs           # insert / update (matched by slug)
 *   node scripts/seed-sample-content.mjs --remove  # delete every row tagged "sample"
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL from .env.local and SUPABASE_SERVICE_ROLE_KEY from .dev.vars.
 * Writes go to the real Supabase project, so sample rows are visible on the live site too.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const readEnv = (file) =>
	Object.fromEntries(
		fs
			.readFileSync(path.join(root, file), "utf8")
			.split(/\r?\n/)
			.filter((l) => /^[A-Z_]+=/.test(l))
			.map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
	);
const env = { ...readEnv(".env.local"), ...readEnv(".dev.vars") };
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (.env.local) or SUPABASE_SERVICE_ROLE_KEY (.dev.vars).");

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const day = 86400e3;
const at = (days, hour = 10, minute = 0) => {
	// A date `days` from now at hour:minute Philippine time (UTC+8).
	const d = new Date(Date.now() + days * day);
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour - 8, minute)).toISOString();
};
const live = (daysAgo) => ({ status: "published", published_at: at(-daysAgo, 9) });
const TAG = "sample";

/* --------------------------------- Content -------------------------------- */

const services = [
	{
		slug: "roof-replacement",
		title: "Roof replacement",
		category: "Roofing",
		price_label: "Free inspection & quote",
		is_featured: true,
		sort_order: 1,
		excerpt: "A new roof from tear-off to final inspection — tiles, sheet metal or roofing felt, chosen for your house and the Swedish climate.",
		content:
			"## What's included\n\n- Free on-site inspection and a written quote\n- Removal and disposal of the old roof\n- New underlay, battens and your choice of covering\n- Flashings around chimneys, vents and skylights\n- Final walkthrough with photos of the finished work\n\n## How long it takes\n\nMost detached houses take one to two weeks, depending on size, weather and material.\n\n## Good to know\n\nRoof work counts as renovation, so you may be able to use the **ROT deduction** on the labour cost. We put the details you need on the invoice.",
		cta_label: "Book a free inspection",
		cta_url: "https://merkadoph-opennext.merkado-ph.workers.dev/#contact",
		tags: ["roofing", TAG],
	},
	{
		slug: "roof-repair-and-leaks",
		title: "Roof repair & leaks",
		category: "Roofing",
		price_label: "Quote after inspection",
		is_featured: true,
		sort_order: 2,
		excerpt: "Broken tiles, loose sheet metal, leaks around the chimney — we find the cause and fix it before winter makes it worse.",
		content:
			"## Common jobs\n\n- Replacing cracked or slipped tiles\n- Re-sealing chimney and vent flashings\n- Fixing storm damage\n- Moss removal and treatment\n\nWe'll show you photos of what we found and explain the options — repair now, or plan for a replacement later.",
		cta_label: "Report a leak",
		cta_url: "https://merkadoph-opennext.merkado-ph.workers.dev/#contact",
		tags: ["roofing", "repair", TAG],
	},
	{
		slug: "gutters-and-downpipes",
		title: "Gutters & downpipes",
		category: "Roofing",
		price_label: "Fixed price per metre",
		sort_order: 3,
		excerpt: "New gutters, downpipes and snow guards — keep water away from your facade and foundation.",
		content: "Overflowing gutters are one of the most common causes of damp walls and basements. We clean, repair or replace gutters and downpipes, and fit snow guards where needed.",
		tags: ["roofing", TAG],
	},
	{
		slug: "facade-painting-and-repairs",
		title: "Facade painting & repairs",
		category: "Renovation",
		price_label: "Free quote",
		sort_order: 4,
		excerpt: "Scraping, repairing and repainting wooden facades, window frames and trims — so the house looks good and stays protected.",
		content: "Wooden facades need attention every few years in our climate. We replace rotten boards, prepare surfaces properly and paint with products suited to Swedish weather.",
		tags: ["renovation", TAG],
	},
	{
		slug: "extensions-and-attefall-houses",
		title: "Extensions & Attefall houses",
		category: "Construction",
		price_label: "Project-based",
		sort_order: 5,
		excerpt: "More space at home — a guest house, home office or extension, from foundation to roof.",
		content:
			"We help you plan what's possible on your plot, coordinate the paperwork with your municipality and build it to last.\n\n## Typical projects\n\n- Attefall houses and guest cottages\n- Home offices and studios\n- Small extensions and porches",
		tags: ["construction", TAG],
	},
	{
		slug: "interior-renovation",
		title: "Interior renovation",
		category: "Renovation",
		price_label: "Free quote",
		sort_order: 6,
		excerpt: "Walls, floors, ceilings and carpentry — practical renovations done tidily, with clear communication throughout.",
		content: "From a single room to a full floor, we plan the work with you, protect your home while we work and leave it clean when we're done.",
		tags: ["renovation", TAG],
	},
].map((s) => ({ ...live(30), ...s }));

const promotions = [
	{
		slug: "free-autumn-roof-inspection",
		title: "Free autumn roof inspection",
		discount_label: "FREE",
		excerpt: "Get your roof checked before the snow arrives. We inspect, photograph and tell you honestly what needs doing — no obligation.",
		content: "Book an inspection and we'll check tiles or sheet metal, flashings, gutters and visible underlay, then send you a short report with photos.",
		starts_at: at(-10),
		ends_at: at(45, 23, 59),
		terms: "- Detached and semi-detached houses\n- One inspection per household\n- Booking required",
		cta_label: "Book an inspection",
		cta_url: "https://merkadoph-opennext.merkado-ph.workers.dev/#contact",
		tags: ["roofing", TAG],
	},
	{
		slug: "kabayan-community-discount",
		title: "Kabayan community discount",
		discount_label: "10% OFF LABOUR",
		promo_code: "KABAYAN10",
		excerpt: "A thank-you to the Filipino-Swedish community that made Merkado PH what it is.",
		content: "Mention the code when you ask for a quote and we'll take 10% off the labour cost of your project.",
		starts_at: at(-20),
		ends_at: at(90, 23, 59),
		terms: "- Applies to labour, not materials\n- Cannot be combined with other offers\n- Mention the code when requesting a quote",
		cta_label: "Ask for a quote",
		cta_url: "https://merkadoph-opennext.merkado-ph.workers.dev/#contact",
		tags: ["community", TAG],
	},
	{
		slug: "free-gutter-clean-with-roof-job",
		title: "Free gutter clean with any roof job",
		discount_label: "FREE GUTTER CLEAN",
		excerpt: "Booking a roof repair or replacement? We'll clean and check your gutters at the same visit.",
		content: "Clear gutters protect your facade and foundation through autumn rain and spring melt.",
		starts_at: at(-5),
		ends_at: at(60, 23, 59),
		terms: "- With any booked roof repair or replacement\n- Single-family houses",
		tags: ["roofing", TAG],
	},
].map((p) => ({ ...live(5), ...p }));

const events = [
	{
		slug: "homeowner-qa-winter-ready-roof",
		title: "Homeowner Q&A: getting your roof winter-ready",
		excerpt: "An informal evening session on what to check before winter, common problems we see, and how the ROT deduction works.",
		content: "## Agenda\n\n1. What to look for from the ground\n2. Gutters, moss and flashings\n3. When to repair vs. replace\n4. Your questions\n\nCoffee and Filipino snacks provided.",
		starts_at: at(14, 18, 30),
		ends_at: at(14, 20, 0),
		venue_name: "Venue to be confirmed",
		venue_address: "Sweden",
		organizer: "Merkado PH",
		price_info: "Free",
		tags: ["workshop", TAG],
	},
	{
		slug: "kapihan-community-meetup",
		title: "Kapihan: community meetup",
		excerpt: "Coffee, merienda and catching up — the Merkado PH community gathering, open to everyone.",
		content: "Bring a friend, bring your family. A relaxed afternoon to meet old and new kababayan.",
		starts_at: at(28, 14, 0),
		ends_at: at(28, 17, 0),
		venue_name: "Venue to be confirmed",
		organizer: "Merkado PH Community",
		price_info: "Free entry",
		tags: ["community", TAG],
	},
	{
		slug: "paskong-pinoy-christmas-gathering",
		title: "Paskong Pinoy: Christmas gathering",
		excerpt: "Our Filipino Christmas celebration — food, music, parol-making for the kids and a warm community welcome.",
		content: "## Programme\n\n- Potluck noche buena\n- Parol-making for kids\n- Christmas carols\n- Raffle\n\nMore details and registration coming soon.",
		starts_at: at(70, 15, 0),
		ends_at: at(70, 21, 0),
		venue_name: "Venue to be confirmed",
		organizer: "Merkado PH Community",
		price_info: "Free · potluck",
		tags: ["community", "christmas", TAG],
	},
	{
		slug: "independence-day-celebration",
		title: "Philippine Independence Day celebration",
		excerpt: "Celebrating Araw ng Kalayaan together with the Filipino-Swedish community.",
		content: "Thank you to everyone who joined us! Photos coming soon.",
		starts_at: at(-120, 13, 0),
		ends_at: at(-120, 18, 0),
		venue_name: "Community hall",
		organizer: "Merkado PH Community",
		price_info: "Free",
		tags: ["community", TAG],
	},
].map((e) => ({ ...live(40), ...e }));

const blogs = [
	{
		slug: "bagong-yugto-next-chapter-for-merkado-ph",
		title: "Bagong yugto: the next chapter for Merkado PH",
		author_name: "Merkado PH Team",
		excerpt: "From a Filipino store in Sweden to a community — and now to roofing and construction. Here's why we're keeping the name.",
		content:
			"Merkado PH started as a physical store and online shop for Filipino products in Sweden. Over the years it became much more than a shop: a place where people met, celebrated and helped each other.\n\n## Why the change\n\nThe online shop has been sold, but the community it built is still here. Rather than let the name disappear, we're carrying it forward into something new: **roofing and construction work**, led by our family's experienced builder.\n\n## What stays the same\n\n- The people behind it\n- Honest advice and clear prices\n- Our community events\n\nSalamat for being part of the story so far. Abangan — there's more to come.",
		tags: ["news", "community", TAG],
		...live(3),
	},
	{
		slug: "signs-your-roof-needs-attention-before-winter",
		title: "5 signs your roof needs attention before winter",
		author_name: "Merkado PH Team",
		excerpt: "Most roof problems are cheaper to fix in autumn than after a winter of snow and meltwater. Here's what to look for.",
		content:
			"## 1. Cracked, slipped or missing tiles\nEven one gap lets water reach the underlay.\n\n## 2. Moss and lichen\nMoss holds moisture against the roof and can lift tiles over time.\n\n## 3. Overflowing gutters\nWater running down the facade means gutters are blocked or sagging.\n\n## 4. Damp patches in the attic\nCheck after heavy rain — dark spots on the underside of the roof are an early warning.\n\n## 5. Worn flashings\nThe metal around chimneys and vents is a common leak point.\n\nNot sure? Book a free inspection and we'll take a look.",
		tags: ["roofing", "guides", TAG],
		...live(10),
	},
	{
		slug: "rot-deduction-what-homeowners-should-know",
		title: "The ROT deduction: what homeowners should know",
		author_name: "Merkado PH Team",
		excerpt: "Renovation and repair work on your home may qualify for a tax reduction on the labour cost. A quick, plain-language overview.",
		content:
			"The **ROT deduction** (ROT-avdrag) is a Swedish tax reduction on the *labour* part of repair, maintenance and renovation work on your home.\n\n## How it usually works\n\n- The contractor deducts it directly on the invoice\n- You pay the reduced amount\n- The contractor claims the rest from Skatteverket\n\n## Good to know\n\n- Materials and travel are not covered — only labour\n- There's a yearly maximum per person\n- Rules and rates change, so always check the current details on **skatteverket.se**\n\nWe show the labour cost separately on every quote so you can see what applies.",
		tags: ["guides", TAG],
		...live(17),
	},
];

/* --------------------------------- Runner --------------------------------- */

const tables = { services, promotions, events, blogs };

async function upsert(table, rows) {
	// PostgREST requires every row in a batch to have the same keys.
	const keys = [...new Set(rows.flatMap(Object.keys))];
	const normalized = rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? (k === "tags" ? [] : k === "content" ? "" : k === "is_featured" ? false : k === "sort_order" ? 0 : null)])));
	const res = await fetch(`${URL_}/rest/v1/${table}?on_conflict=slug`, {
		method: "POST",
		headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
		body: JSON.stringify(normalized),
	});
	if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
	console.log(`✓ ${table}: ${rows.length} sample rows`);
}

async function remove(table) {
	const res = await fetch(`${URL_}/rest/v1/${table}?tags=cs.{${TAG}}`, { method: "DELETE", headers: { ...headers, Prefer: "return=representation" } });
	if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
	console.log(`✓ ${table}: removed ${(await res.json()).length} sample rows`);
}

const removing = process.argv.includes("--remove");
for (const [table, rows] of Object.entries(tables)) await (removing ? remove(table) : upsert(table, rows));
console.log(removing ? "Sample content removed." : "Sample content seeded. Purge the cache (Admin → Cache) if pages still look old.");
