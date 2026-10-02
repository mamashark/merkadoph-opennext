"use client";

import { useSyncExternalStore } from "react";

export type Viewport = "mobile" | "tablet" | "desktop";

const queries = { desktop: "(min-width: 1024px)", tablet: "(min-width: 768px)" };

function read(): Viewport {
	if (window.matchMedia(queries.desktop).matches) return "desktop";
	if (window.matchMedia(queries.tablet).matches) return "tablet";
	return "mobile";
}

function subscribe(onChange: () => void) {
	const lists = Object.values(queries).map((q) => window.matchMedia(q));
	lists.forEach((l) => l.addEventListener("change", onChange));
	return () => lists.forEach((l) => l.removeEventListener("change", onChange));
}

/** Breakpoints from the admin style reference: mobile < 768 ≤ tablet < 1024 ≤ desktop. */
export function useViewport(): Viewport {
	return useSyncExternalStore(subscribe, read, () => "desktop");
}
