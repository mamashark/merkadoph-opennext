"use client";

import { useState } from "react";
import { MediaField } from "@/components/media/media-field";
import { LAYOUT_SLOTS, type BlogPhoto, type PhotoLayout } from "@/lib/blog-layout";
import { cn, hintClass, inputClass, labelClass } from "@/lib/ui";

const OPTIONS: { value: PhotoLayout; title: string; sub: string }[] = [
	{ value: "A", title: "A · Header photo", sub: "1 photo, full width under the title" },
	{ value: "B", title: "B · Middle pair", sub: "2 photos side by side, mid-article" },
	{ value: "none", title: "None", sub: "Text only (the cover image is still used for sharing)" },
];

/** Little diagrams of each layout, as in the approved mock-up. Decorative. */
function Thumb({ layout }: { layout: PhotoLayout }) {
	const line = "absolute left-[18%] right-[18%] h-[3px] rounded bg-slate-400/60 dark:bg-slate-500/60";
	const photo = "absolute bg-teal-500/75";
	return (
		<span aria-hidden className="relative block h-16 overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
			{layout === "A" && (
				<>
					<i className={line} style={{ top: 8 }} />
					<i className={photo} style={{ left: 0, right: 0, top: 16, height: 22 }} />
					<i className={line} style={{ top: 44 }} />
					<i className={line} style={{ top: 52 }} />
				</>
			)}
			{layout === "B" && (
				<>
					<i className={line} style={{ top: 8 }} />
					<i className={photo} style={{ left: 0, width: "49%", top: 18, height: 26 }} />
					<i className={photo} style={{ right: 0, width: "49%", top: 18, height: 26 }} />
					<i className={line} style={{ top: 52 }} />
				</>
			)}
			{layout === "none" && [10, 20, 30, 40, 50].map((t) => <i key={t} className={line} style={{ top: t }} />)}
		</span>
	);
}

/**
 * Admin → Blogs: the photo layout picker and its photo slots (A: one, B: two). Slots the chosen layout doesn't use
 * stay in the form (hidden), so switching layouts back and forth never loses a picked photo; the save action keeps
 * only the ones the layout uses. Submits plain named inputs, so it works in the server-rendered form.
 */
export function PhotoLayoutField({ layout: initialLayout, photos }: { layout: PhotoLayout; photos: BlogPhoto[] }) {
	const [layout, setLayout] = useState<PhotoLayout>(initialLayout);
	const used = LAYOUT_SLOTS[layout];
	const slotLabel = (i: number) => (layout === "A" ? "Header photo" : i === 0 ? "Left photo" : "Right photo");

	return (
		<div className="space-y-5">
			<fieldset>
				<legend className={labelClass}>Photo layout</legend>
				<div className="grid gap-3 sm:grid-cols-3">
					{OPTIONS.map((o) => (
						<label
							key={o.value}
							className={cn(
								"block cursor-pointer rounded-lg border-2 p-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-600",
								layout === o.value ? "border-teal-600 bg-teal-50 dark:border-teal-400 dark:bg-teal-950/40" : "border-slate-200 dark:border-slate-700",
							)}
						>
							<input type="radio" name="photo_layout" value={o.value} checked={layout === o.value} onChange={() => setLayout(o.value)} className="sr-only" />
							<Thumb layout={o.value} />
							<b className="mt-2 block text-sm text-slate-900 dark:text-white">{o.title}</b>
							<small className="text-xs text-slate-600 dark:text-slate-400">{o.sub}</small>
						</label>
					))}
				</div>
			</fieldset>

			{[0, 1].map((i) => {
				const p = photos[i];
				return (
					<div key={i} hidden={i >= used} className="grid gap-4 rounded-lg border border-dashed border-slate-300 p-3 sm:grid-cols-[180px_1fr] dark:border-slate-700">
						<div>
							<p className={labelClass}>{slotLabel(i)}</p>
							<MediaField name={`layout_url_${i}`} defaultValue={p?.url} label={slotLabel(i)} />
						</div>
						<div className="space-y-3">
							<div>
								<label htmlFor={`layout_alt_${i}`} className={labelClass}>
									Alt text (describes the photo)
								</label>
								<input id={`layout_alt_${i}`} name={`layout_alt_${i}`} maxLength={200} defaultValue={p?.alt ?? ""} className={inputClass} />
							</div>
							<div>
								<label htmlFor={`layout_caption_${i}`} className={labelClass}>
									Caption (shown under the photo)
								</label>
								<input id={`layout_caption_${i}`} name={`layout_caption_${i}`} maxLength={300} defaultValue={p?.caption ?? ""} className={inputClass} />
							</div>
						</div>
					</div>
				);
			})}
			<p className={hintClass}>
				{layout === "A" && "No header photo picked? The cover image is used. Alt text is required to publish."}
				{layout === "B" && "Both photos and their alt text are required to publish. They go where you put [[photos]] in the text, or halfway if you don't."}
				{layout === "none" && "No photos in the article itself. The photo row below still shows, if it has photos."}
			</p>
		</div>
	);
}
