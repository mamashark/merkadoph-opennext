/*
 * Captures the screenshots for "Behind the Build" from a LOCAL production build (never from production).
 *
 *   npm run test:e2e:build && npx next start -p 3310     (in another terminal; the gate must be off)
 *   npm run capture:case-study                           all shots
 *   npm run capture:case-study -- --only constellation   one feature
 *   npm run capture:case-study -- --only constellation--open   shots whose name contains this
 *   npm run capture:case-study -- --dry-run              print what would be written, write nothing
 *
 * Output: public/case-study/<name>.webp (PNG -> WebP via sharp), manifest src/lib/case-study/shots-manifest.json,
 * previous versions moved to case-study-archive/<name>--<YYYY-MM-DD>.webp at the repo root (last 3 kept).
 * The archive is outside public/, so it is never deployed; copy an old shot back into public/case-study/ by hand when a page shows a before/after.
 * Public pages only: /admin and /login are refused (no admin screenshots in v1). Exits non-zero if any shot fails.
 * Design: local/behind-the-build-phase2-design.md section 4.
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEVICES, shots as ALL_SHOTS } from "./case-study-shots.config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "case-study");
const ARCHIVE = path.join(ROOT, "case-study-archive");
const MANIFEST = path.join(ROOT, "src", "lib", "case-study", "shots-manifest.json");
const BASE = (process.env.CAPTURE_BASE ?? "http://localhost:3310").replace(/\/$/, "");
{
	let host = "";
	try {
		host = new URL(BASE).hostname;
	} catch {}
	if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(host)) {
		console.error(`Refusing to capture from "${BASE}": CAPTURE_BASE must be localhost or 127.0.0.1 (never production).`);
		process.exit(1);
	}
}
const MAX_TRIES = 15; // fresh loads for the random constellation layout / cue
const KEEP_ARCHIVED = 3;
const FORBIDDEN = /^\/(admin|login)(\/|\?|#|$)/i;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? (args[onlyIdx + 1] ?? "") : null;
if (onlyIdx >= 0 && !only) fail("--only needs a value");

function fail(msg) {
	console.error(`capture: ${msg}`);
	process.exit(1);
}
const today = () => new Date().toISOString().slice(0, 10);
const fileName = (s) => `${s.feature}--${s.state}--${DEVICES[s.device].label}-${s.scheme}.webp`;

/** Hard guard: the script never visits the admin or the login, whatever the config says. */
function guardUrl(url) {
	if (!url.startsWith("/") || url.startsWith("//")) fail(`refusing "${url}": only site paths are allowed`);
	if (FORBIDDEN.test(url)) fail(`refusing "${url}": /admin and /login are never captured (no admin screenshots in v1)`);
}

// ---- validate the config before doing anything ----
const names = new Set();
for (const s of ALL_SHOTS) {
	guardUrl(s.url);
	if (!DEVICES[s.device]) fail(`unknown device "${s.device}" in ${s.feature}/${s.state}`);
	if (!["light", "dark"].includes(s.scheme)) fail(`unknown scheme "${s.scheme}" in ${s.feature}/${s.state}`);
	const n = fileName(s);
	if (!/^[a-z0-9]+(-[a-z0-9]+)*(--[a-z0-9]+(-[a-z0-9]+)*){2}\.webp$/.test(n)) fail(`bad file name "${n}"`);
	if (names.has(n)) fail(`duplicate shot name "${n}"`);
	names.add(n);
}
const selected = ALL_SHOTS.filter((s) => !only || s.feature === only || fileName(s).includes(only));
if (!selected.length) fail(`no shot matches --only ${only}`);

if (dryRun) {
	console.log(`capture (dry run): ${selected.length} shot(s) from ${BASE}; nothing is written.`);
	for (const s of selected) {
		const exists = existsSync(path.join(OUT, fileName(s)));
		console.log(`  ${fileName(s)}  ${s.url}${s.cue ? `  cue~"${s.cue}"` : ""}${s.check ? `  check:${s.check}` : ""}${exists ? "  (existing file would be archived)" : ""}`);
	}
	process.exit(0);
}

// ---- the server must be a build with the gate off ----
{
	let html;
	try {
		html = await (await fetch(`${BASE}/`)).text();
	} catch {
		fail(`no server at ${BASE}. Run \`npm run test:e2e:build\` then \`npx next start -p 3310\` first.`);
	}
	if (html.includes('id="coming-soon-title"')) fail("the server shows the coming-soon page: build with `npm run test:e2e:build` (gate off) and restart.");
}

// ---- page helpers (run in the browser) ----

/** Copy of the check in tests/e2e/constellation.spec.ts (B5/B18): label boxes must not overlap and no square may sit under another category. Keep in step with the spec. */
const overlapCheck = () => {
	const hubs = [...document.querySelectorAll("svg g.hub")].map((g) => {
		const sq = [...g.querySelectorAll("rect")].find((x) => x.getAttribute("width") === "10").getBoundingClientRect();
		const id = g.__data__.hub;
		const t = document.querySelector(`svg g[data-hub="${id}"] text`).getBoundingClientRect();
		return { g, cx: sq.x + sq.width / 2, cy: sq.y + sq.height / 2, t: { l: t.left, r: t.right, top: t.top, b: t.bottom } };
	});
	const area = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.top, b.top));
	let labelPairs = 0;
	for (let i = 0; i < hubs.length; i++) for (let j = i + 1; j < hubs.length; j++) if (area(hubs[i].t, hubs[j].t) > 0) labelPairs++;
	let covered = 0;
	const coveredBy = [];
	for (const a of hubs) {
		const el = document.elementFromPoint(a.cx, a.cy);
		if (!el && (a.cy < 0 || a.cy > innerHeight)) continue; // below the fold on the phone's framed layout: cannot be hit-tested, checked by eye in the full-stage shot
		if (el?.closest("g.hub") !== a.g) {
			covered++;
			coveredBy.push(a.g.__data__.hub + " by " + el?.tagName + "." + (el?.getAttribute?.("class") ?? ""));
		}
	}
	// Stricter than the spec (a clean picture): no photo tile under the hint line. (Also no tile under a hub label, so the picture reads cleanly.)
	const rects = (sel) => [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
	const hit = (a, r) => Math.min(a.r, r.right) > Math.max(a.l, r.left) && Math.min(a.b, r.bottom) > Math.max(a.top, r.top);
	const tiles = rects("svg image");
	let tileOnLabel = 0;
	for (const h of hubs) if (tiles.some((r) => hit(h.t, r))) tileOnLabel++;
	const hint = rects('[class*="hintText"]')[0];
	const tileOnHint = hint && tiles.some((r) => hit({ l: hint.left, r: hint.right, top: hint.top, b: hint.bottom }, r)) ? 1 : 0;
	return { n: hubs.length, labelPairs, covered, coveredBy: coveredBy.join("; "), tileOnLabel, tileOnHint };
};
const hubPositions = () =>
	[...document.querySelectorAll("svg g.hub")]
		.map((g) => {
			const r = [...g.querySelectorAll("rect")].find((x) => x.getAttribute("width") === "10")?.getBoundingClientRect();
			return r ? `${Math.round(r.x / 6)},${Math.round(r.y / 6)}` : ""; // 6 px grid: ignore sub-pixel drift
		})
		.join("|");

/** Polls until the hubs have not moved for `quietMs` (the d3 layout settles on its own clock). */
async function settle(page, { quietMs = 1200, timeout = 20_000 } = {}) {
	const start = Date.now();
	let last = await page.evaluate(hubPositions);
	let since = Date.now();
	while (Date.now() - since < quietMs) {
		if (Date.now() - start > timeout) throw new Error("the constellation did not settle");
		await page.waitForTimeout(100);
		const now = await page.evaluate(hubPositions);
		if (now !== last) {
			last = now;
			since = Date.now();
		}
	}
}

const cueText = (page) => page.evaluate(() => [...document.querySelectorAll("svg text tspan")].map((t) => t.textContent ?? "").join(" "));

async function hubPoint(page, id) {
	return page.evaluate((id) => {
		const g = [...document.querySelectorAll("svg g.hub")].find((x) => x.__data__.hub === id);
		if (!g) return null;
		const r = [...g.querySelectorAll("rect")].find((x) => x.getAttribute("width") === "10").getBoundingClientRect();
		return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
	}, id);
}

async function runStep(page, step) {
	if (step.open) {
		const open = page.getByRole("button", { name: "Open", exact: true });
		await open.waitFor({ timeout: 60_000 });
		await open.click();
		await page.waitForFunction(() => document.querySelectorAll("svg g.hub").length >= 6, undefined, { timeout: 30_000 });
		await page.waitForTimeout(3000);
		await settle(page);
	} else if (step.hoverHub) {
		await page.waitForTimeout(300);
		const pt = await hubPoint(page, step.hoverHub);
		if (!pt) throw new Error(`no hub "${step.hoverHub}"`);
		await page.mouse.move(pt.x, pt.y, { steps: 6 }); // touch has no hover: the pointer move still raises the preview in the engine; checked by eye
		await page.waitForTimeout(4000); // the preview and the zoom-in drift take a few seconds to come to rest
	} else if (step.click) await page.locator(step.click).first().click();
	else if (step.press) await page.keyboard.press(step.press);
	else if (step.waitFor) await page.waitForSelector(step.waitFor, { timeout: 30_000 });
	else if (step.wait) await page.waitForTimeout(step.wait);
	else throw new Error(`unknown step ${JSON.stringify(step)}`);
}

/** "{entry:blogs}" -> the first entry slug of that Highlight, read from the live list. */
async function resolveUrl(browser, url) {
	const m = url.match(/\{entry:([a-z]+)\}/);
	if (!m) return url;
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	try {
		const page = await ctx.newPage();
		await page.goto(`${BASE}/?world=${m[1]}`, { waitUntil: "load" });
		await page.waitForSelector("[data-slug]", { timeout: 30_000 });
		const slug = await page.evaluate(() => document.querySelector("[data-slug]")?.getAttribute("data-slug") ?? "");
		if (!slug) throw new Error(`no entry found for ${m[1]}`);
		return url.replace(m[0], encodeURIComponent(slug));
	} finally {
		await ctx.close();
	}
}

/** One attempt: fresh context and load. Returns a PNG buffer, or throws (retry reason in the message). */
async function attempt(browser, s, url) {
	const dev = DEVICES[s.device];
	const ctx = await browser.newContext({
		viewport: dev.viewport,
		isMobile: dev.isMobile,
		hasTouch: dev.hasTouch,
		deviceScaleFactor: dev.deviceScaleFactor,
		colorScheme: s.scheme,
		reducedMotion: "no-preference",
	});
	try {
		const page = await ctx.newPage();
		// Keep analytics out of the shot and the console.
		await page.route(/^https:\/\/static\.cloudflareinsights\.com\//, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
		await page.goto(`${BASE}${url}`, { waitUntil: "load" });
		await page.waitForSelector(s.ready, { state: "visible", timeout: 60_000 });
		if (s.cue) {
			await page.waitForTimeout(800);
			const text = (await cueText(page)).toLowerCase();
			if (!text.includes(s.cue.toLowerCase())) throw new Error(`cue not shown ("${text.slice(0, 60)}")`);
		}
		// The layout check runs right after the sky opens (before any hover or click moves things), then the rest of the steps.
		let checked = false;
		const runCheck = async () => {
			checked = true;
			await settle(page);
			const r = await page.evaluate(overlapCheck);
			if (r.n < 6 || r.labelPairs > 0 || r.covered > 0 || r.tileOnLabel > 0 || r.tileOnHint > 0) throw new Error(`layout check failed (hubs ${r.n}, label overlaps ${r.labelPairs}, covered ${r.covered} [${r.coveredBy}], tiles on labels ${r.tileOnLabel}, tile on hint ${r.tileOnHint})`);
		};
		for (const step of s.steps ?? []) {
			await runStep(page, step);
			if (step.open && s.check === "constellation") await runCheck();
		}
		if (s.check === "constellation" && !checked) await runCheck();
		await page.waitForTimeout(400);
		if (s.clip === "stage") {
			// The phone's framed sky is taller than the 844 px viewport: capture the whole stage, full width.
			const box = await page.evaluate(() => {
				const r = document.querySelector('[class*="_stage"]')?.getBoundingClientRect();
				return r ? { x: 0, y: r.top + scrollY, width: innerWidth, height: r.height } : null;
			});
			if (!box) throw new Error("no stage element to clip to");
			return await page.screenshot({ type: "png", fullPage: true, clip: box });
		}
		return await page.screenshot({ type: "png" });
	} finally {
		await ctx.close();
	}
}

// ---- files, archive, manifest ----
async function readManifest() {
	try {
		return JSON.parse(await readFile(MANIFEST, "utf8"));
	} catch {
		return {};
	}
}

async function archive(file, manifest) {
	const from = path.join(OUT, file);
	if (!existsSync(from)) return;
	await mkdir(ARCHIVE, { recursive: true });
	const base = file.replace(/\.webp$/, "");
	const date = manifest[file]?.captured ?? (await stat(from)).mtime.toISOString().slice(0, 10);
	const target = `${base}--${date}.webp`;
	await rename(from, path.join(ARCHIVE, target)); // same-day re-run overwrites: one per day
	// keep the last 3 per shot
	const mine = (await readdir(ARCHIVE)).filter((f) => f.startsWith(`${base}--`) && /--\d{4}-\d{2}-\d{2}\.webp$/.test(f) && f.slice(base.length + 2).length === 15).sort();
	for (const old of mine.slice(0, Math.max(0, mine.length - KEEP_ARCHIVED))) {
		await rm(path.join(ARCHIVE, old));
	}
}

await mkdir(OUT, { recursive: true });
const manifest = await readManifest();
const browser = await chromium.launch();
const failed = [];
const written = [];
try {
	for (const s of selected) {
		const file = fileName(s);
		process.stdout.write(`${file} ... `);
		let png = null;
		let lastErr = "";
		try {
			const url = await resolveUrl(browser, s.url);
			guardUrl(url);
			const tries = s.cue ? MAX_TRIES * 3 : s.check ? MAX_TRIES : 2;
			for (let i = 1; i <= tries && !png; i++) {
				try {
					png = await attempt(browser, s, url);
					if (i > 1) process.stdout.write(`(try ${i}) `);
				} catch (e) {
					lastErr = e.message.split("\n")[0];
					if (process.env.CAPTURE_VERBOSE) process.stdout.write(`\n   try ${i}: ${lastErr}`);
				}
			}
		} catch (e) {
			lastErr = e.message.split("\n")[0];
		}
		if (!png) {
			console.log(`FAILED: ${lastErr}`);
			failed.push(file);
			continue;
		}
		const webp = await sharp(png).webp({ quality: 80, effort: 5 }).toBuffer();
		const meta = await sharp(webp).metadata();
		await archive(file, manifest);
		await writeFile(path.join(OUT, file), webp);
		manifest[file] = { width: meta.width, height: meta.height, captured: today(), bytes: webp.length };
		written.push(file);
		console.log(`${meta.width}x${meta.height}, ${Math.round(webp.length / 1024)} KB${webp.length > 250 * 1024 ? "  (over the 250 KB target)" : ""}`);
	}
} finally {
	await browser.close();
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(MANIFEST, `${JSON.stringify(sorted, null, "\t")}\n`);
console.log(`\ncapture: ${written.length} written, ${failed.length} failed. Review every image before committing.`);
if (failed.length) {
	console.error(`failed: ${failed.join(", ")}`);
	process.exit(1);
}
