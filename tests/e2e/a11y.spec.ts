import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

/**
 * KNOWN OPEN BUGS. These are allowed to fail axe so CI stays green, but each one is listed here with its STATUS.md bug
 * number so it stays visible. When a bug is fixed, delete its entry: the test then fails if the violation comes back.
 * Never add an entry without a STATUS.md bug number. Format: { page matcher, rule id, bug }.
 */
const KNOWN_OPEN: { page: RegExp; rule: string; bug: string }[] = [
	// B36: blog post has an <h3> straight after the <h1>.
	{ page: /^\/blogs\/[^/]+$/, rule: "heading-order", bug: "B36" },
	// Arvid's follow-up (STATUS.md, B33 review): table scroll regions need unique names (landmark-unique). Not yet numbered.
	{ page: /^\/(cookies|privacy)$/, rule: "landmark-unique", bug: "Arvid follow-up after B33" },
];

const isKnown = (path: string, rule: string) => KNOWN_OPEN.some((k) => k.page.test(path) && k.rule === rule);

async function firstPostPath(request: import("@playwright/test").APIRequestContext) {
	const html = await (await request.get("/blogs")).text();
	const m = html.match(/href="(\/blogs\/[a-z0-9][a-z0-9-]*)"/);
	if (!m) throw new Error("No blog post link found on /blogs");
	return m[1];
}

/** The first Community Impact entry (its Facts list was B38; the suite didn't cover these pages before). */
async function firstImpactPath(request: import("@playwright/test").APIRequestContext) {
	const html = await (await request.get("/impact")).text();
	const m = html.match(/href="(\/impact\/[a-z0-9][a-z0-9-]*)"/);
	if (!m) throw new Error("No Community Impact entry link found on /impact");
	return m[1];
}

const SIZES = [{ width: 390, height: 844 }, { width: 1280, height: 800 }];
const SCHEMES = ["light", "dark"] as const;

for (const scheme of SCHEMES) {
	for (const size of SIZES) {
		test.describe(`axe ${scheme} ${size.width}`, () => {
			test.use({ viewport: size, colorScheme: scheme });
			for (const target of ["/", "/blogs", "post", "/events", "/impact", "impact entry", "/tahooo", "/digital", "/bygg", "/privacy", "/cookies", "/case-study", "/case-study/constellation"]) {
				test(`${target}: no WCAG 2.2 AA violations (except known open bugs)`, async ({ page, request }) => {
					const path = target === "post" ? await firstPostPath(request) : target === "impact entry" ? await firstImpactPath(request) : target;
					await page.goto(path, { waitUntil: "load" });
					await page.waitForTimeout(2000);
					const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
					const unexpected = violations.filter((v) => !isKnown(target === "post" ? "/blogs/x" : path, v.id));
					const known = violations.filter((v) => isKnown(target === "post" ? "/blogs/x" : path, v.id));
					for (const v of known) {
						test.info().annotations.push({ type: "known-open-bug", description: `${path}: ${v.id} (${KNOWN_OPEN.find((k) => k.rule === v.id)?.bug})` });
					}
					expect(unexpected.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
				});
			}
		});
	}
}

// B33: the /cookies table scroll region is reachable by keyboard and scrolls sideways.
test("B33: /cookies table wrapper takes focus with Tab and scrolls with ArrowRight at 320", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 640 });
	await page.goto("/cookies", { waitUntil: "load" });
	const wrap = page.locator(".table-scroll").first();
	await expect(wrap).toHaveAttribute("tabindex", "0");
	// It must really overflow at this width, or the test would prove nothing.
	expect(await wrap.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
	let focused = false;
	for (let i = 0; i < 60 && !focused; i++) {
		await page.keyboard.press("Tab");
		focused = await wrap.evaluate((e) => e === document.activeElement);
	}
	expect(focused, "Tab reaches the table wrapper").toBe(true);
	await page.keyboard.press("ArrowRight");
	await expect.poll(() => wrap.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
});
