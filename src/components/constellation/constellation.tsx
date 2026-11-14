"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IBM_Plex_Mono } from "next/font/google";
import type { ConstellationHub, ConstellationItem, ConstellationLine } from "./types";
import styles from "./constellation.module.css";

const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

/** Shakespeare and Rizal cues: one is drawn at random on each visit and each time the graph folds again. */
export const DEFAULT_LINES: ConstellationLine[] = [
	["Noli me tángere… but please, do.", "Click."],
	["Ang hindi lumingon sa pinanggalingan…", "Click to see where we came from."],
	["Ang kabataan ang pag-asa ng bayan.", "Click to meet the future."],
	["Before the Filibusterismo, the Noli.", "Click to begin chapter one."],
	["Mi último adiós? Hindi pa.", "Click."],
	["Sa aking mga kababayan sa Gothenburg.", "Click to open."],
	["Noli me tángere.", "But go ahead."],
	["Once more unto the breach, dear friends.", "Click."],
	["What light through yonder window breaks?", "Click to see."],
	["The world's mine oyster.", "Click to open it."],
	["All the world's a stage.", "Click to raise the curtain."],
	["Something is rotten in the state of Denmark…", "but not in Gothenburg. Click."],
	["Our revels now are just beginning.", "Click."],
	["To click, or not to click.", "That is the question."],
];

type Props = {
	hubs: ConstellationHub[];
	items: ConstellationItem[];
	/** "page" fills the viewport; "section" is a band inside a page. */
	variant: "page" | "section";
	title: string;
	titleAs?: "h1" | "h2";
	titleId?: string;
	eyebrow?: string;
	lede?: string;
	label: string;
	lines?: ConstellationLine[];
	randomThreads?: boolean;
};

type Engine = { setFolded: (next: boolean) => void; destroy: () => void };

/**
 * A folded "sun" that bursts into a constellation of categories and their items on click.
 * The D3 engine is loaded only when the stage nears the viewport, so it never weighs on first paint.
 */
export function Constellation({ hubs, items, variant, title, titleAs: Title = "h2", titleId, eyebrow, lede, label, lines = DEFAULT_LINES, randomThreads }: Props) {
	const router = useRouter();
	const stageRef = useRef<HTMLElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const tipRef = useRef<HTMLDivElement>(null);
	const engineRef = useRef<Engine | null>(null);
	const [ready, setReady] = useState(false);
	const [folded, setFolded] = useState(true);
	const [hint, setHint] = useState("");

	useEffect(() => {
		const stage = stageRef.current, svg = svgRef.current, tip = tipRef.current;
		if (!stage || !svg || !tip) return;
		let cancelled = false;

		const start = async () => {
			const { mountConstellation } = await import("./engine");
			if (cancelled) return;
			engineRef.current = mountConstellation({
				stage, svg, tip, hubs, items, lines, randomThreads,
				onHint: setHint,
				onFolded: setFolded,
				navigate: (href) => router.push(href),
			});
			setReady(true);
		};

		let io: IntersectionObserver | undefined;
		if (variant === "page" || typeof IntersectionObserver === "undefined") void start();
		else {
			io = new IntersectionObserver((entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					io?.disconnect();
					void start();
				}
			}, { rootMargin: "300px 0px" });
			io.observe(stage);
		}

		return () => {
			cancelled = true;
			io?.disconnect();
			engineRef.current?.destroy();
			engineRef.current = null;
		};
	}, [hubs, items, lines, randomThreads, variant, router]);

	const Tag = variant === "page" ? "main" : "section";

	return (
		<Tag
			ref={stageRef as React.RefObject<HTMLElement & HTMLDivElement>}
			aria-labelledby={titleId}
			className={`${styles.stage} ${styles[variant]} ${plexMono.variable} ${folded ? styles.folded : ""}`}
		>
			<svg ref={svgRef} className={styles.graph} role="group" aria-label={label} />
			<div className={styles.hint}>
				<span className={styles.hintText} aria-live="polite">
					{hint}
				</span>
				{ready && (
					<button className={styles.foldBtn} type="button" onClick={(e) => { e.stopPropagation(); engineRef.current?.setFolded(!folded); }}>
						{folded ? "Open" : "Fold again"}
					</button>
				)}
			</div>
			<div className={styles.intro}>
				{eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
				<Title id={titleId} className={styles.title}>
					{title}
				</Title>
				{lede && <p className={styles.lede}>{lede}</p>}
			</div>
			<div ref={tipRef} className={styles.tip} hidden />
		</Tag>
	);
}
