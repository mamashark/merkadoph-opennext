import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClass, cn } from "@/lib/ui";

/** Server-rendered pager that preserves the other query params. `tone="site"`: the public pages' look (square mono buttons). */
export function Pagination({
	page,
	perPage,
	total,
	basePath,
	params = {},
	tone = "admin",
}: {
	page: number;
	perPage: number;
	total: number;
	basePath: string;
	params?: Record<string, string>;
	tone?: "admin" | "site";
}) {
	const pages = Math.max(1, Math.ceil(total / perPage));
	if (pages <= 1) return null;

	const href = (p: number) => {
		const qs = new URLSearchParams({ ...params, ...(p > 1 ? { page: String(p) } : {}) });
		return qs.size ? `${basePath}?${qs}` : basePath;
	};

	const site = tone === "site";
	const btn = (disabled: boolean) =>
		site
			? cn(
					"inline-flex min-h-10 items-center gap-1.5 border border-site-line-2 px-3.5 font-label text-xs font-medium tracking-[0.1em] text-site-ink uppercase hover:border-accent hover:text-accent",
					disabled && "pointer-events-none opacity-40",
				)
			: cn(buttonClass("secondary", "sm"), disabled && "pointer-events-none opacity-50");

	return (
		<nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-sm">
			<p className={site ? "font-label text-xs tracking-wide text-site-muted" : "text-slate-500 dark:text-slate-400"}>
				Page {page} of {pages} · {total} total
			</p>
			<div className="flex gap-2">
				<Link
					href={href(page - 1)}
					aria-disabled={page <= 1}
					className={btn(page <= 1)}
					rel="prev"
				>
					<ChevronLeft className="h-4 w-4" aria-hidden /> Previous
				</Link>
				<Link
					href={href(page + 1)}
					aria-disabled={page >= pages}
					className={btn(page >= pages)}
					rel="next"
				>
					Next <ChevronRight className="h-4 w-4" aria-hidden />
				</Link>
			</div>
		</nav>
	);
}
