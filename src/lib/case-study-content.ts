/*
 * Public case study at /case-study ("How this site was built"), for developers, collaborators and employers.
 * Text only: the page (src/app/(site)/case-study/page.tsx) renders it. Update it with each release that ships a notable
 * feature or solves a challenge worth telling (CLAUDE.local.md), and bump `updated`.
 *
 * Rules for this file (Kay, 2026-11-25):
 * - Facts only, from STATUS.md, commits and measured results. Never claim something works if it's unverified.
 * - Public: no secrets, IDs, keys, internal paths, org number or personal data, and no security details that help an
 *   attacker (exact limits, rule expressions, admin routes beyond "/admin").
 * - The AI-assisted workflow gets one accurate sentence (`process`), with no details of the team, rules or playbook.
 */

export type Fact = { label: string; value: string };
export type Decision = { area: string; title: string; why: string; tradeoff: string };
export type Feature = { title: string; body: string };
export type Challenge = { area: string; title: string; problem: string; cause?: string; fix: string; result: string };

export const caseStudy = {
	/** ISO date of the last content update, shown on the page. */
	/** ISO date the page was first published (structured data). */
	published: "2026-11-25",
	updated: "2026-11-25",
	title: "How this site was built",
	description:
		"A case study of merkadoph.se: why it was rebuilt, how it works, the decisions behind it and the problems solved along the way.",
	intro:
		"Merkado PH started as a Filipino grocery shop and community hub in Gothenburg. When the groceries moved to a partner store, the business needed a new home for everything else: community events, stories, a record of its community work and three smaller business lines. I designed and built this site to replace the old Shopify store.",

	facts: [
		{ label: "Role", value: "Designed & built by KLA" },
		{ label: "Timeline", value: "Oct 2026 – ongoing" },
		{ label: "Stack", value: "Next.js 16 · Cloudflare · Supabase" },
		{ label: "Hosting", value: "About $5 a month" },
	] satisfies Fact[],

	goals: [
		{ title: "Own the content", body: "A custom admin where the business can publish stories, events, offers and community projects without a developer." },
		{ title: "Keep the search traffic", body: "Old Shopify addresses move across with permanent redirects, so rankings and shared links keep working." },
		{ title: "Fast, accessible, in light and dark", body: "Targets: Lighthouse 100, WCAG 2.2 AA, both colour modes, and every screen from 320px phones up." },
		{ title: "Cheap and calm to run", body: "No servers to maintain, near-free hosting, backups and monitoring, and an approval step before anything goes live." },
	] satisfies Feature[],

	architecture: [
		{ title: "Edge", body: "Cloudflare DNS and CDN, with a firewall rule that turns away vulnerability scanners before the app runs." },
		{ title: "App", body: "Next.js 16 (App Router, Server Components) running as a Cloudflare Worker through the OpenNext adapter." },
		{ title: "Cache", body: "Pages are rendered once and stored at the edge; saving content purges only the affected group, instantly." },
		{ title: "Data", body: "Supabase Postgres with Row Level Security on every table, Supabase Auth with two-step login for admins, and image storage." },
		{ title: "Delivery", body: "GitHub Actions for type checks, a security audit, a full build and end-to-end tests on every push. Production deploys only from a release branch." },
	] satisfies Feature[],

	features: [
		{
			title: "A homepage you can explore",
			body: "The homepage is an interactive night sky: each part of the business is a star, its latest content are smaller stars, and items that share a tag are linked. It opens on the sky alone and the page scrolls once you click the sun. It works with a keyboard, with a screen reader and without animation.",
		},
		{
			title: "One design system, two modes",
			body: "Every page shares one look: a cream page with olive text in light mode and a night-sky navy in dark mode, with a colour per section. It follows the device setting, and every colour pair was measured for contrast in both modes.",
		},
		{
			title: "A content admin shaped around the business",
			body: "Stories, events, offers, services and community projects each have their own editor. Every admin list has search, filters, sorting and pages that live in the URL, so a filtered view can be bookmarked or shared.",
		},
		{
			title: "Magazine-style blog posts",
			body: "Writers pick a layout (a header photo, or a photo pair mid-article), add a swipeable photo row or a video, and place them with a button. If they forget, sensible defaults apply, and publishing checks that every photo has alt text and a caption.",
		},
		{
			title: "Search-friendly from the server",
			body: "Every page sends its own title, description, canonical address, social preview and structured data from the server. A sitemap and RSS feed are generated from the same data, and renaming a page adds a redirect automatically.",
		},
		{
			title: "Filters that work without JavaScript",
			body: "Public lists (stories, events, community projects) filter by tag, year or date with plain links, so every filtered view has its own address and works even if scripts fail.",
		},
	] satisfies Feature[],

	decisions: [
		{
			area: "Hosting",
			title: "Next.js on Cloudflare Workers instead of Vercel",
			why: "Cloudflare was cheaper at this size, already ran the domain's DNS, and includes storage, a small database, rate limiting and scheduled jobs on the same platform.",
			tradeoff: "The adapter needs more setup by hand, and Workers have strict per-request CPU limits. That limit later caused the biggest production issue (see the challenges).",
		},
		{
			area: "Content",
			title: "A custom admin instead of a headless CMS",
			why: "The content is specific: events in Swedish time, community projects grouped by year, tags shared across every type. A hosted CMS would add a vendor and a monthly bill.",
			tradeoff: "More code to build and maintain, in exchange for no lock-in and an editor that fits how the business works.",
		},
		{
			area: "Performance",
			title: "Cache everything, purge precisely",
			why: "Pages are rendered once and served from the edge. Each save purges only its content type, and a small scheduled job publishes or retires timed posts, offers and events on schedule.",
			tradeoff: "Caching adds moving parts, so every content type has a clear purge path, and the admin can clear any group by hand.",
		},
		{
			area: "Security",
			title: "Defence in depth",
			why: "No single layer is trusted: the admin is checked again on the server for every page and action, the database refuses unpublished or private rows to the public, every input is validated, and forms and log-in are rate limited.",
			tradeoff: "The strictest Content Security Policy would make every page render per request and switch off the cache. I chose a slightly looser policy, locked down everywhere else, and documented why.",
		},
		{
			area: "Release",
			title: "Live on the real domain, behind a gate",
			why: "The site was deployed to merkadoph.se early but shows visitors a coming-soon page, while testing happens on the real platform. Pages behind the gate are hidden from search engines.",
			tradeoff: "Going live becomes one deliberate switch instead of something that happens whenever code is saved.",
		},
	] satisfies Decision[],

	challenges: [
		{
			area: "Production",
			title: "Visitors getting a Cloudflare error page",
			problem: "Some requests failed with Cloudflare's \"Error 1102\", clustered around a site crawl and busy editing sessions.",
			cause: "The metrics showed every failure was the CPU time limit. Rendering a page on an uncached request took 44–58 ms, and the free plan allows 10 ms.",
			fix: "Moved to the paid Workers plan ($5 a month) and cut useless load at the edge.",
			result: "No CPU-limit errors since the upgrade so far, and it stays monitored. The lesson: read the metrics before guessing. It looked like a code bug but was a platform limit.",
		},
		{
			area: "Release control",
			title: "Every push was going live",
			problem: "A new production version appeared that nobody had approved.",
			cause: "The hosting was set to deploy every push to the main branch automatically.",
			fix: "Production now deploys only from a separate release branch, which moves forward only after review and approval.",
			result: "Saving work and publishing it are now two separate steps.",
		},
		{
			area: "Security",
			title: "Scanners probing the site",
			problem: "Bots requested paths like /.env and /wp-login.php, and each one woke the app to render a full 404 page.",
			fix: "A firewall rule turns them away before the app runs. Before switching it on, it was tested against the site's real paths (none blocked) and known scanner paths (all blocked).",
			result: "Less wasted work per day, and real visitors unaffected.",
		},
		{
			area: "Performance",
			title: "Mobile Lighthouse from 90 towards 100",
			problem: "Desktop scored 100, but mobile Performance was 90, with the largest paint at about 3.6 s on a simulated slow phone.",
			cause: "The browser downloaded eight preloaded fonts, render-blocking CSS and JavaScript before it could paint the hero text, and laid out the whole long page up front.",
			fix: "Preloaded only the fonts the first screen uses, and let the browser skip rendering sections until they're near the screen. One change at a time, each measured as the median of three runs. Inlining all CSS was tried and dropped: the page grew with no gain.",
			result: "Mobile 97 on the homepage at the time (production build, light mode); a later hero redesign brought it to 92, which is the next performance task. Skipping off-screen sections broke in-page links and the Back button at first; both were caught in review and fixed before release.",
		},
		{
			area: "Accessibility",
			title: "Labels hidden behind photos",
			problem: "On the homepage sky, some section names were partly covered by photos, and the hero title could sit on top of a cluster.",
			cause: "Not the colour (15:1 contrast). SVG paints in document order, so later photos covered earlier labels, and moving the labels would have broken the keyboard order.",
			fix: "Labels are drawn in their own top layer that follows every movement, and the hero title of the time got a keep-out area (the title has since moved out of the sky).",
			result: "Checked on 44 random layouts in both modes: no label, photo or star inside the title, and labels still clickable.",
		},
		{
			area: "Migration",
			title: "Moving years of content off Shopify",
			problem: "Blog posts, images and event write-ups had to move without breaking a single old link.",
			fix: "Import scripts brought posts in as drafts for review and copied their images, then moved event write-ups into the new Community Impact section in one batch, each with a permanent redirect.",
			result: "Old addresses lead to the new pages, and nothing was published without a review.",
		},
		{
			area: "Business change",
			title: "The shop moved out mid-project",
			problem: "A full shop (products, cart, checkout, payments, accounts) was already built when the groceries moved to a partner store.",
			fix: "Instead of deleting working code, one switch turns the shop off everywhere: its pages and endpoints return 404 and its actions refuse to run. The legal pages were rewritten for a site without a shop.",
			result: "The feature is safely unreachable, and can return if the business needs it.",
		},
		{
			area: "Testing",
			title: "A small dependency update that broke the homepage",
			problem: "A routine update of libraries within their allowed versions passed lint, type checks and the build, but several end-to-end browser tests on the homepage graph started failing.",
			cause: "The same tests passed on the unchanged code, so the update was to blame. Comparing the old and new lockfiles narrowed it to a few packages, and rolling back the graph library (d3) by one patch release fixed every test. The new release marks itself as free of side effects, so the bundler could drop its animation module, which only registers itself when it is loaded; my graph code never imported it directly.",
			fix: "One explicit import of that module, so the bundler always keeps it, and the library back on its normal version range. The previously failing tests all pass.",
			result: "Caught before anything went live, and fixed at the cause instead of by holding the library back.",
		},
		{
			area: "Release process",
			title: "A release that only broke for logged-in visitors",
			problem: "Right after a release, every request that carried a cookie crashed with a Cloudflare error, including the admin. Requests without cookies worked, so the automated tests and the health checks after the deploy were all green.",
			cause: "A small update of the Cloudflare adapter pulled in a new version of its shared core, whose request handling crashed on the cookie header. The tests ran the site on Node, not on Cloudflare's own runtime, and the checks after the deploy never sent a cookie.",
			fix: "I rolled the live site back to the previous version the same evening, pinned the adapter to the last working version, checked it on the Cloudflare runtime with and without cookies, and released it again.",
			result: "Down for logged-in visitors for about ten minutes. Every dependency update is now run on the Cloudflare runtime and requested with a cookie before release, and the checks after each deploy send cookies too.",
		},
	] satisfies Challenge[],

	results: [
		{ label: "Lighthouse, desktop homepage", value: "100 / 100 / 100 / 100" },
		{ label: "Lighthouse, mobile homepage", value: "92 performance, 100 accessibility" },
		{ label: "Automated end-to-end tests", value: "103, on every push" },
		{ label: "Database tables with Row Level Security", value: "All 26" },
		{ label: "Accessibility checks (axe, WCAG 2.2 AA)", value: "0 violations on 14 page types, light and dark" },
		{ label: "Codebase", value: "About 27,000 lines of TypeScript" },
	] satisfies Fact[],

	next: [
		"Mobile performance from 92 to 100: a faster first paint for the homepage's big title, a lighter stylesheet for public pages and a smaller JavaScript bundle.",
		"Testing on real phones and with screen readers. Phone testing so far is emulated.",
		"Captions for videos with speech.",
		"Launch: switching off the coming-soon gate once the content is ready.",
	],

	process:
		"Built with AI-assisted development: I set the direction and the design, made every product and technical decision, and reviewed and approved every change before it went live.",
};
