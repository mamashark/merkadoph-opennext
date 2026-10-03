import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { buttonClass, cn, inputClass } from "@/lib/ui";

export type FilterOption = { label: string; value: string };
export type FilterDef = { name: string; label: string; options: FilterOption[] };

type Props = {
	basePath: string;
	/** Current values for q + every filter + sort, read from the URL. */
	values: Record<string, string>;
	filters: FilterDef[];
	sorts?: FilterOption[];
	searchPlaceholder?: string;
};

const selectClass = cn(inputClass, "h-10 w-full py-0 pr-8 sm:w-auto");

/**
 * URL-driven search / filter / sort bar. A plain GET form: works without JavaScript,
 * and every result set is shareable/bookmarkable. Changing filters resets to page 1.
 */
export function ListToolbar({ basePath, values, filters, sorts, searchPlaceholder = "Search…" }: Props) {
	const active = Object.entries(values).some(([k, v]) => v && k !== "sort");

	return (
		<form role="search" action={basePath} className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:flex-row lg:items-end">
			<div className="relative flex-1">
				<label htmlFor="list-q" className="sr-only">
					Search
				</label>
				<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
				<input id="list-q" type="search" name="q" defaultValue={values.q} placeholder={searchPlaceholder} className={`${inputClass} h-10 pl-9`} />
			</div>
			<div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
				{filters.map((f) => (
					<div key={f.name}>
						<label htmlFor={`f-${f.name}`} className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
							{f.label}
						</label>
						<select id={`f-${f.name}`} name={f.name} defaultValue={values[f.name] ?? ""} className={selectClass}>
							{f.options.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
				))}
				{sorts && (
					<div>
						<label htmlFor="f-sort" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
							Sort by
						</label>
						<select id="f-sort" name="sort" defaultValue={values.sort ?? ""} className={selectClass}>
							{sorts.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
				)}
				<div className="col-span-2 flex gap-2">
					<button type="submit" className={buttonClass("primary", "md", "flex-1 sm:flex-none")}>
						<SlidersHorizontal className="h-4 w-4" aria-hidden /> Apply
					</button>
					{active && (
						<Link href={basePath} className={buttonClass("ghost", "md")} aria-label="Clear search and filters">
							<X className="h-4 w-4" aria-hidden /> Clear
						</Link>
					)}
				</div>
			</div>
		</form>
	);
}

/** Builds the query-string record for Pagination from the current list values. */
export function listParams(values: Record<string, string>): Record<string, string> {
	return Object.fromEntries(Object.entries(values).filter(([, v]) => v));
}
