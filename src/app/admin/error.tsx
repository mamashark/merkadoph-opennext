"use client";

import { AlertTriangle } from "lucide-react";
import { buttonClass, cardClass } from "@/lib/ui";

/** Never shows raw error text (security.md §9): only a reference id that matches the server log. */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return (
		<div className={`${cardClass} mx-auto max-w-lg p-8 text-center`}>
			<span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950 text-red-600">
				<AlertTriangle className="h-6 w-6" aria-hidden />
			</span>
			<h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Something went wrong</h1>
			<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">An unexpected error occurred. Try again, or check the Cloudflare logs.</p>
			{error.digest && <p className="mt-2 font-mono text-xs text-slate-600 dark:text-slate-400">Reference: {error.digest}</p>}
			<button type="button" onClick={retry} className={buttonClass("primary", "md", "mt-6")}>
				Try again
			</button>
		</div>
	);
}
