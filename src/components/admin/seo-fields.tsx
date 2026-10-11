"use client";

import { useEffect, useRef, useState } from "react";
import { hintClass, inputClass, labelClass } from "@/lib/ui";

const TITLE_IDEAL = 60;
const DESC_IDEAL = 160;
const SITE = "Merkado PH";

/** Character counter that turns amber when a value is over Google's typical display length. */
function Counter({ length, ideal, id }: { length: number; ideal: number; id: string }) {
	const over = length > ideal;
	return (
		<span id={id} aria-live="polite" className={`text-xs tabular-nums ${over ? "font-medium text-amber-700 dark:text-amber-400" : "text-slate-600 dark:text-slate-400"}`}>
			{length}/{ideal}
			{over ? " · may be cut off" : ""}
		</span>
	);
}

/**
 * Meta title/description inputs with live length counters and a Google result preview.
 * Falls back to the form's title / excerpt / slug fields, like the public page does.
 */
export function SeoFields({ metaTitle, metaDescription, pathPrefix, origin }: { metaTitle: string; metaDescription: string; pathPrefix: string; origin: string }) {
	const ref = useRef<HTMLDivElement>(null);
	const [title, setTitle] = useState(metaTitle);
	const [description, setDescription] = useState(metaDescription);
	const [fallback, setFallback] = useState({ title: "", excerpt: "", slug: "" });

	useEffect(() => {
		const form = ref.current?.closest("form");
		if (!form) return;
		const read = () => {
			const value = (name: string) => {
				const el = form.elements.namedItem(name);
				return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : "";
			};
			setFallback({ title: value("title"), excerpt: value("excerpt"), slug: value("slug") });
		};
		read();
		form.addEventListener("input", read);
		return () => form.removeEventListener("input", read);
	}, []);

	const shownTitle = `${title.trim() || fallback.title.trim() || "Page title"} | ${SITE}`;
	const shownDescription = description.trim() || fallback.excerpt.trim() || "Add a meta description or summary — Google may otherwise pick text from the page.";
	const host = origin.replace(/^https?:\/\//, "");
	const slug = fallback.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "…";

	return (
		<div ref={ref} className="space-y-4">
			<div>
				<div className="flex items-baseline justify-between gap-2">
					<label htmlFor="meta_title" className={labelClass}>
						Meta title
					</label>
					<Counter id="meta_title-count" length={title.length} ideal={TITLE_IDEAL} />
				</div>
				<input id="meta_title" name="meta_title" maxLength={70} value={title} onChange={(e) => setTitle(e.target.value)} aria-describedby="meta_title-hint meta_title-count" className={inputClass} />
				<p id="meta_title-hint" className={hintClass}>
					Defaults to the title. &ldquo;| {SITE}&rdquo; is added automatically.
				</p>
			</div>
			<div>
				<div className="flex items-baseline justify-between gap-2">
					<label htmlFor="meta_description" className={labelClass}>
						Meta description
					</label>
					<Counter id="meta_description-count" length={description.length} ideal={DESC_IDEAL} />
				</div>
				<textarea
					id="meta_description"
					name="meta_description"
					rows={3}
					maxLength={170}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					aria-describedby="meta_description-hint meta_description-count"
					className={inputClass}
				/>
				<p id="meta_description-hint" className={hintClass}>
					Defaults to the summary. Aim for 120–160 characters that make people want to click.
				</p>
			</div>

			<figure aria-label="Google search result preview" className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
				<figcaption className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">Search preview</figcaption>
				<p className="truncate text-xs text-slate-700 dark:text-slate-300">
					{host}
					{pathPrefix}
					{slug}
				</p>
				<p className="mt-0.5 line-clamp-1 text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{shownTitle}</p>
				<p className="mt-0.5 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">{shownDescription}</p>
			</figure>
		</div>
	);
}
