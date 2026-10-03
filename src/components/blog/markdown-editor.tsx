"use client";

import { useCallback, useRef, useState } from "react";
import { Bold, Eye, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Pencil, Quote } from "lucide-react";
import { MediaPicker, type PickedMedia } from "@/components/media/media-picker";
import { Markdown } from "./markdown";
import { buttonClass, cn, inputClass, labelClass } from "@/lib/ui";

type Props = { name: string; defaultValue?: string; required?: boolean };

/**
 * Markdown body editor. The textarea is a normal named form field, so the surrounding
 * server-rendered form submits it like any other input.
 */
export function MarkdownEditor({ name, defaultValue = "", required }: Props) {
	const ref = useRef<HTMLTextAreaElement>(null);
	const [value, setValue] = useState(defaultValue);
	const [tab, setTab] = useState<"write" | "preview">("write");
	const [picking, setPicking] = useState(false);
	const [pending, setPending] = useState<PickedMedia | null>(null);
	const closePicker = useCallback(() => setPicking(false), []);

	/** Inserts text at the cursor, keeping the browser's undo history where supported. */
	const insert = (text: string, selectFrom?: number, selectTo?: number) => {
		const el = ref.current;
		if (!el) return;
		el.focus();
		const start = el.selectionStart;
		if (!document.execCommand?.("insertText", false, text)) {
			el.setRangeText(text, el.selectionStart, el.selectionEnd, "end");
			el.dispatchEvent(new Event("input", { bubbles: true }));
		}
		if (selectFrom !== undefined) el.setSelectionRange(start + selectFrom, start + (selectTo ?? selectFrom));
	};

	const wrap = (before: string, after = before, placeholder = "text") => {
		const el = ref.current;
		if (!el) return;
		const selected = el.value.slice(el.selectionStart, el.selectionEnd) || placeholder;
		insert(before + selected + after, before.length, before.length + selected.length);
	};

	const prefixLines = (prefix: string | ((i: number) => string)) => {
		const el = ref.current;
		if (!el) return;
		const lineStart = el.value.lastIndexOf("\n", el.selectionStart - 1) + 1;
		el.setSelectionRange(lineStart, el.selectionEnd);
		const lines = (el.value.slice(lineStart, el.selectionEnd) || "").split("\n");
		insert(lines.map((l, i) => (typeof prefix === "string" ? prefix : prefix(i)) + l.replace(/^(#{1,6} |> |- |\d+\. )/, "")).join("\n"));
	};

	const insertImage = (description: string) => {
		if (!pending) return;
		const el = ref.current;
		const before = el ? el.value.slice(0, el.selectionStart) : "";
		const lead = before === "" ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
		const alt = description.replace(/[[\]]/g, "").trim();
		setPending(null);
		setTab("write");
		requestAnimationFrame(() => insert(`${lead}![${alt}](${pending.url.replace(/ /g, "%20")})\n\n`));
	};

	const tools = [
		{ icon: Heading2, label: "Heading", run: () => prefixLines("## ") },
		{ icon: Heading3, label: "Subheading", run: () => prefixLines("### ") },
		{ icon: Bold, label: "Bold (Ctrl+B)", run: () => wrap("**") },
		{ icon: Italic, label: "Italic (Ctrl+I)", run: () => wrap("_") },
		{ icon: Link2, label: "Link", run: () => wrap("[", "](https://)", "link text") },
		{ icon: List, label: "Bulleted list", run: () => prefixLines("- ") },
		{ icon: ListOrdered, label: "Numbered list", run: () => prefixLines((i) => `${i + 1}. `) },
		{ icon: Quote, label: "Quote", run: () => prefixLines("> ") },
	];

	const words = value.trim() ? value.trim().split(/\s+/).length : 0;

	return (
		<div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
			<div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5">
				<div className="mr-1 flex rounded-md bg-slate-200/60 dark:bg-slate-800 p-0.5 text-xs font-medium">
					{(["write", "preview"] as const).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => setTab(t)}
							className={cn("flex items-center gap-1 rounded px-2.5 py-1 capitalize", tab === t ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}
						>
							{t === "write" ? <Pencil className="h-3 w-3" aria-hidden /> : <Eye className="h-3 w-3" aria-hidden />}
							{t}
						</button>
					))}
				</div>
				{tools.map(({ icon: Icon, label, run }) => (
					<button
						key={label}
						type="button"
						onClick={run}
						disabled={tab !== "write"}
						className="rounded-md p-1.5 text-slate-500 dark:text-slate-400 hover:bg-white hover:text-slate-900 dark:hover:text-white disabled:opacity-40"
						aria-label={label}
						title={label}
					>
						<Icon className="h-4 w-4" aria-hidden />
					</button>
				))}
				<span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-800" aria-hidden />
				<button type="button" onClick={() => setPicking(true)} className={buttonClass("secondary", "sm")}>
					<ImagePlus className="h-4 w-4" aria-hidden /> Image
				</button>
			</div>

			<textarea
				ref={ref}
				name={name}
				id={name}
				required={required}
				defaultValue={defaultValue}
				onInput={(e) => setValue(e.currentTarget.value)}
				onKeyDown={(e) => {
					if (!(e.ctrlKey || e.metaKey)) return;
					if (e.key === "b") (e.preventDefault(), wrap("**"));
					if (e.key === "i") (e.preventDefault(), wrap("_"));
				}}
				placeholder={"Write your story in Markdown…\n\n## A heading\nRegular paragraph text with **bold** and _italic_.\n\nUse the Image button to add pictures with captions."}
				className={cn("block min-h-[420px] w-full resize-y border-0 px-4 py-3 font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none", tab !== "write" && "hidden")}
			/>
			{tab === "preview" && (
				<div className="min-h-[420px] px-5 py-4">{value.trim() ? <Markdown content={value} /> : <p className="text-sm text-slate-400 dark:text-slate-500">Nothing to preview yet.</p>}</div>
			)}

			<div className="flex justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">
				<span>Markdown supported · images show their description as a caption</span>
				<span>
					{words} words · {Math.max(1, Math.round(words / 220))} min read
				</span>
			</div>

			{picking && (
				<MediaPicker
					title="Insert image"
					confirmLabel="Next: add description"
					onClose={closePicker}
					onSelect={(media) => {
						setPicking(false);
						setPending(media);
					}}
				/>
			)}
			{pending && <CaptionDialog media={pending} onCancel={() => setPending(null)} onConfirm={insertImage} />}
		</div>
	);
}

function CaptionDialog({ media, onCancel, onConfirm }: { media: PickedMedia; onCancel: () => void; onConfirm: (description: string) => void }) {
	const [description, setDescription] = useState("");
	const trimmed = description.trim();

	return (
		<div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
			<div role="dialog" aria-modal="true" aria-labelledby="caption-title" className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white dark:bg-slate-900 shadow-2xl sm:rounded-2xl">
				<div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800">
					{/* eslint-disable-next-line @next/next/no-img-element -- preview of an arbitrary storage URL */}
					<img src={media.url} alt="" className="h-full w-full object-contain" />
				</div>
				<div className="p-5">
					<h2 id="caption-title" className="text-base font-semibold text-slate-900 dark:text-white">
						Describe this image
					</h2>
					<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Shown as the caption under the image, and used as alt text for accessibility and SEO.</p>
					<label htmlFor="caption-input" className={`${labelClass} mt-4`}>
						Description
					</label>
					<textarea
						id="caption-input"
						autoFocus
						rows={2}
						maxLength={200}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey && trimmed) {
								e.preventDefault();
								onConfirm(trimmed);
							}
							if (e.key === "Escape") onCancel();
						}}
						placeholder="e.g. Vendors setting up their stalls at the Sunday market in Quezon City"
						className={inputClass}
					/>
					<p className="mt-1 text-right text-[11px] text-slate-400 dark:text-slate-500">{description.length}/200</p>
					<div className="mt-4 flex justify-end gap-2">
						<button type="button" onClick={onCancel} className={buttonClass("secondary")}>
							Cancel
						</button>
						<button type="button" disabled={!trimmed} onClick={() => onConfirm(trimmed)} className={buttonClass("primary")}>
							Insert image
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
