"use client";

import { useState } from "react";
import styles from "./highlights.module.css";

/**
 * Category chips for the homepage's story grid. Filters the cards already on the page (no reload);
 * the full, URL-filterable list lives on /blogs.
 */
export function ChipFilter({ categories, target, label }: { categories: string[]; target: string; label: string }) {
	const [active, setActive] = useState("All");
	const pick = (cat: string) => {
		setActive(cat);
		document.querySelectorAll<HTMLElement>(`#${target} [data-cat]`).forEach((el) => {
			el.hidden = !(cat === "All" || el.dataset.cat === cat);
		});
	};
	return (
		<div className={styles.chips} role="group" aria-label={label}>
			{["All", ...categories].map((c) => (
				<button key={c} type="button" className={styles.chip} aria-pressed={active === c} data-chip-all={c === "All" ? "" : undefined} onClick={() => pick(c)}>
					{c}
				</button>
			))}
		</div>
	);
}
