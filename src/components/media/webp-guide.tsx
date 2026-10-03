import { ChevronDown, ExternalLink, Lightbulb } from "lucide-react";
import { MAX_UPLOAD_MB } from "@/lib/upload-rules";
import { cn } from "@/lib/ui";

const SQUOOSH = "https://squoosh.app/";
const MAX_WIDTH = 1200;

/**
 * Step-by-step guide for preparing images (WebP, ≤ 1200px wide, ≤ 2 MB) with Squoosh.
 * Uses <details>, so it works without JavaScript inside Server and Client Components alike.
 */
export function WebpGuide({ defaultOpen = false, className }: { defaultOpen?: boolean; className?: string }) {
	return (
		<details
			open={defaultOpen}
			className={cn("group rounded-lg border border-teal-200 bg-teal-50/60 text-sm text-slate-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-slate-300", className)}
		>
			<summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 font-medium text-teal-900 marker:hidden dark:text-teal-200 [&::-webkit-details-marker]:hidden">
				<Lightbulb className="h-4 w-4 shrink-0" aria-hidden />
				<span className="flex-1">How to prepare images: convert to WebP with Squoosh (free)</span>
				<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
			</summary>

			<div className="border-t border-teal-200 px-4 pb-4 pt-3 dark:border-teal-900">
				<ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-teal-800 dark:marker:text-teal-300">
					<li>
						Open{" "}
						<a
							href={SQUOOSH}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-0.5 font-semibold text-teal-800 underline underline-offset-2 hover:text-teal-950 dark:text-teal-300 dark:hover:text-teal-100"
						>
							squoosh.app
							<ExternalLink className="h-3 w-3" aria-hidden />
							<span className="sr-only">(opens in a new tab)</span>
						</a>{" "}
						and drag your photo onto the page (or click <em>Select an image</em>). It&apos;s free and runs in your browser — nothing is uploaded anywhere.
					</li>
					<li>
						<strong>Resize if it&apos;s wide:</strong> if the width is over {MAX_WIDTH.toLocaleString()}px, turn on <em>Resize</em> in the right panel and set <em>Width</em> to{" "}
						{MAX_WIDTH.toLocaleString()}. Keep <em>Maintain aspect ratio</em> on so it isn&apos;t stretched.
					</li>
					<li>
						<strong>Pick WebP:</strong> under <em>Compress</em>, choose <em>WebP</em> and set <em>Quality</em> to about 75–80. Compare the before/after slider to make sure it still looks
						sharp.
					</li>
					<li>
						<strong>Check the size</strong> shown under the image — it must be under {MAX_UPLOAD_MB} MB (most photos land around 100–300 KB). If it&apos;s too big, lower the quality
						a little.
					</li>
					<li>
						<strong>Download</strong> with the button at the bottom right, give the file a clear name (e.g. <code className="rounded bg-white/70 px-1 text-xs dark:bg-slate-800">night-market-stalls.webp</code>
						), then upload it here.
					</li>
				</ol>
				<p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
					Why: WebP files are much smaller than JPG/PNG at the same quality, so pages load faster and rank better in search.
				</p>
			</div>
		</details>
	);
}
