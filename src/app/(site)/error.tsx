"use client";

import Link from "next/link";
import { Home, RotateCw } from "lucide-react";

/** Public error page, styled like the 404. Shows no error details, only a reference id. */
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return (
		<main className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
			<p className="kicker-mark font-label text-xs font-medium tracking-[0.14em] text-accent uppercase">
				Something went wrong
			</p>
			<h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-site-ink sm:text-5xl">Pasensya na, may problema.</h1>
			<p className="mt-3 text-lg text-site-ink-2">This page couldn&apos;t load right now. Please try again in a moment.</p>
			{error.digest && <p className="mt-2 font-mono text-xs text-site-muted">Reference: {error.digest}</p>}
			<div className="mt-8 flex flex-wrap justify-center gap-3">
				<button
					type="button"
					onClick={retry}
					className="inline-flex min-h-12 items-center gap-2 border border-site-ink bg-site-ink px-6 font-label text-xs font-medium tracking-[0.1em] text-site-bg uppercase transition-colors hover:bg-transparent hover:text-site-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
				>
					<RotateCw className="h-4 w-4" aria-hidden /> Try again
				</button>
				<Link
					href="/"
					className="inline-flex min-h-12 items-center gap-2 border border-site-line-2 px-6 font-label text-xs font-medium tracking-[0.1em] text-site-ink uppercase transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
				>
					<Home className="h-4 w-4" aria-hidden /> Back to home
				</Link>
			</div>
		</main>
	);
}
