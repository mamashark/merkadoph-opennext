"use client";

import { useCallback, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { MediaPicker } from "./media-picker";
import { buttonClass, dangerIconClass, inputClass } from "@/lib/ui";

type Item = { url: string; alt: string };

/**
 * Multi-image field (e.g. a product gallery). Pick images from the media library, give each
 * alt text and reorder them. Submits as JSON in one hidden input, so it works in server forms.
 */
export function GalleryField({ name, defaultValue = [], max = 12 }: { name: string; defaultValue?: Item[]; max?: number }) {
	const [items, setItems] = useState<Item[]>(defaultValue);
	const [open, setOpen] = useState(false);
	const close = useCallback(() => setOpen(false), []);

	const update = (i: number, patch: Partial<Item>) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
	const move = (i: number, by: number) =>
		setItems((list) => {
			const next = [...list];
			const [it] = next.splice(i, 1);
			next.splice(Math.max(0, Math.min(next.length, i + by)), 0, it);
			return next;
		});

	return (
		<div className="space-y-3">
			<input type="hidden" name={name} value={JSON.stringify(items)} />
			{items.length > 0 && (
				<ul className="space-y-2">
					{items.map((it, i) => (
						<li key={`${it.url}-${i}`} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
							{/* eslint-disable-next-line @next/next/no-img-element -- preview of an arbitrary storage URL */}
							<img src={it.url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
							<label className="sr-only" htmlFor={`${name}-alt-${i}`}>
								Alt text for image {i + 1}
							</label>
							<input
								id={`${name}-alt-${i}`}
								value={it.alt}
								maxLength={200}
								onChange={(e) => update(i, { alt: e.target.value })}
								placeholder="Describe the image"
								className={`${inputClass} h-9 min-w-0 flex-1 py-1`}
							/>
							<div className="flex shrink-0 gap-1">
								<button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={buttonClass("ghost", "icon")} aria-label={`Move image ${i + 1} up`}>
									<ArrowUp className="h-4 w-4" aria-hidden />
								</button>
								<button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className={buttonClass("ghost", "icon")} aria-label={`Move image ${i + 1} down`}>
									<ArrowDown className="h-4 w-4" aria-hidden />
								</button>
								<button type="button" onClick={() => setItems((list) => list.filter((_, j) => j !== i))} className={buttonClass("secondary", "icon", dangerIconClass)} aria-label={`Remove image ${i + 1}`}>
									<Trash2 className="h-4 w-4" aria-hidden />
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
			{items.length < max && (
				<button type="button" onClick={() => setOpen(true)} className={buttonClass("secondary", "sm")}>
					<ImagePlus className="h-4 w-4" aria-hidden /> Add gallery image
				</button>
			)}
			<p className="text-xs text-slate-600 dark:text-slate-400">
				{items.length}/{max} images. Shown under the main image on the product page.
			</p>
			{open && (
				<MediaPicker
					title="Add gallery image"
					onClose={close}
					onSelect={(media) => {
						setItems((list) => [...list, { url: media.url, alt: "" }]);
						setOpen(false);
					}}
				/>
			)}
		</div>
	);
}
