"use client";

import { AlertTriangle } from "lucide-react";
import { buttonClass, cardClass } from "@/lib/ui";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	return (
		<div className={`${cardClass} mx-auto max-w-lg p-8 text-center`}>
			<span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
				<AlertTriangle className="h-6 w-6" aria-hidden />
			</span>
			<h1 className="mt-4 text-lg font-semibold text-slate-900">Something went wrong</h1>
			<p className="mt-1 text-sm text-slate-500">{error.message || "An unexpected error occurred."}</p>
			<button type="button" onClick={reset} className={buttonClass("primary", "md", "mt-6")}>
				Try again
			</button>
		</div>
	);
}
