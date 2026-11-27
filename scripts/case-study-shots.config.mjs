/*
 * Shot list for scripts/capture-case-study.mjs ("Behind the Build"). Public pages only: the script refuses /admin and /login.
 * Output name = `<feature>--<state>--<viewport>-<mode>.webp` (lowercase, [a-z0-9-]; `--` separates the parts).
 *
 * Per shot:
 *   feature, state     name parts
 *   url                path on the local production build; "{entry:<world>}" is replaced by the first entry slug of that Highlight
 *   device             "desktop" (1440x900, 1x) | "mobile" (390x844 touch, 2x)
 *   scheme             "light" | "dark" (colour-scheme emulation)
 *   steps              [{ open: true } | { hoverHub: "blogs" } | { click: selector } | { press: key } | { waitFor: selector } | { wait: ms }]
 *   ready              selector that must be visible before the shot
 *   check              "constellation": settle, then label-overlap and covered-square check, retried on a fresh load
 *   clip               "stage": on the phone, capture the whole framed sky (taller than the viewport) instead of the viewport
 *   cue                folded sky only: reload until the cue text contains this string (case-insensitive)
 */

const DEVICES = {
	desktop: { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1, label: "desktop" },
	mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, label: "mobile" },
};

/** Expands one state into desktop/mobile x light/dark. */
function everywhere(base) {
	const out = [];
	for (const device of ["desktop", "mobile"]) for (const scheme of ["light", "dark"]) out.push({ ...base, device, scheme, clip: device === "mobile" ? base.clip : undefined });
	return out;
}

const OPEN_BUTTON = 'button:has-text("Open")';

export const shots = [
	// 1. Fresh visit: the folded sky (hero cue is random, any one will do)
	...everywhere({ feature: "constellation", state: "folded", url: "/", clip: "stage", ready: OPEN_BUTTON, steps: [{ wait: 1500 }] }),
	// 2. Opened: the full constellation
	...everywhere({ feature: "constellation", state: "open", url: "/", clip: "stage", ready: "svg g.hub", steps: [{ open: true }], check: "constellation" }),
	// 3. Hover a hub (preview). Touch devices have no hover: the phone shot taps it instead (see capture script).
	...everywhere({ feature: "constellation", state: "hub-preview", url: "/", clip: "stage", ready: "svg g.hub", steps: [{ open: true }, { hoverHub: "blogs" }], check: "constellation" }),
	// 4. Hub selected: zoomed into a Highlight (deterministic deep link)
	...everywhere({ feature: "constellation", state: "world-blogs", url: "/?world=blogs", ready: "[data-slug]", steps: [{ wait: 2500 }] }),
	// 5. Community Impact grouped by year
	...everywhere({ feature: "constellation", state: "world-impact-year", url: "/?world=impact&year=2025", ready: "[data-slug]", steps: [{ wait: 2500 }] }),
	// 6. One entry open
	...everywhere({ feature: "constellation", state: "entry-open", url: "/?world=blogs&entry={entry:blogs}", ready: "[data-slug]", steps: [{ wait: 3000 }] }),

	// Folded sky with three different cues (Rizal, Shakespeare, Shakespeare), desktop, both modes
	...["light", "dark"].flatMap((scheme) => [
		{ feature: "constellation", state: "folded-cue-noli", url: "/", device: "desktop", scheme, ready: OPEN_BUTTON, cue: "Noli me tángere… but please", steps: [{ wait: 1500 }] },
		{ feature: "constellation", state: "folded-cue-to-click", url: "/", device: "desktop", scheme, ready: OPEN_BUTTON, cue: "To click, or not to click", steps: [{ wait: 1500 }] },
		{ feature: "constellation", state: "folded-cue-stage", url: "/", device: "desktop", scheme, ready: OPEN_BUTTON, cue: "All the world's a stage", steps: [{ wait: 1500 }] },
	]),
];

export { DEVICES };
export default shots;
