import { expect, test } from "@playwright/test";
import { hasHorizontalScroll, watchErrors } from "./helpers";

const PAGES = ["/case-study", "/case-study/constellation"];

// Open questions are written as "[CONFIRM: ...]" in the content and stay visible until Kay answers (Behind the Build, design 2.4).
// This check blocks a release while any is public. It is expected to fail while open questions remain.
for (const path of PAGES) {
	test(`${path}: no [CONFIRM] text is visible`, async ({ page }) => {
		await page.goto(path, { waitUntil: "load" });
		const text = await page.evaluate(() => document.body.textContent ?? "");
		expect(text.match(/\[CONFIRM[^\]]*\]/g) ?? []).toEqual([]);
	});
}

test.describe("the constellation walkthrough", () => {
	test("Next, Previous, arrow keys and the live region step through all steps", async ({ page }) => {
		const errors = watchErrors(page);
		await page.goto("/case-study/constellation", { waitUntil: "load" });
		const status = page.getByRole("status");
		const steps = page.locator(".wt-step");
		const total = await steps.count();
		expect(total).toBe(9);
		await expect(page.locator(".wt-step:not([data-off])")).toHaveCount(1);
		await expect(page.getByText(`Step 1 of ${total}`).first()).toBeVisible();

		await page.getByRole("button", { name: /next/i }).click();
		await expect(page.locator(".wt-step:not([data-off])")).toHaveAttribute("id", "step-open-the-sky");
		await expect(status).toContainText(`Step 2 of ${total}`);

		await page.getByRole("button", { name: /next/i }).focus();
		await page.keyboard.press("ArrowRight");
		await expect(status).toContainText(`Step 3 of ${total}`);
		await page.keyboard.press("ArrowLeft");
		await page.keyboard.press("ArrowLeft");
		await expect(status).toContainText(`Step 1 of ${total}`);
		await expect(page.getByRole("button", { name: /previous/i })).toHaveAttribute("aria-disabled", "true");
		expect(errors.list).toEqual([]);
	});

	test("swiping left on a touch screen goes to the next step", async ({ browser }) => {
		const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
		const page = await ctx.newPage();
		await page.goto("/case-study/constellation", { waitUntil: "load" });
		const heading = page.locator(".wt-step:not([data-off]) h3");
		await heading.scrollIntoViewIfNeeded();
		const y = (await heading.boundingBox())!.y + 4;
		const cdp = await ctx.newCDPSession(page);
		const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
		await touch("touchStart", 300);
		await touch("touchMove", 200);
		await touch("touchMove", 120);
		await touch("touchEnd", 120);
		await expect(page.locator(".wt-step:not([data-off])")).toHaveAttribute("id", "step-open-the-sky");
		await ctx.close();
	});

	test("without JavaScript every step is readable and the controls are gone", async ({ browser }) => {
		const ctx = await browser.newContext({ javaScriptEnabled: false });
		const page = await ctx.newPage();
		await page.goto("/case-study/constellation", { waitUntil: "load" });
		for (const h of ["A folded sky", "Open the sky", "Keyboard, screen readers and reduced motion"]) await expect(page.getByRole("heading", { name: h })).toBeVisible();
		await expect(page.getByRole("button", { name: /next/i })).toBeHidden();
		await ctx.close();
	});

	test("the screenshots follow the colour scheme and have real sizes", async ({ browser }) => {
		for (const scheme of ["light", "dark"] as const) {
			const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 800 } });
			const page = await ctx.newPage();
			await page.goto("/case-study/constellation", { waitUntil: "load" });
			const img = page.locator(".wt-step:not([data-off]) picture img").first();
			await expect(img).toBeVisible();
			await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.currentSrc)).toContain(`desktop-${scheme}.webp`);
			expect(await img.getAttribute("width")).toBe("1440");
			expect(await hasHorizontalScroll(page)).toBe(false);
			await ctx.close();
		}
	});
	test("every screenshot file exists (light and dark) and the visible ones decode", async ({ page }) => {
		await page.goto("/case-study/constellation", { waitUntil: "load" });
		// Hidden steps keep lazy images unloaded, so ask the server for every file (img and dark <source>) instead.
		const urls = await page.evaluate(() => [...new Set([...document.querySelectorAll("picture img, picture source")].map((el) => el.getAttribute("src") ?? el.getAttribute("srcset") ?? "").filter(Boolean).map((u) => u.split(" ")[0]))]);
		expect(urls.length).toBeGreaterThan(20);
		for (const u of urls) {
			const res = await page.request.get(u);
			expect(res.ok(), u).toBe(true);
			expect(res.headers()["content-type"], u).toContain("image/");
		}
		const img = page.locator(".wt-step:not([data-off]) picture img").first();
		await img.scrollIntoViewIfNeeded();
		await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
	});

	test("a #step-... link opens that step and scrolls to it", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/case-study/constellation#step-zoom-in", { waitUntil: "load" });
		await expect(page.locator(".wt-step:not([data-off])")).toHaveAttribute("id", "step-zoom-in");
		await expect.poll(() => page.locator("#step-zoom-in").evaluate((el) => { const t = el.getBoundingClientRect().top; return t >= 0 && t < 400; })).toBe(true);
	});
});
