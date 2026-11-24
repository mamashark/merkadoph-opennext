"use client";

import { useId, useRef, useState } from "react";
import { Film, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { uploadVideoFromField } from "@/app/admin/media/actions";
import { buttonClass, dangerIconClass } from "@/lib/ui";
import { VIDEO_ACCEPT, VIDEO_RULES_TEXT, videoProblem } from "@/lib/upload-rules";

/**
 * Blog video / reel: uploads one MP4 or WebM to the media library and stores its URL in a hidden input,
 * so it works inside server-rendered forms. Removing it only unlinks it; the file stays in Media.
 */
export function VideoField({ name, defaultValue = "" }: { name: string; defaultValue?: string | null }) {
	const [url, setUrl] = useState(defaultValue ?? "");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const input = useRef<HTMLInputElement>(null);
	const errorId = useId();

	async function upload(file: File | undefined) {
		if (!file) return;
		const problem = videoProblem(file);
		setError(problem ?? "");
		if (problem) return;
		setBusy(true);
		try {
			const fd = new FormData();
			fd.set("file", file);
			const res = await uploadVideoFromField(fd);
			if (res.ok) setUrl(res.data.url);
			else setError(res.error);
		} catch {
			setError("The upload failed. Check your connection and try again.");
		} finally {
			setBusy(false);
			if (input.current) input.current.value = "";
		}
	}

	return (
		<div className="space-y-2">
			<input type="hidden" name={name} value={url} />
			<input
				ref={input}
				type="file"
				accept={VIDEO_ACCEPT}
				className="sr-only"
				tabIndex={-1}
				aria-hidden
				onChange={(e) => void upload(e.target.files?.[0])}
			/>
			{url ? (
				<div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
					<video src={url} controls preload="metadata" playsInline className="mx-auto max-h-80 w-full bg-black" aria-label="Video preview" />
					<div className="flex gap-2 border-t border-slate-200 p-2 dark:border-slate-800">
						<button type="button" disabled={busy} onClick={() => input.current?.click()} className={buttonClass("secondary", "sm", "flex-1")}>
							{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
							{busy ? "Uploading…" : "Replace"}
						</button>
						<button type="button" disabled={busy} onClick={() => setUrl("")} className={buttonClass("secondary", "icon", dangerIconClass)} aria-label="Remove video" title="Remove">
							<Trash2 className="h-4 w-4" aria-hidden />
						</button>
					</div>
				</div>
			) : (
				<button
					type="button"
					disabled={busy}
					aria-describedby={error ? errorId : undefined}
					onClick={() => input.current?.click()}
					className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 transition hover:border-teal-400 hover:bg-teal-50/40 hover:text-teal-700 disabled:cursor-wait dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:text-teal-300"
				>
					{busy ? <Loader2 className="h-7 w-7 animate-spin" aria-hidden /> : <Film className="h-7 w-7" aria-hidden />}
					<span className="font-medium">{busy ? "Uploading… keep this page open" : "Upload a video or reel"}</span>
					<span className="text-xs text-slate-600 dark:text-slate-400">{VIDEO_RULES_TEXT}</span>
				</button>
			)}
			<p id={errorId} role="alert" className="text-sm text-red-700 dark:text-red-400">
				{error}
			</p>
		</div>
	);
}
