"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronRight, Folder, HardDrive, ImageOff, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { browseMedia, uploadFromPicker } from "@/app/admin/media/actions";
import type { MediaFile, MediaListing } from "@/lib/media";
import { buttonClass, cn } from "@/lib/ui";
import { MAX_FILES_PER_UPLOAD, UPLOAD_ACCEPT, uploadProblem } from "@/lib/upload-rules";
import { UploadRulesNote } from "./upload-rules-note";
import { WebpGuide } from "./webp-guide";

export type PickedMedia = Pick<MediaFile, "url" | "name" | "path">;

type Props = {
	/** Called with the chosen image. The picker closes itself afterwards. */
	onSelect: (media: PickedMedia) => void;
	onClose: () => void;
	title?: string;
	confirmLabel?: string;
};

type State = MediaListing & { buckets: string[] };

/**
 * Modal for choosing an image from Supabase Storage. Mount it only while open:
 *   {open && <MediaPicker onSelect={...} onClose={() => setOpen(false)} />}
 */
export function MediaPicker({ onSelect, onClose, title = "Choose an image", confirmLabel = "Use image" }: Props) {
	const [state, setState] = useState<State | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [selected, setSelected] = useState<MediaFile | null>(null);
	const [uploading, startUpload] = useTransition();
	const fileRef = useRef<HTMLInputElement>(null);
	const dialogRef = useRef<HTMLDivElement>(null);

	const load = async (bucket?: string, path?: string) => {
		setLoading(true);
		setError("");
		const res = await browseMedia(bucket, path);
		if (res.ok) setState(res.data);
		else setError(res.error);
		setLoading(false);
	};

	useEffect(() => {
		let active = true;
		browseMedia().then((res) => {
			if (!active) return;
			if (res.ok) setState(res.data);
			else setError(res.error);
			setLoading(false);
		});
		dialogRef.current?.focus();
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		const overflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			active = false;
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = overflow;
		};
	}, [onClose]);

	const navigate = (bucket: string, path: string) => {
		setSelected(null);
		load(bucket, path);
	};

	const upload = (files: FileList | null) => {
		if (!files?.length || !state) return;
		// Same rules as the server, checked here first for instant feedback.
		const list = Array.from(files);
		const problem = list.length > MAX_FILES_PER_UPLOAD ? `Upload up to ${MAX_FILES_PER_UPLOAD} images at a time.` : list.map(uploadProblem).find(Boolean);
		if (problem) {
			setError(problem);
			if (fileRef.current) fileRef.current.value = "";
			return;
		}
		setError("");
		const form = new FormData();
		form.set("bucket", state.bucket);
		form.set("path", state.path);
		Array.from(files).forEach((f) => form.append("files", f));
		startUpload(async () => {
			const res = await uploadFromPicker(form);
			if (fileRef.current) fileRef.current.value = "";
			if (!res.ok) return setError(res.error);
			await load(state.bucket, state.path);
			setSelected(res.data[0] ?? null);
		});
	};

	const segments = state?.path ? state.path.split("/") : [];

	return (
		<div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby="media-picker-title"
				tabIndex={-1}
				className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white dark:bg-slate-900 shadow-2xl focus:outline-none sm:rounded-2xl"
			>
				<div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
					<div>
						<h2 id="media-picker-title" className="text-base font-semibold text-slate-900 dark:text-white">
							{title}
						</h2>
						<p className="text-xs text-slate-600 dark:text-slate-400">Pick from the media library or upload a new image.</p>
						<UploadRulesNote id="picker-upload-rules" className="mt-1" />
					</div>
					<button type="button" onClick={onClose} className={buttonClass("ghost", "icon")} aria-label="Close">
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Toolbar: bucket, path, upload */}
				<div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
						<label className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1.5">
							<HardDrive className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden />
							<span className="sr-only">Bucket</span>
							<select
								value={state?.bucket ?? ""}
								onChange={(e) => navigate(e.target.value, "")}
								disabled={!state}
								className="bg-transparent pr-1 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
							>
								{state?.buckets.map((b) => (
									<option key={b} value={b}>
										{b}
									</option>
								))}
							</select>
						</label>
						{state && (
							<nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-1">
								<button type="button" onClick={() => navigate(state.bucket, "")} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
									root
								</button>
								{segments.map((seg, i) => (
									<span key={i} className="flex items-center gap-1">
										<ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden />
										<button type="button" onClick={() => navigate(state.bucket, segments.slice(0, i + 1).join("/"))} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
											{seg}
										</button>
									</span>
								))}
							</nav>
						)}
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => state && load(state.bucket, state.path)}
							className={buttonClass("secondary", "icon")}
							aria-label="Refresh"
							title="Refresh"
							disabled={!state || loading}
						>
							<RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
						</button>
						<input
							ref={fileRef}
							type="file"
							accept={UPLOAD_ACCEPT}
							aria-describedby="picker-upload-rules"
							multiple
							className="sr-only"
							id="media-picker-upload"
							onChange={(e) => upload(e.target.files)}
						/>
						<label htmlFor="media-picker-upload" className={cn(buttonClass("accent", "md"), "cursor-pointer", (!state || uploading) && "pointer-events-none opacity-60")}>
							{uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
							{uploading ? "Uploading…" : `Upload${segments.length ? ` to ${segments.at(-1)}` : ""}`}
						</label>
					</div>
				</div>

				{/* Grid */}
				<div className="min-h-[300px] flex-1 overflow-y-auto p-5">
					<WebpGuide className="mb-4" />
					{error && <p className="mb-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
					{loading && !state ? (
						<div className="flex h-60 items-center justify-center text-slate-400 dark:text-slate-500">
							<Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
						</div>
					) : state && state.folders.length === 0 && state.files.length === 0 ? (
						<div className="flex h-60 flex-col items-center justify-center text-center">
							<ImageOff className="h-10 w-10 text-slate-300 dark:text-slate-600" aria-hidden />
							<p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">No images here yet</p>
							<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload one to use it right away.</p>
						</div>
					) : (
						state && (
							<ul className={cn("grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5", loading && "opacity-50")}>
								{state.folders.map((folder) => (
									<li key={folder}>
										<button
											type="button"
											onClick={() => navigate(state.bucket, state.path ? `${state.path}/${folder}` : folder)}
											className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-teal-300 hover:text-slate-900 dark:hover:text-white"
										>
											<Folder className="h-8 w-8 fill-amber-100 dark:fill-amber-900 text-amber-500" aria-hidden />
											<span className="max-w-full truncate px-2 text-xs font-medium">{folder}</span>
										</button>
									</li>
								))}
								{state.files.map((file) => {
									const isSelected = selected?.path === file.path;
									return (
										<li key={file.path}>
											<button
												type="button"
												onClick={() => setSelected(file)}
												onDoubleClick={() => onSelect(file)}
												aria-pressed={isSelected}
												title={file.name}
												className={cn(
													"relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px] transition",
													isSelected ? "border-teal-500 ring-4 ring-teal-500/20" : "border-transparent ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-slate-300",
												)}
											>
												{/* eslint-disable-next-line @next/next/no-img-element -- arbitrary storage objects, incl. SVG */}
												<img src={file.url} alt={file.name} loading="lazy" className="h-full w-full object-contain" />
												{isSelected && (
													<span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-white shadow">
														<Check className="h-4 w-4" aria-hidden />
													</span>
												)}
											</button>
										</li>
									);
								})}
							</ul>
						)
					)}
				</div>

				<div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
					<p className="min-w-0 truncate text-sm text-slate-500 dark:text-slate-400">{selected ? selected.name : "No image selected"}</p>
					<div className="flex gap-2">
						<button type="button" onClick={onClose} className={buttonClass("secondary")}>
							Cancel
						</button>
						<button type="button" disabled={!selected} onClick={() => selected && onSelect(selected)} className={buttonClass("primary")}>
							{confirmLabel}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
