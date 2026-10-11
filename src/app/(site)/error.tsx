"use client";

import Link from "next/link";
import { Home, RotateCw } from "lucide-react";

/** Public error page, styled like the 404. Shows no error details, only a reference id. */
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return (
		<main className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
			<p className="inline-flex items-center gap-2 rounded-full border border-amber-900/15 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal-800 dark:border-white/10 dark:bg-white/5 dark:text-teal-300">
				<span className="h-1.5 w-1.5 rounded-full bg-orange-500" aria-hidden /> Something went wrong
			</p>
			<h1 className="mt-6 text-3xl font-semibold tracking-tight text-stone-950 dark:text-white sm:text-4xl">Pasensya na, may problema.</h1>
			<p className="mt-3 text-lg text-stone-700 dark:text-stone-300">This page couldn&apos;t load right now. Please try again in a moment.</p>
			{error.digest && <p className="mt-2 font-mono text-xs text-stone-600 dark:text-stone-400">Reference: {error.digest}</p>}
			<div className="mt-8 flex flex-wrap justify-center gap-3">
				<button
					type="button"
					onClick={retry}
					className="inline-flex h-12 items-center gap-2 rounded-xl bg-stone-900 px-6 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200 dark:focus-visible:ring-offset-stone-950"
				>
					<RotateCw className="h-4 w-4" aria-hidden /> Try again
				</button>
				<Link
					href="/"
					className="inline-flex h-12 items-center gap-2 rounded-xl border border-stone-300 px-6 text-sm font-semibold text-stone-800 hover:bg-white dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-900"
				>
					<Home className="h-4 w-4" aria-hidden /> Back to home
				</Link>
			</div>
		</main>
	);
}
