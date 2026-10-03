import Link from "next/link";
import { ArrowLeft, LayoutDashboard, SearchX } from "lucide-react";
import { buttonClass, cardClass } from "@/lib/ui";

/** notFound() inside the admin (e.g. an edit link to a deleted item) — keeps the admin shell. */
export default function AdminNotFound() {
	return (
		<div className={`${cardClass} mx-auto max-w-lg p-8 text-center`}>
			<span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
				<SearchX className="h-6 w-6" aria-hidden />
			</span>
			<p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">404</p>
			<h1 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">We couldn&apos;t find that</h1>
			<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">It may have been deleted, or the link is wrong.</p>
			<div className="mt-6 flex flex-wrap justify-center gap-2">
				<Link href="/admin" className={buttonClass("primary")}>
					<LayoutDashboard className="h-4 w-4" aria-hidden /> Dashboard
				</Link>
				<Link href="/admin/blogs" className={buttonClass("secondary")}>
					<ArrowLeft className="h-4 w-4" aria-hidden /> Back to content
				</Link>
			</div>
		</div>
	);
}
