import { plexMono } from "@/components/constellation/fonts";
import styles from "@/components/constellation/constellation.module.css";
import own from "./under-construction.module.css";

/** Seeded random numbers, so the server always renders the same sky (no layout shift, no hydration). */
function rng(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const rand = rng(2023);
const STARS = Array.from({ length: 110 }, (_, i) => ({
	left: rand() * 100,
	top: rand() * 100,
	size: 1 + rand() * rand() * 2.6,
	delay: -rand() * 6,
	duration: 2.5 + rand() * 4.5,
	bright: i % 14 === 0,
}));

/** The public "coming soon" homepage: text in the top-left corner over a twinkling night (or day) sky. Pure CSS, no client JS. */
export function UnderConstruction() {
	return (
		<main aria-labelledby="coming-soon-title" className={`${styles.stage} ${styles.page} ${plexMono.variable}`}>
			<div className={own.sky} aria-hidden="true">
				{STARS.map((s, i) => (
					<span
						key={i}
						className={`${own.star} ${s.bright ? own.bright : ""}`}
						style={
							{
								left: `${s.left.toFixed(2)}%`,
								top: `${s.top.toFixed(2)}%`,
								"--s": `${(s.bright ? s.size + 1 : s.size).toFixed(2)}px`,
								"--d": `${s.delay.toFixed(2)}s`,
								"--t": `${s.duration.toFixed(2)}s`,
							} as React.CSSProperties
						}
					/>
				))}
			</div>
			<div className={`${styles.intro} ${own.top}`}>
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
