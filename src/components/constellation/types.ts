/** Data for the constellation graph. Plain types only, so server components can build it. */

export type ConstellationColor = "blue" | "sun" | "red" | "leaf" | "orange" | "violet";

export type ConstellationHub = {
	id: string;
	label: string;
	color: ConstellationColor;
	/** Decorative dots around the hub (placeholder pages). */
	dots?: number;
	/** Number shown next to the label. Defaults to items + dots. */
	count?: number;
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

/** Quote + call to action shown under the folded sun. */
export type ConstellationLine = [quote: string, action: string];
