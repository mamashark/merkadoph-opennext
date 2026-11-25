import { expect, test } from "@playwright/test";
import { bandTop, scrollToBand, watchErrors } from "./helpers";

// B28: in-page jumps land at the 64px scroll margin. B29: Back and reload restore the scroll position.
for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
	test.describe(`${vp.width}px`, () => {
		test.use({ viewport: vp });

		test(`B28: About index [data-dive] links and header #contact land at 64px (±2)`, async ({ page }) => {
			const errors = watchErrors(page);
			await page.goto("/", { waitUntil: "load" });
			await page.waitForTimeout(2000);
			const dives = await page.evaluate(() => [...document.querySelectorAll("a[data-dive]")].map((a) => (a as HTMLElement).dataset.dive!));
			expect(dives.length).toBeGreaterThan(3);
			for (const id of dives) {
				await page.goto("/", { waitUntil: "load" });
				await page.waitForTimeout(1500);
				const link = page.locator(`a[data-dive="${id}"]`);
				await link.scrollIntoViewIfNeeded();
				await link.click();
				await expect.poll(() => bandTop(page, id), { timeout: 8000, message: `dive ${id}` }).toBeGreaterThanOrEqual(62);
				await page.waitForTimeout(1500);
				expect(await bandTop(page, id), `dive ${id}`).toBeLessThanOrEqual(66);
			}
			// The header "Contact" link.
			await page.goto("/", { waitUntil: "load" });
			await page.waitForTimeout(1500);
			// The header hides while the page is at the top or scrolling down, and slides in on scroll up.
			await page.mouse.move(vp.width / 2, vp.height / 2);
			await page.mouse.wheel(0, 1500);
			await page.waitForTimeout(800);
			await page.mouse.wheel(0, -200);
			await page.waitForTimeout(1200);
			const contact = page.locator('header a[href="#contact"]').first();
			await expect(contact).toBeInViewport({ timeout: 5000 });
			await contact.click();
			await page.waitForTimeout(2500);
			const t = await bandTop(page, "contact");
			expect(t, "header #contact").toBeGreaterThanOrEqual(62);
			expect(t, "header #contact").toBeLessThanOrEqual(66);
			expect(errors.list).toEqual([]);
		});

		test(`B29: Back from a card returns to the same scroll position (±2)`, async ({ page }) => {
			for (const [band, prefix] of [["events", "/events/"], ["impact", "/impact/"], ["bulletin", "/promotions/"]] as const) {
				await page.goto("/", { waitUntil: "load" });
				await scrollToBand(page, band);
				const link = page.locator(`#${band} a[href^="${prefix}"]`).first();
				if ((await link.count()) === 0) continue; // no published card in this band
				await link.evaluate((a) => a.scrollIntoView({ block: "nearest" }));
				const before = await bandTop(page, band);
				await link.click();
				await page.waitForURL((u) => u.pathname !== "/", { timeout: 15_000 });
				await page.waitForTimeout(1500);
				await page.goBack();
				await page.waitForURL((u) => u.pathname === "/", { timeout: 15_000 });
				await page.waitForTimeout(2500);
				expect(Math.abs((await bandTop(page, band)) - before), `Back from ${band}`).toBeLessThanOrEqual(2);
			}
		});

		test(`B29: reload at a band keeps the position (±2)`, async ({ page }) => {
			for (const band of ["tahooo", "bulletin", "events"]) {
				await page.goto("/", { waitUntil: "load" });
				await scrollToBand(page, band);
				const before = await bandTop(page, band);
				await page.reload({ waitUntil: "load" });
				await page.waitForTimeout(5000);
				expect(Math.abs((await bandTop(page, band)) - before), `reload at ${band}`).toBeLessThanOrEqual(2);
			}
		});
	});
}
