"use client";

import { useCallback, useState } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { MediaPicker } from "./media-picker";
import { buttonClass } from "@/lib/ui";

/**
 * Drop-in form field that stores an image URL picked from the media library.
 * Submits as a regular hidden input, so it works inside server-rendered forms.
 */
export function MediaField({ name, defaultValue = "", label = "Image" }: { name: string; defaultValue?: string | null; label?: string }) {
	const [url, setUrl] = useState(defaultValue ?? "");
	const [open, setOpen] = useState(false);
	const close = useCallback(() => setOpen(false), []);

	return (
		<div>
			<input type="hidden" name={name} value={url} />
			{url ? (
				<div className="overflow-hidden rounded-lg border border-slate-200">
					<div className="aspect-[16/9] bg-slate-100">
						{/* eslint-disable-next-line @next/next/no-img-element -- preview of an arbitrary storage URL */}
						<img src={url} alt={`${label} preview`} className="h-full w-full object-cover" />
					</div>
					<div className="flex gap-2 border-t border-slate-200 p-2">
						<button type="button" onClick={() => setOpen(true)} className={buttonClass("secondary", "sm", "flex-1")}>
							<RefreshCw className="h-3.5 w-3.5" aria-hidden /> Replace
						</button>
						<button
							type="button"
							onClick={() => setUrl("")}
							className={buttonClass("secondary", "icon", "hover:border-red-200 hover:bg-red-50 hover:text-red-600")}
							aria-label={`Remove ${label.toLowerCase()}`}
							title="Remove"
						>
							<Trash2 className="h-4 w-4" aria-hidden />
						</button>
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 transition hover:border-teal-400 hover:bg-teal-50/40 hover:text-teal-700"
				>
					<ImagePlus className="h-7 w-7" aria-hidden />
					<span className="font-medium">Choose from media</span>
					<span className="text-xs">or upload a new image</span>
				</button>
			)}
			{open && (
				<MediaPicker
					title={`Choose ${label.toLowerCase()}`}
					onClose={close}
					onSelect={(media) => {
						setUrl(media.url);
						setOpen(false);
					}}
				/>
			)}
		</div>
	);
}
