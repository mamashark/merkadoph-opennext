import { expect, test } from "@playwright/test";
import { hubIds, hubPoint, openConstellation, watchErrors, worldOf } from "./helpers";

// Viewports from the B5/B18 checks: phone portrait, phone landscape (touch), desktop (mouse).
const VIEWPORTS = [
	{ name: "390 portrait touch", width: 390, height: 844, touch: true },
	{ name: "667x375 landscape touch", width: 667, height: 375, touch: true },
	{ name: "1280 desktop mouse", width: 1280, height: 800, touch: false },
];

for (const vp of VIEWPORTS) {
	test.describe(vp.name, () => {
		test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });

		test(`each Highlight opens its ?world= and Escape closes it`, async ({ page }) => {
			const errors = watchErrors(page);
			await openConstellation(page);
			const ids = await hubIds(page);
			expect(ids.length).toBeGreaterThanOrEqual(6);
			for (const id of ids) {
				const pt = await hubPoint(page, id);
				if (vp.touch) await page.touchscreen.tap(pt.x, pt.y);
				else await page.mouse.click(pt.x, pt.y);
				await expect.poll(() => worldOf(page), { timeout: 8000, message: `tapping ${id}` }).toBe(id);
				await page.waitForTimeout(1500); // the panel finishes opening before it listens for Escape
				await page.keyboard.press("Escape");
				await expect.poll(() => worldOf(page), { timeout: 8000, message: `Escape after ${id}` }).toBeNull();
				await page.waitForTimeout(2600); // the constellation takes this long to take taps again
			}
			expect(errors.list).toEqual([]);
		});
	});
}

// B5 / B18: label boxes must not overlap, and no square may sit under another category. The layout is random,
// so look at several loads (the original check used 10 per size).
for (const vp of [{ width: 667, height: 375 }, { width: 844, height: 390 }]) {
	test(`landscape ${vp.width}x${vp.height}: no label overlaps, no covered squares (3 loads)`, async ({ browser }) => {
		for (let i = 0; i < 3; i++) {
			const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true });
			const page = await ctx.newPage();
			await openConstellation(page);
			const r = await page.evaluate(() => {
				const hubs = [...document.querySelectorAll("svg g.hub")].map((g) => {
					const sq = [...g.querySelectorAll("rect")].find((x) => x.getAttribute("width") === "10")!.getBoundingClientRect();
					const t = g.querySelector("text")!.getBoundingClientRect();
					return { g, cx: sq.x + sq.width / 2, cy: sq.y + sq.height / 2, t: { l: t.left, r: t.right, top: t.top, b: t.bottom } };
				});
				const area = (a: (typeof hubs)[0]["t"], b: (typeof hubs)[0]["t"]) =>
					Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.top, b.top));
				let labelPairs = 0;
				for (let i = 0; i < hubs.length; i++) for (let j = i + 1; j < hubs.length; j++) if (area(hubs[i].t, hubs[j].t) > 0) labelPairs++;
				let covered = 0;
				for (const a of hubs) if (document.elementFromPoint(a.cx, a.cy)?.closest("g.hub") !== a.g) covered++;
				return { n: hubs.length, labelPairs, covered };
			});
			await ctx.close();
			expect(r.n, `load ${i}`).toBeGreaterThanOrEqual(6);
			expect(r.labelPairs, `label overlaps, load ${i}`).toBe(0);
			expect(r.covered, `covered squares, load ${i}`).toBe(0);
		}
	});
}

// B30: a `#` tile in the constellation must not throw.
test("clicking # tiles causes no console error (B30)", async ({ page }) => {
	const errors = watchErrors(page);
	await page.goto("/", { waitUntil: "load" });
	await page.getByRole("button", { name: "Open", exact: true }).waitFor({ timeout: 60_000 });
	const hrefs = await page.evaluate(() =>
		[...document.querySelectorAll("svg a")].map((a) => a.getAttribute("href") ?? "").filter((h) => h.includes("#")),
	);
	for (const h of hrefs.slice(0, 4)) {
		await page.goto("/", { waitUntil: "load" });
		await page.waitForTimeout(1500);
		await page.evaluate((h) => {
			const a = [...document.querySelectorAll("svg a")].find((x) => x.getAttribute("href") === h);
			a?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window, button: 0 }));
		}, h);
		await page.waitForTimeout(1500);
	}
	// A malformed hash must not throw either.
	await page.goto("/#%E0", { waitUntil: "load" });
	await page.waitForTimeout(1500);
	expect(errors.list).toEqual([]);
});
