import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end suite (tests/e2e/README.md). It tests a production build served by `next start`:
 *   npm run test:e2e:build   (next build with the staging gate off and a local site URL)
 *   npm run test:e2e         (starts `next start` on port 3310 and runs the suite)
 * The tests only read pages. They never submit forms, write data or call admin routes.
 */
const PORT = 3310;
const BASE_URL = `http://localhost:${PORT}`;
const CI = !!process.env.CI;

export default defineConfig({
	testDir: "./tests/e2e",
	// The constellation lays itself out at random on every load, so a test gets one more try before it fails.
	retries: CI ? 2 : 1,
	workers: CI ? 2 : 4,
	fullyParallel: true,
	forbidOnly: CI,
	timeout: 90_000,
	expect: { timeout: 10_000 },
	reporter: CI ? [["list"], ["html", { open: "never" }], ["github"]] : [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: BASE_URL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		...devices["Desktop Chrome"],
	},
	webServer: {
		command: `npx next start -p ${PORT}`,
		url: BASE_URL,
		reuseExistingServer: !CI,
		timeout: 60_000,
		// Only for this test server. Never put this in an .env file: it is the launch switch (Kay approves launch).
		// It must also be set when building (`npm run test:e2e:build`), because NEXT_PUBLIC_* values are inlined at build time.
		env: { NEXT_PUBLIC_HOMEPAGE_LIVE: "true" },
	},
	globalSetup: "./tests/e2e/global-setup.ts",
});
