/**
 * Blog photo layouts (approved mock-up: local/design/blog-layout-mockup.html, Kay 2026-11-24).
 * Shared by the admin form, the save action and the public post page; no server-only imports.
 */

export const PHOTO_LAYOUTS = ["A", "B", "none"] as const;
export type PhotoLayout = (typeof PHOTO_LAYOUTS)[number];

/** One photo from the media library, with its caption (shown under it) and alt text (for screen readers). */
export type BlogPhoto = { url: string; alt: string; caption: string };

/** How many layout photos each layout uses. */
export const LAYOUT_SLOTS: Record<PhotoLayout, number> = { A: 1, B: 2, none: 0 };
/** Photos in a post's slideshow row (the database allows 40). */
export const MAX_SLIDESHOW = 24;

export const PHOTOS_MARKER = "[[photos]]";
export const SLIDESHOW_MARKER = "[[slideshow]]";

export const isPhotoLayout = (v: unknown): v is PhotoLayout => PHOTO_LAYOUTS.includes(v as PhotoLayout);

/** Caption length for layout and row photos (the form fields use the same limit). */
export const CAPTION_MAX = 300;

/**
 * The layout photos a layout actually shows, by slot position (slot 0 = header / left, slot 1 = right). Slots keep
 * their position when stored, so an empty slot 0 never lets slot 1 slip into its place (Arvid, 2026-11-25).
 */
export const shownLayoutPhotos = (layout: PhotoLayout, photos: BlogPhoto[]) => photos.slice(0, LAYOUT_SLOTS[layout]).filter((p) => !!p?.url);

/** Publish rules as fixed codes, so the admin shows fixed messages (never free text from the URL; Sig F6). */
export const PUBLISH_PROBLEMS = {
	"layout-two": "Layout B needs two photos. Pick both, or choose another layout.",
	"layout-alt": "Add alt text to the layout photos: it describes them for screen readers and Google.",
	"row-caption": "Add a caption to every photo in the photo row.",
	"video-transcript": "Add a transcript for the video: it's how people who can't watch or hear it get its content.",
} as const;
export type PublishProblem = keyof typeof PUBLISH_PROBLEMS;
/** Which part of the post each rule belongs to; on a live post that part keeps its live version. */
export const PROBLEM_PART: Record<PublishProblem, "layout" | "row" | "video"> = {
	"layout-two": "layout",
	"layout-alt": "layout",
	"row-caption": "row",
	"video-transcript": "video",
};
export const PART_LABEL = { layout: "the layout photos", row: "the photo row", video: "the video" } as const;

/** A part of the article, in reading order. */
export type BodyPart = { kind: "text"; text: string } | { kind: "photos" } | { kind: "slideshow" };

/** A marker counts only on a line of its own (outside code fences), so it can never break a paragraph. */
const markerLine = (line: string) => {
	if (/^( {4}|\t)/.test(line)) return null; // an indented code block, not a marker
	const t = line.trim();
	return t === PHOTOS_MARKER ? "photos" : t === SLIDESHOW_MARKER ? "slideshow" : null;
};

/** Tracks Markdown code fences: a fence opened with ``` closes only with ``` (and ~~~ with ~~~). */
function fenceTracker() {
	let open: string | null = null;
	return (line: string) => {
		const m = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
		if (m) {
			if (!open) open = m[1][0];
			else if (m[1][0] === open) open = null;
		}
		return open !== null || !!m;
	};
}

/** How many times each marker sits on its own line (for the editor's "placed twice" warning). */
export function countMarkers(content: string) {
	const n = { photos: 0, slideshow: 0 };
	const inFence = fenceTracker();
	for (const line of content.split("\n")) {
		const m = !inFence(line) && markerLine(line);
		if (m) n[m]++;
	}
	return n;
}

/**
 * Splits the article text at the markers. The first marker of each kind wins; repeats are dropped.
 * Defaults when a marker isn't placed: the middle pair (Layout B) goes halfway, at a block boundary; the slideshow goes
 * at the end. A photos marker does nothing in Layout A or None (A's photo is under the title), so it's removed.
 */
export function splitBody(content: string, opts: { pair: boolean; slideshow: boolean }): BodyPart[] {
	const parts: BodyPart[] = [];
	const used = { photos: false, slideshow: false };
	let buf: string[] = [];
	const inFence = fenceTracker();
	const flush = () => {
		const text = buf.join("\n").trim();
		if (text) parts.push({ kind: "text", text });
		buf = [];
	};
	for (const line of content.split("\n")) {
		const m = !inFence(line) && markerLine(line);
		if (!m) {
			buf.push(line);
			continue;
		}
		const wanted = m === "photos" ? opts.pair : opts.slideshow;
		if (wanted && !used[m]) {
			flush();
			parts.push({ kind: m });
		}
		used[m] = true;
	}
	flush();

	if (opts.pair && !used.photos) insertHalfway(parts);
	if (opts.slideshow && !used.slideshow) parts.push({ kind: "slideshow" });
	return parts;
}

/** Puts the pair after the block (paragraph, heading, list…) closest to the middle of the text, never inside a fence. */
function insertHalfway(parts: BodyPart[]) {
	const texts = parts.filter((p): p is Extract<BodyPart, { kind: "text" }> => p.kind === "text");
	const total = texts.reduce((n, p) => n + p.text.length, 0);
	if (!total) {
		parts.unshift({ kind: "photos" });
		return;
	}
	let seen = 0;
	for (let i = 0; i < parts.length; i++) {
		const p = parts[i];
		if (p.kind !== "text") continue;
		if (seen + p.text.length < total / 2) {
			seen += p.text.length;
			continue;
		}
		// Block boundaries in this part: blank lines outside fences.
		const lines = p.text.split("\n");
		const inFenceHere = fenceTracker();
		let best = -1, bestDist = Infinity, pos = seen;
		lines.forEach((line, k) => {
			const fenced = inFenceHere(line);
			pos += line.length + 1;
			if (!fenced && line.trim() === "" && k > 0) {
				const d = Math.abs(pos - total / 2);
				if (d < bestDist) {
					best = k;
					bestDist = d;
				}
			}
		});
		if (best < 0) {
			// No break inside this part: put the pair after it.
			parts.splice(i + 1, 0, { kind: "photos" });
			return;
		}
		const before = lines.slice(0, best).join("\n").trim(), after = lines.slice(best).join("\n").trim();
		parts.splice(i, 1, ...([{ kind: "text", text: before }, { kind: "photos" }, { kind: "text", text: after }] as BodyPart[]).filter((x) => x.kind !== "text" || x.text));
		return;
	}
	parts.push({ kind: "photos" });
}
