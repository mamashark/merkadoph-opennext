import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClass, cn } from "@/lib/ui";

/** Server-rendered pager that preserves the other query params. */
export function Pagination({ page, perPage, total, basePath, params = {} }: { page: number; perPage: number; total: number; basePath: string; params?: Record<string, string> }) {
	const pages = Math.max(1, Math.ceil(total / perPage));
	if (pages <= 1) return null;

	const href = (p: number) => {
		const qs = new URLSearchParams({ ...params, ...(p > 1 ? { page: String(p) } : {}) });
		return qs.size ? `${basePath}?${qs}` : basePath;
	};

	return (
		<nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-sm">
			<p className="text-slate-500 dark:text-slate-400">
				Page {page} of {pages} · {total} total
			</p>
			<div className="flex gap-2">
				<Link
					href={href(page - 1)}
					aria-disabled={page <= 1}
					className={cn(buttonClass("secondary", "sm"), page <= 1 && "pointer-events-none opacity-50")}
					rel="prev"
				>
					<ChevronLeft className="h-4 w-4" aria-hidden /> Previous
				</Link>
				<Link
					href={href(page + 1)}
					aria-disabled={page >= pages}
					className={cn(buttonClass("secondary", "sm"), page >= pages && "pointer-events-none opacity-50")}
					rel="next"
				>
					Next <ChevronRight className="h-4 w-4" aria-hidden />
				</Link>
			</div>
		</nav>
	);
}
