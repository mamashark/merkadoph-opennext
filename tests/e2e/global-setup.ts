import type { FullConfig } from "@playwright/test";

/**
 * Fails fast with a clear message when the server is a normal production build:
 * then the staging gate is on and every page is the "coming soon" page.
 */
export default async function globalSetup(config: FullConfig) {
	const base = config.projects[0]?.use.baseURL ?? "http://localhost:3310";
	const html = await (await fetch(`${base}/`)).text();
	if (html.includes('id="coming-soon-title"')) {
		throw new Error(
			"The test server shows the coming-soon page: this build has the staging gate on. " +
				"Build with `npm run test:e2e:build` (sets NEXT_PUBLIC_HOMEPAGE_LIVE=true for the build only) and run again.",
		);
	}
}
