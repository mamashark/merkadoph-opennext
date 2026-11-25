import { expect, test } from "@playwright/test";

// Homepage blog card summaries are clamped to 3 lines (and really clipped when longer).
for (const width of [320, 390, 768, 1280]) {
	test(`blog card summaries clamp to 3 lines at ${width}`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await page.goto("/#blogs", { waitUntil: "load" });
		await page.waitForTimeout(1500);
		const r = await page.evaluate(() =>
			[...document.querySelectorAll("#blogs p")]
				.filter((e) => getComputedStyle(e).webkitLineClamp === "3")
				.map((e) => ({ lines: Math.round(e.clientHeight / parseFloat(getComputedStyle(e).lineHeight)), overflowOk: true })),
		);
		expect(r.length, "clamped summaries found").toBeGreaterThan(0);
		for (const c of r) expect(c.lines).toBeLessThanOrEqual(3);
	});
}
