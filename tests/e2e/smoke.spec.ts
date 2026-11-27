import { expect, test } from "@playwright/test";
import { hasHorizontalScroll, watchErrors } from "./helpers";

// Every public route (local/guidelines.md section 3, plus the homepage bands' own routes).
// /portfolio redirects (308), so the final status after following it is what counts.
const ROUTES = [
	"/", "/blogs", "/events", "/portfolio", "/services", "/promotions", "/privacy", "/terms", "/cookies",
	"/bygg", "/digital", "/tahooo", "/bulletin", "/impact", "/search?q=taho", "/case-study", "/case-study/constellation",
];

for (const route of ROUTES) {
	for (const width of [390, 1280]) {
		test(`smoke ${route} at ${width}: 200, one h1, no errors, no sideways scroll`, async ({ page }) => {
			const errors = watchErrors(page);
			await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
			const res = await page.goto(route, { waitUntil: "load" });
			expect(res?.status()).toBe(200);
			await page.waitForTimeout(1500);
			await expect(page.locator("h1")).toHaveCount(1);
			expect(await hasHorizontalScroll(page)).toBe(false);
			expect(errors.list).toEqual([]);
		});
	}
}

test("an unknown route returns 404", async ({ request }) => {
	const res = await request.get("/this-page-does-not-exist", { maxRedirects: 0 });
	expect(res.status()).toBe(404);
});

test("an unknown case-study feature returns 404", async ({ request }) => {
	const res = await request.get("/case-study/unknown", { maxRedirects: 0 });
	expect(res.status()).toBe(404);
});

test("the RSS feed is served", async ({ request }) => {
	const res = await request.get("/blogs/rss.xml");
	expect(res.status()).toBe(200);
	expect(res.headers()["content-type"]).toContain("xml");
});

test("internal links on the homepage resolve (no 4xx/5xx)", async ({ page, request }) => {
	await page.goto("/", { waitUntil: "load" });
	const hrefs = await page.evaluate(() =>
		[...new Set([...document.querySelectorAll("a[href]")].map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""))]
			.filter((h) => h.startsWith("/") && !h.startsWith("//"))
			.map((h) => h.split("#")[0] || "/"),
	);
	const paths = [...new Set(hrefs)];
	expect(paths.length).toBeGreaterThan(5);
	const broken: string[] = [];
	for (const p of paths) {
		const res = await request.get(p); // follows redirects; GET only
		if (res.status() >= 400) broken.push(`${p} ${res.status()}`);
	}
	expect(broken).toEqual([]);
});
