import Image from "next/image";
import type { PortfolioImage } from "@/lib/portfolio";
import { cn } from "@/lib/ui";

/**
 * "Abstract" project grid: a repeating pattern of large, tall and wide tiles (dense flow fills gaps).
 * The image description slides in on hover / keyboard focus; on touch screens (no hover) it's always shown.
 * Server component — no JavaScript needed.
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

export function PortfolioImageGrid({ images, title, priorityFirst = false, className }: { images: PortfolioImage[]; title: string; priorityFirst?: boolean; className?: string }) {
	if (!images.length) return null;
	return (
		<ul className={cn("grid grid-flow-dense auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[11rem] md:grid-cols-6 md:auto-rows-[12rem]", className)}>
			{images.map((img, i) => {
				const { tile, sizes } = PATTERN[i % PATTERN.length];
				const hasText = !!img.description;
				return (
					<li key={`${img.url}-${i}`} className={tile}>
						<figure
							tabIndex={hasText ? 0 : undefined}
							className="group relative h-full overflow-hidden rounded-2xl bg-[#f4ebd9] outline-none ring-teal-600 ring-offset-2 focus-visible:ring-2 dark:bg-stone-800 dark:ring-offset-stone-950"
						>
							<Image
								src={img.url}
								alt={img.alt || `${title} — photo ${i + 1}`}
								fill
								sizes={sizes}
								loading={priorityFirst && i === 0 ? "eager" : "lazy"}
								fetchPriority={priorityFirst && i === 0 ? "high" : undefined}
								className="object-contain transition duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
							/>
							{hasText && (
								<figcaption
									className={cn(
										"absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-4 pb-3 pt-10 text-sm leading-snug text-white",
										"transition duration-300 ease-out motion-reduce:transition-none",
										// Hover-capable devices: hidden until hover/focus. Touch: always visible.
										"[@media(hover:hover)]:translate-y-3 [@media(hover:hover)]:opacity-0",
										"group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100",
									)}
								>
									{img.description}
								</figcaption>
							)}
						</figure>
					</li>
				);
			})}
		</ul>
	);
}
