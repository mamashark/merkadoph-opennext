/*
 * Feature page: the homepage constellation (/case-study/constellation). The flagship.
 * Rules as in src/lib/case-study-content.ts (public, first person, facts only, no admin routes / config / infrastructure / rule
 * expressions). "Under the hood" names public application source files only. Every claim there was read in the code on `verified`.
 * "[CONFIRM: ...]" stays visible until Kay answers; the e2e check fails while any is public (tests/e2e/case-study.spec.ts).
 */
import type { ShowcaseFeature, Shot, ShotViewport } from "../types";

const DATE = "2026-11-27";

/** Light and dark variants of one capture. The page shows the one that matches the visitor's colour scheme. */
function pair(name: string, viewport: ShotViewport, state: string, alt: string, caption: string): Shot[] {
	const v = viewport === "mobile" ? "mobile" : "desktop";
	return (["light", "dark"] as const).map((mode) => ({ file: `constellation--${name}--${v}-${mode}.webp`, alt, caption, viewport, state, mode }));
}

export const constellation: ShowcaseFeature = {
	slug: "constellation",
	title: "The homepage constellation",
	summary: "The homepage as an interactive sky: seven Highlights, their latest content, and threads between items that share a tag.",
	category: "experience",
	status: "live",
	flagship: true,
	skills: ["frontend", "state-url", "accessibility", "performance-edge"],
	updated: DATE,
	problem:
		"Merkado PH is one business with seven very different strands: stories, events, a yearly record of community work, two service businesses, a taho cart and a bulletin board. The front page had to show them as one community, without a long menu.",
	solution:
		"I built the homepage as an interactive sky. Each strand is a Highlight, its newest content are smaller stars around it, and items that share a tag are joined by a thread. It is a d3 force layout drawn from the same server data as the rest of the site. Every view has its own link, and the same content is also listed as ordinary sections below the sky.",

	walkthrough: [
		{
			id: "fresh-visit",
			step: "A folded sky",
			body: "The page opens with a quiet, folded sky and a short invitation to open it. The invitation is one of 14 lines, seven that nod to José Rizal and Filipino sayings and seven that play on Shakespeare. One is picked at random on load, and a different one each time the sky folds again. The two writers are a personal nod: I liked reading Shakespeare in my literature classes, and in college a minor subject on the Life and Works of Rizal was where I felt at ease, a break from the maths and programming.",
			shots: [
				...pair("folded", "desktop", "Folded sky", "The folded sky on a wide screen: a dark sky with a few stars, the title \"Ang Bagong Yugto\" set upright on the left, an Open button at the top right and a short invitation line in the middle.", "The folded sky on first visit."),
				...pair("folded", "mobile", "Folded sky", "The folded sky on a phone: the title and an Open button above a framed panel of stars with a short invitation line in the middle.", "The same view on a phone."),
				...pair("folded-cue-noli", "desktop", "Invitation: Rizal", "The folded sky with the invitation \"Noli me tángere… but please, do.\" and the word Click.", "One of the Rizal lines: \"Noli me tángere… but please, do.\""),
				...pair("folded-cue-to-click", "desktop", "Invitation: Shakespeare", "The folded sky with the invitation \"To click, or not to click.\" and \"That is the question.\"", "One of the Shakespeare lines: \"To click, or not to click.\""),
				...pair("folded-cue-stage", "desktop", "Invitation: Shakespeare", "The folded sky with the invitation \"All the world's a stage.\" and \"Click to raise the curtain.\"", "Another: \"All the world's a stage.\""),
			],
		},
		{
			id: "open-the-sky",
			step: "Open the sky",
			body: "Clicking the sun, or the Open button, unfolds the whole constellation. The Highlights spread out, their newest content hangs around them as photo tiles and dots, and faint threads join items that share a tag. The layout is random on every load, so no two visits look the same.",
			shots: [
				...pair("open", "desktop", "Opened sky", "The opened sky on a wide screen: seven labelled Highlights, each with small photo tiles around it and thin lines to the centre and to each other.", "The opened sky."),
				...pair("open", "mobile", "Opened sky", "The opened sky on a phone: the Highlights in two staggered columns inside a framed panel, each with a label under its marker.", "On a phone the Highlights sit in fixed staggered rows."),
			],
		},
		{
			id: "hover-a-highlight",
			step: "Hover or focus a Highlight",
			body: "Hovering a Highlight with a mouse brings it forward, dims the rest and shows a small preview: its description and its first entries. Clicking it zooms in. On a phone there is no hover, so a tap opens the Highlight straight away.",
			shots: [
				...pair("hub-preview-events", "desktop", "Preview", "The opened sky with the Events Highlight in front: a preview card lists two events with their dates and places and says Click to zoom into Events.", "The preview of Events."),
			],
		},
		{
			id: "zoom-in",
			step: "Zoom into a Highlight",
			body: "A click zooms into one Highlight and opens a list of its entries beside the sky. The address changes to ?world=events, so this view can be linked to, and the Back button steps out again.",
			liveHref: "/?world=events",
			shots: [
				...pair("world-events", "desktop", "Zoomed Highlight", "A single Highlight, Events, with a list of its two upcoming events on the left and the Highlight with two photo tiles on the right.", "Inside Events: the list on the left, the Highlight in the sky."),
				...pair("world-events", "mobile", "Zoomed Highlight", "On a phone, the Events Highlight opens as a full view with the Highlight above and the list below.", "On a phone the Highlight opens as a full view."),
			],
		},
		{
			id: "its-entries",
			step: "Its entries",
			body: "Each Highlight lists its own entries. Project Taho, for example, shows the taho cart and its flavours, and ends with a link to the Tahooo Corner page.",
			liveHref: "/?world=tahooo",
			shots: [
				...pair("world-tahooo", "desktop", "Entries of a Highlight", "The Project Taho Highlight: a list of the Tahooo Corner page and eight flavours on the left, and the Highlight with photo tiles of each flavour on the right.", "Project Taho and its flavours."),
				...pair("world-tahooo", "mobile", "Entries of a Highlight", "On a phone, the Project Taho Highlight with the list of flavours below it.", "The same on a phone."),
			],
		},
		{
			id: "one-entry",
			step: "One entry, and years",
			body: "Opening an entry shows it beside the sky, with Previous and Next to move through the Highlight. Community Impact is grouped by year, with one star per year, and a year is also a link (?world=impact&year=2025).",
			liveHref: "/?world=impact&year=2025",
			shots: [
				...pair("entry-open", "desktop", "Entry open", "The Blogs Highlight with one story open on the left: its photo, date, title, summary, tags, a Read the full story button and Previous and Next buttons.", "A story open inside Blogs."),
				...pair("entry-open", "mobile", "Entry open", "On a phone, a story open as a full view with its photo, title and a Read the full story button.", "The same on a phone."),
				...pair("world-impact-year", "desktop", "Community Impact, one year", "Community Impact for 2025: the year's entries listed with dates and places, and the Highlight's photo tiles in the sky.", "Community Impact, year 2025."),
				...pair("world-impact-year", "mobile", "Community Impact, one year", "On a phone, Community Impact for 2025 with the sky above and the year's entries listed below.", "The same on a phone."),
			],
		},
		{
			id: "stepping-out",
			step: "Switching Highlights and stepping out",
			body: "Escape, or the Back button, steps out one level at a time: entry, year, Highlight, sky. Stepping out returns keyboard focus to the Highlight you came from, so you never lose your place. Each step forward is a history entry, so Back behaves as people expect.",
			shots: [],
		},
		{
			id: "phone-layout",
			step: "On a phone",
			body: "Held upright, a phone gets a different layout: the title and intro above a framed panel, with the Highlights in fixed, staggered rows and at most two photos each (the rest are dots that still link). Touch does not drag the stars, so swipes scroll the page. Held sideways, a phone gets the full sky like a wider screen. The phone shots in the steps above show this layout.",
			shots: [],
		},
		{
			id: "keyboard-and-motion",
			step: "Keyboard, screen readers and reduced motion",
			body: "Every Highlight is a button you can reach with Tab and open with Enter or Space, and its name, count and description are read out. The sky is a visual layer: the same content is listed as normal sections and links further down the page. With reduced motion switched on, the stars stop drifting and zooms and scrolls happen at once.",
			shots: [],
		},
	],

	highlights: {
		blogs: {
			what: "Stories from Merkado PH and the community.",
			feeds: "Blog posts.",
			rule: "The pinned post first, then the 10 newest published posts (the pinned one is not repeated). Its hub shows the total number of published posts.",
			shots: pair("entry-open", "desktop", "A story open in Blogs", "The Blogs Highlight with one story open beside the sky.", "Blogs, with a story open."),
			count: { value: 10, unit: "posts", asOf: DATE },
		},
		events: {
			what: "Community and cultural events, pop-ups and festivals.",
			feeds: "Events.",
			rule: "Up to 10 upcoming events. When nothing is coming up, the 5 most recent events instead, and the Highlight says so (\"Our most recent events\" and a link to the archive).",
			shots: pair("world-events", "desktop", "Events", "The Events Highlight with its upcoming events listed.", "Events, with two upcoming events."),
			count: { value: 2, unit: "events", asOf: DATE },
		},
		impact: {
			what: "A record of the community's work, year by year.",
			feeds: "Community Impact entries.",
			rule: "One star per year, newest year first. A year opens a list of its entries in calendar order, and each year is also a link.",
			shots: pair("world-impact-year", "desktop", "Community Impact, 2025", "Community Impact for 2025 with its entries listed.", "Community Impact, year 2025."),
			count: { value: 3, unit: "entries", asOf: DATE },
		},
		bygg: {
			what: "Merkado Byggnadsavdelning, the construction business by Tindero Pedro. Its page is in Swedish.",
			feeds: "Fixed content from the site's code, not the database: its page and its services.",
			rule: "Always shown, even before any service is listed. It has a star for its page and one for each service.",
			shots: pair("world-bygg", "desktop", "Merkado Byggnadsavdelning", "The Byggnadsavdelning Highlight with its page and four services listed, and photo tiles in the sky.", "Merkado Byggnadsavdelning and its services."),
		},
		digital: {
			what: "Merkado PH Digital: branding, marketing, websites and consulting.",
			feeds: "Fixed content from the site's code, not the database: its page and its services.",
			rule: "Always shown. It has a star for its page and one for each service.",
			shots: pair("world-digital", "desktop", "Merkado PH Digital", "The Merkado PH Digital Highlight with its page and four services listed.", "Merkado PH Digital and its services."),
		},
		tahooo: {
			what: "Project Taho, with Tahooo Corner: taho for events in Gothenburg.",
			feeds: "Fixed content from the site's code, not the database: the cart page and the flavour menu.",
			rule: "Always shown. It has a star for the Tahooo Corner page and one for each flavour. Blogs and events tagged Tahooo are joined to its page star by a thread.",
			shots: pair("world-tahooo", "desktop", "Project Taho", "The Project Taho Highlight with the Tahooo Corner page and its flavours listed.", "Project Taho and its flavours."),
			count: { value: 9, unit: "entries", asOf: DATE },
		},
		bulletin: {
			what: "Embassy news, community notices and offers.",
			feeds: "Bulletin Board items and current offers.",
			rule: "Up to 6 notices (by their set priority, then newest) and up to 4 current offers.",
			shots: pair("world-bulletin", "desktop", "Bulletin Board", "The Bulletin Board Highlight with six notices listed by title, category and month.", "The Bulletin Board, six notices."),
			count: { value: 6, unit: "notices and offers", asOf: DATE },
		},
	},

	underTheHood: [
		{
			label: "Layout",
			body: "A d3 force simulation places the stars: Highlights repel each other strongly, photo tiles and dots less, and a collision force keeps them apart. Each load starts from random positions, which is why the sky differs every time. The engine is a separate chunk loaded by a dynamic import, so it is not part of the first load.",
			source: ["engine.ts", "highlights-stage.tsx"],
			verified: DATE,
		},
		{
			label: "Colours",
			body: "The engine reads its colours from the page's CSS custom properties, which have one set for the night sky (dark) and one for the day sky (light). When the visitor's colour scheme changes, it rebuilds the sky. No colour is written into the script.",
			source: ["engine.ts", "highlights.module.css"],
			verified: DATE,
		},
		{
			label: "State in the address",
			body: "Which Highlight is open, which year and which entry are mirrored in the URL (?world=, ?year=, ?entry=). Opening a level pushes a history entry, and the Back button listens to it, so every view is linkable and Back steps out one level.",
			source: ["highlights-stage.tsx"],
			verified: DATE,
		},
		{
			label: "Labels in their own layer",
			body: "SVG paints in document order, so photo tiles drawn later covered earlier labels. Moving the labels would have broken the keyboard order, so they are drawn in a separate top layer that follows every movement. The layer is hidden from screen readers because each Highlight already carries its name.",
			source: ["engine.ts"],
			verified: DATE,
		},
		{
			label: "Clear space for the Open button",
			body: "Wide screens reserve a corner for the Open/Fold button: a Highlight or its label that would land under it is moved below it.",
			source: ["engine.ts", "highlights-stage.tsx"],
			verified: DATE,
		},
		{
			label: "Phone layout",
			body: "A media query for phones held upright (up to 767 px wide, portrait) switches the engine to a fixed layout in a framed panel instead of the force layout. Touch does not drag stars.",
			source: ["engine.ts", "types.ts"],
			verified: DATE,
		},
		{
			label: "Keyboard and screen readers",
			body: "Each Highlight is a focusable button that opens with Enter or Space. Escape steps out one level, and focus returns to the Highlight. Tap targets have an invisible 44 px circle around the 10 px marker. The same content is rendered as normal HTML sections after the sky.",
			source: ["engine.ts", "highlights-world.tsx", "highlights-stage.tsx", "highlights-home.tsx"],
			verified: DATE,
		},
		{
			label: "Motion and battery",
			body: "With reduced motion, the stars do not drift and zooms and scrolls are instant. Animations also pause when the sky is off screen or the tab is hidden.",
			source: ["engine.ts", "highlights-stage.tsx"],
			verified: DATE,
		},
		{
			label: "One list of Highlights",
			body: "The seven Highlights are defined once, and both the homepage and this page read that list. A Highlight added there shows up on this page as a visible gap until it has a description.",
			source: ["highlights.ts", "highlights-home.tsx"],
			verified: DATE,
		},
	],

	challenges: ["hidden-labels", "dependency-update", "mobile-lighthouse"],

	results: [
		{ label: "Label overlaps after the tap-target fix", value: "0 in 40 landscape-phone loads (before: 47 in 68)", measured: "2026-11-24", note: "Emulated phones in headless Chrome, development server. Not real devices." },
		{ label: "Squares that open their own Highlight", value: "280 of 280 landscape loads checked", measured: "2026-11-24", note: "Emulated, as above." },
		{ label: "Real taps that opened the right Highlight", value: "125 of 126 in landscape", measured: "2026-11-24", note: "Emulated, as above." },
	],

	future: ["Test the sky on real iPhones and Android phones. So far phones are emulated."],
	related: [],
};
