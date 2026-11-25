import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

// Hero first (Kay, 2026-11-24): a fresh visit on wider screens shows the folded sky alone, and the page doesn't
// scroll until the visitor clicks the sun in the centre or the Open button. Scrolling does nothing while folded.
// Not applied on a deep link, on upright phones, or after the sky is open. (highlights-stage.tsx, engine.ts .sun-hit)
const locked = (page: import("@playwright/test").Page) => page.evaluate(() => "heroLock" in document.documentElement.dataset);

test.describe("1280px", () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test("fresh visit: wheel and keys don't scroll; a click off the sun does nothing; the sun opens it", async ({ page }) => {
		const errors = watchErrors(page);
		await page.goto("/", { waitUntil: "load" });
		await page.getByRole("button", { name: "Open", exact: true }).waitFor({ timeout: 60_000 });
		await expect.poll(() => locked(page)).toBe(true);
		await page.mouse.move(640, 400);
		await page.mouse.wheel(0, 900);
		await page.keyboard.press("PageDown");
		await page.waitForTimeout(600);
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
		// Off-centre click: still folded and locked.
		await page.mouse.click(160, 160);
		await page.waitForTimeout(600);
		expect(await locked(page)).toBe(true);
		// The sun (and its cue text) opens the sky and frees the page.
		const sun = await page.evaluate(() => {
			const r = document.querySelector(".sun-hit")!.getBoundingClientRect();
			return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
		});
		await page.mouse.click(sun.x, sun.y);
		await expect.poll(() => locked(page), { timeout: 10_000 }).toBe(false);
		await page.mouse.wheel(0, 900);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
		expect(errors.list).toEqual([]);
	});

	test("a deep link is never locked", async ({ page }) => {
		await page.goto("/#events", { waitUntil: "load" });
		await page.getByRole("button", { name: "Open", exact: true }).waitFor({ timeout: 60_000 });
		await page.waitForTimeout(1000);
		expect(await locked(page)).toBe(false);
	});
});

test("upright phone (390x844) is never locked", async ({ browser }) => {
	const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
	const page = await ctx.newPage();
	await page.goto("/", { waitUntil: "load" });
	await page.getByRole("button", { name: "Open", exact: true }).waitFor({ timeout: 60_000 });
	await page.waitForTimeout(1000);
	expect(await locked(page)).toBe(false);
	await ctx.close();
});
