import type { Page } from "@playwright/test";

/** Errors that are noise, not bugs: a navigation that cancels an in-flight request. */
const IGNORED = [/ERR_ABORTED/, /net::ERR_FAILED.*_rsc/, /Failed to fetch RSC payload/];

/** Collects console errors and uncaught page errors. Read `.list` at the end of a test. */
export function watchErrors(page: Page) {
	const list: string[] = [];
	page.on("pageerror", (e) => list.push(`pageerror: ${e.message}`));
	page.on("console", (m) => {
		if (m.type() !== "error") return;
		const t = m.text();
		if (!IGNORED.some((re) => re.test(t))) list.push(`console: ${t}`);
	});
	return { list };
}

export const hasHorizontalScroll = (page: Page) =>
	page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

/**
 * The homepage's first screen is the folded sky alone: on a fresh visit (wider screens) the page doesn't scroll until
 * the visitor opens the sky (Kay, 2026-11-24; highlights-stage.tsx, html[data-hero-lock]). Opens it like a visitor
 * would (the Open button) when the lock is on, and waits until the page scrolls again. No-op when it isn't locked.
 */
export async function openHero(page: Page) {
	// The lock is applied once the constellation script is ready, so wait for the Open button first.
	await page.getByRole("button", { name: "Open", exact: true }).waitFor({ timeout: 60_000 });
	if (!(await page.evaluate(() => "heroLock" in document.documentElement.dataset))) return;
	await page.getByRole("button", { name: "Open", exact: true }).click();
	await page.waitForFunction(() => !("heroLock" in document.documentElement.dataset), undefined, { timeout: 10_000 });
}

/** Opens the constellation (the "Open" button) and waits until the categories ("hubs") are laid out. */
export async function openConstellation(page: Page) {
	await page.goto("/", { waitUntil: "load" });
	const open = page.getByRole("button", { name: "Open", exact: true });
	await open.waitFor({ timeout: 60_000 });
	await open.click();
	await page.waitForFunction(() => document.querySelectorAll("svg g.hub").length >= 6, undefined, { timeout: 30_000 });
	// The layout settles for a few seconds (the original scripts waited 6.5 s).
	await page.waitForTimeout(5000);
}

/** Ids of the categories, e.g. "blogs", "events". */
export const hubIds = (page: Page) =>
	page.evaluate(() => [...document.querySelectorAll("svg g.hub")].map((g) => (g as unknown as { __data__: { hub: string } }).__data__.hub));

/** Centre of a category's square, scrolled into view first and measured after the scroll has settled. */
export async function hubPoint(page: Page, id: string) {
	await page.evaluate((id) => {
		const g = [...document.querySelectorAll("svg g.hub")].find((x) => (x as unknown as { __data__: { hub: string } }).__data__.hub === id)!;
		g.scrollIntoView({ block: "nearest" });
	}, id);
	await page.waitForTimeout(250);
	return page.evaluate((id) => {
		const g = [...document.querySelectorAll("svg g.hub")].find((x) => (x as unknown as { __data__: { hub: string } }).__data__.hub === id)!;
		const r = [...g.querySelectorAll("rect")].find((x) => x.getAttribute("width") === "10")!.getBoundingClientRect();
		return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
	}, id);
}

export const worldOf = (page: Page) => new URL(page.url()).searchParams.get("world");

/** Scrolls like a visitor (small steps) until the band's top is near the viewport top. Opens the hero first, as a visitor must. */
export async function scrollToBand(page: Page, id: string) {
	await openHero(page);
	for (let i = 0; i < 400; i++) {
		const t = await page.evaluate((id) => document.getElementById(id)?.getBoundingClientRect().top ?? null, id);
		if (t !== null && t <= 120) break;
		await page.evaluate((d) => window.scrollBy(0, d), Math.min(500, Math.max(20, (t ?? 500) - 100)));
		await page.waitForTimeout(40);
	}
	await page.waitForTimeout(1200);
}

export const bandTop = (page: Page, id: string) =>
	page.evaluate((id) => Math.round(document.getElementById(id)!.getBoundingClientRect().top), id);

/** A band's top once the scroll has settled: polls until scrollY and the top are unchanged for `quietMs`, so CPU load can't make a fixed wait too short. */
export async function settledBandTop(page: Page, id: string, { quietMs = 600, timeout = 20_000 } = {}) {
	const read = () =>
		page.evaluate((id) => `${Math.round(window.scrollY)}:${Math.round(document.getElementById(id)!.getBoundingClientRect().top)}`, id);
	const start = Date.now();
	let last = await read();
	let since = Date.now();
	while (Date.now() - since < quietMs) {
		if (Date.now() - start > timeout) throw new Error(`scroll to #${id} did not settle within ${timeout} ms`);
		await page.waitForTimeout(50);
		const now = await read();
		if (now !== last) {
			last = now;
			since = Date.now();
		}
	}
	return Number(last.split(":")[1]);
}
