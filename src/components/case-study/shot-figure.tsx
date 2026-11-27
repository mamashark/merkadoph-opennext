import { getImageProps } from "next/image";
import manifestJson from "@/lib/case-study/shots-manifest.json";
import type { Shot, ShotManifest } from "@/lib/case-study/types";

const manifest = manifestJson as ShotManifest;

/**
 * One capture shown in the visitor's colour scheme: a <picture> whose dark source applies under prefers-color-scheme: dark
 * (no JavaScript). `shots` are the variants of one capture (light and/or dark); the light one is the default <img>.
 * Files are served as they are (`unoptimized`: they are already final-size WebP, so no image-transform cost) with the real
 * width and height from the capture manifest, so nothing shifts while loading. Only `eager` ones load at once.
 */
export function ShotFigure({ shots, eager = false, className = "" }: { shots: Shot[]; eager?: boolean; className?: string }) {
	const light = shots.find((s) => s.mode !== "dark") ?? shots[0];
	const dark = shots.find((s) => s.mode === "dark");
	const props = (s: Shot) => {
		const m = manifest[s.file];
		return getImageProps({ src: `/case-study/${s.file}`, alt: s.alt, width: m.width, height: m.height, unoptimized: true, loading: eager ? "eager" : "lazy", fetchPriority: eager ? "high" : "auto" }).props;
	};
	const base = props(light);
	const darkSrc = dark && dark !== light ? props(dark).src : null;
	return (
		<figure className={className}>
			<picture>
				{darkSrc && <source media="(prefers-color-scheme: dark)" srcSet={darkSrc} />}
				<img {...base} alt={light.alt} className="h-auto w-full border border-site-line bg-site-sunken" />
			</picture>
			<figcaption className="mt-2 text-sm text-site-muted">{light.caption}</figcaption>
		</figure>
	);
}
