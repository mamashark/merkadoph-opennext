"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Expand } from "lucide-react";
import type { PortfolioImage } from "@/lib/portfolio";
import { PortfolioLightbox } from "./lightbox";
import { cn } from "@/lib/ui";

/**
 * "Abstract" project grid: a repeating pattern of large, tall and wide tiles (dense flow fills gaps).
 * Photos are cropped to fill their tile (object-cover). The description slides in on hover / keyboard
 * focus (always visible on touch screens). Clicking a photo opens the full-screen viewer.
 * Rendered on the server too (client component), so every image is in the HTML.
 */
const PATTERN: Array<{ tile: string; sizes: string }> = [
	{ tile: "col-span-2 row-span-2 md:col-span-4 md:row-span-2", sizes: "(min-width: 768px) 66vw, 100vw" },
	{ tile: "md:col-span-2", sizes: "(min-width: 768px) 33vw, 50vw" },
	{ tile: "md:col-span-2", sizes: "(min-width: 768px) 33vw, 50vw" },
	{ tile: "row-span-2 md:col-span-2 md:row-span-2", sizes: "(min-width: 768px) 33vw, 50vw" },
	{ tile: "md:col-span-2", sizes: "(min-width: 768px) 33vw, 50vw" },
	{ tile: "md:col-span-2", sizes: "(min-width: 768px) 33vw, 50vw" },
	{ tile: "col-span-2 md:col-span-3", sizes: "(min-width: 768px) 50vw, 100vw" },
	{ tile: "col-span-2 md:col-span-3", sizes: "(min-width: 768px) 50vw, 100vw" },
];

export function PortfolioImageGrid({
	images,
	title,
	priorityFirst = false,
	className,
	/** Images the viewer can browse (defaults to the shown ones), e.g. all photos while the grid shows 8. */
	viewerImages,
}: {
	images: PortfolioImage[];
	title: string;
	priorityFirst?: boolean;
	className?: string;
	viewerImages?: PortfolioImage[];
}) {
	const [open, setOpen] = useState<number | null>(null);
	const tiles = useRef<Array<HTMLButtonElement | null>>([]);
	if (!images.length) return null;
	const all = viewerImages ?? images;

	return (
		<>
			<ul className={cn("grid grid-flow-dense auto-rows-36 grid-cols-2 gap-3 sm:auto-rows-44 md:grid-cols-6 md:auto-rows-48", className)}>
				{images.map((img, i) => {
					const { tile, sizes } = PATTERN[i % PATTERN.length];
					const label = img.alt || `${title} — photo ${i + 1}`;
					return (
						<li key={`${img.url}-${i}`} className={tile}>
							<figure className="relative h-full">
								<button
									ref={(el) => void (tiles.current[i] = el)}
									type="button"
									onClick={() => setOpen(i)}
									aria-haspopup="dialog"
									aria-label={`Open photo ${i + 1} full screen: ${label}`}
									className="group relative block h-full w-full cursor-zoom-in overflow-hidden rounded-2xl bg-[#f4ebd9] ring-teal-600 ring-offset-2 focus-visible:outline-none focus-visible:ring-2 dark:bg-stone-800 dark:ring-offset-stone-950"
								>
									<Image
										src={img.url}
										alt={label}
										fill
										sizes={sizes}
										loading={priorityFirst && i === 0 ? "eager" : "lazy"}
										fetchPriority={priorityFirst && i === 0 ? "high" : undefined}
										className="object-cover transition duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
									/>
									<span className="absolute right-3 top-3 rounded-full bg-black/45 p-1.5 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
										<Expand className="h-4 w-4" />
									</span>
									{img.description && (
										<span
											className={cn(
												"absolute inset-x-0 bottom-0 block bg-linear-to-t from-black/85 via-black/55 to-transparent px-4 pb-3 pt-10 text-left text-sm leading-snug text-white",
												"transition duration-300 ease-out motion-reduce:transition-none",
												// Hover-capable devices: hidden until hover/focus. Touch: always visible.
												"[@media(hover:hover)]:translate-y-3 [@media(hover:hover)]:opacity-0",
												"group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100",
											)}
										>
											{img.description}
										</span>
									)}
								</button>
								{img.description && <figcaption className="sr-only">{img.description}</figcaption>}
							</figure>
						</li>
					);
				})}
			</ul>
			<PortfolioLightbox
				images={all}
				title={title}
				index={open}
				onIndex={setOpen}
				onClose={() => {
					const last = open;
					setOpen(null);
					// Return focus to the tile that opened the viewer (when it's visible in the grid).
					if (last !== null && last < images.length) tiles.current[last]?.focus();
				}}
			/>
		</>
	);
}
