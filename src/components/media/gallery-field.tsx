"use client";

import { useCallback, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { MediaPicker } from "./media-picker";
import { buttonClass, dangerIconClass, inputClass } from "@/lib/ui";

type Item = { url: string; alt: string; description?: string };

/**
 * Multi-image field (product gallery, portfolio images). Pick images from the media library, give each
 * alt text (and optionally a description) and reorder them. Submits as JSON in one hidden input, so it
 * works in server forms.
 */
export function GalleryField({
	name,
	defaultValue = [],
	max = 12,
	withDescription = false,
	hint = "Shown under the main image on the product page.",
	addLabel = "Add gallery image",
}: {
	name: string;
	defaultValue?: Item[];
	max?: number;
	/** Adds a per-image description (e.g. shown on hover in the portfolio grid). */
	withDescription?: boolean;
	hint?: string;
	addLabel?: string;
}) {
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
						<li key={`${it.url}-${i}`} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
							{/* eslint-disable-next-line @next/next/no-img-element -- preview of an arbitrary storage URL */}
							<img src={it.url} alt="" className={`${withDescription ? "h-20 w-20" : "h-12 w-12"} shrink-0 rounded object-cover`} />
							<div className="min-w-0 flex-1 space-y-1.5">
								<label className="sr-only" htmlFor={`${name}-alt-${i}`}>
									Alt text for image {i + 1}
								</label>
								<input
									id={`${name}-alt-${i}`}
									value={it.alt}
									maxLength={200}
									onChange={(e) => update(i, { alt: e.target.value })}
									placeholder="Alt text: what's in the image"
									className={`${inputClass} h-9 py-1`}
								/>
								{withDescription && (
									<>
										<label className="sr-only" htmlFor={`${name}-desc-${i}`}>
											Description for image {i + 1}
										</label>
										<textarea
											id={`${name}-desc-${i}`}
											value={it.description ?? ""}
											maxLength={500}
											rows={2}
											onChange={(e) => update(i, { description: e.target.value })}
											placeholder="Description shown on hover, e.g. “New standing-seam roof, Täby”"
											className={`${inputClass} py-1.5 text-sm`}
										/>
									</>
								)}
							</div>
							<div className="flex shrink-0 flex-col gap-1 sm:flex-row">
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
					<ImagePlus className="h-4 w-4" aria-hidden /> {addLabel}
				</button>
			)}
			<p className="text-xs text-slate-600 dark:text-slate-400">
				{items.length}/{max} images. {hint}
			</p>
			{open && (
				<MediaPicker
					title={addLabel}
					onClose={close}
					onSelect={(media) => {
						setItems((list) => [...list, { url: media.url, alt: "", ...(withDescription ? { description: "" } : {}) }]);
						setOpen(false);
					}}
				/>
			)}
		</div>
	);
}
