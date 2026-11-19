import { plexMono } from "@/components/constellation/fonts";
import styles from "@/components/constellation/constellation.module.css";

/** The public "coming soon" homepage: the sky and the text, without the constellation (no client JS). */
export function UnderConstruction() {
	return (
		<main aria-labelledby="coming-soon-title" className={`${styles.stage} ${styles.page} ${plexMono.variable}`}>
			<div className={styles.intro}>
				<p className={styles.eyebrow}>Coming soon · Gothenburg</p>
				<h1 id="coming-soon-title" className={styles.title}>
					Merkado PH
				</h1>
				<p className={styles.lede}>
					The store has a new home. This is what comes next: Filipino culture, festivals and pop-ups, and three years of stories from our community.
				</p>
			</div>
		</main>
	);
}
