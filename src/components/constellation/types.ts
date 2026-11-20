/** Data for the constellation graph. Plain types only, so server components can build it. */

export type ConstellationColor = "blue" | "sun" | "red" | "leaf" | "orange" | "violet" | "coral" | "caramel";

export type ConstellationHub = {
	id: string;
	label: string;
	color: ConstellationColor;
	/** Decorative dots around the hub (placeholder pages). */
	dots?: number;
	/** Number shown next to the label. Defaults to items + dots. */
	count?: number;
	/** One line about the category (screen-reader label and hover preview). */
	description?: string;
};

export type ConstellationItem = {
	/** Needed only when other items link to this one. */
	id?: string;
	hub: string;
	title: string;
	note?: string;
	/** Small cover image (an optimized URL). */
	image?: string;
	href?: string;
	tags?: string[];
	/** Ids of other items to draw a thread to (e.g. a post to its tags). */
	links?: string[];
	/** "tile" (default) is a square card; "dot" is a small star, e.g. a tag. */
	shape?: "tile" | "dot";
};

/**
 * Phones held upright: the constellation is a framed panel below the title, with a fixed layout
 * (Highlights in staggered rows, labels under their markers). Wider screens and phones held sideways keep the full-screen sky.
 */
export const PHONE_QUERY = "(max-width: 767px) and (orientation: portrait)";

/** Quote + call to action shown under the folded sun. */
export type ConstellationLine = [quote: string, action: string];
