/**
 * Motion tokens for the Highlights hero: zoom levels, how far each sky layer travels with the camera,
 * and the timings of the dive / zoom sequences. The matching CSS durations and easings live in
 * highlights.module.css (--ease-out, --ease-io, --dur-hover, the .graph / .sky transitions); change both together.
 * Reduced motion skips these sequences (see `reduced()` in highlights-stage.tsx).
 */
export const MOTION = {
	/** Hovering a Highlight: the sky leans in around it. */
	lean: 1.06,
	/** Zoom into a Highlight (the world view) and into a band below the hero. */
	zoomWorld: 3.4,
	zoomDive: 7,
	/** How much each layer moves with the camera: 1 = the graph itself, lower = further away (parallax). */
	depth: { near: 0.45, far: 0.15 },
	/** Zoom into a Highlight: camera moves, then the world view appears, then the sky settles behind it. */
	world: { approach: 380, settle: 760 },
	/** Back to all Highlights: the camera pulls out, then the sky is shown again. */
	leave: { hold: 240, pull: 420, settle: 700, instant: 380 },
	/** Dive into a band below the hero, and climb back out. */
	dive: { approach: 520, warp: 760, fade: 620, scroll: 650 },
	climb: { pull: 1150 },
	/** Arriving in a band: when the target card is scrolled to. */
	arrive: { card: 450 },
} as const;
