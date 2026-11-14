"use client";

import { useId, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { inputClass } from "@/lib/ui";

/**
 * Comma-separated tags field with suggestions from the shared tag list (Admin → Tags).
 * Still a plain text input named `name`, so the form works without JavaScript.
 */
export function TagInput({ id, name, defaultValue, placeholder, suggestions, describedBy }: { id: string; name: string; defaultValue?: string; placeholder?: string; suggestions: string[]; describedBy?: string }) {
	const [value, setValue] = useState(defaultValue ?? "");
	const listId = useId();

	const parts = value.split(",");
	const fragment = parts[parts.length - 1].trim().toLowerCase();
	const chosen = useMemo(() => new Set(value.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean)), [value]);

	const matches = useMemo(() => {
		if (!fragment) return [];
		const free = suggestions.filter((s) => !chosen.has(s.toLowerCase()) || s.toLowerCase() === fragment);
		const starts = free.filter((s) => s.toLowerCase().startsWith(fragment));
		const contains = free.filter((s) => !s.toLowerCase().startsWith(fragment) && s.toLowerCase().includes(fragment));
		return [...starts, ...contains].filter((s) => s.toLowerCase() !== fragment).slice(0, 8);
	}, [fragment, suggestions, chosen]);

	const pick = (tag: string) => {
		const kept = parts.slice(0, -1).map((p) => p.trim()).filter(Boolean);
		setValue([...kept, tag].join(", ") + ", ");
		document.getElementById(id)?.focus();
	};

	return (
		<>
			<input
				id={id}
				name={name}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder={placeholder}
				autoComplete="off"
				aria-describedby={[describedBy, matches.length ? listId : null].filter(Boolean).join(" ") || undefined}
				className={inputClass}
			/>
			{matches.length > 0 && (
				<div id={listId} role="group" aria-label="Existing tags" className="mt-2 flex flex-wrap gap-1.5">
					{matches.map((tag) => (
						<button
							key={tag}
							type="button"
							onClick={() => pick(tag)}
							className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-teal-500 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-400 dark:hover:text-teal-300"
						>
							<Plus className="h-3 w-3" aria-hidden />
							{tag}
						</button>
					))}
				</div>
			)}
		</>
	);
}
