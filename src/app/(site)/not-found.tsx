import Link from "next/link";

export default function SiteNotFound() {
	return (
		<main className="mx-auto max-w-xl px-4 py-24 text-center">
			<p className="text-sm font-semibold uppercase tracking-widest text-teal-800 dark:text-teal-300">404</p>
			<h1 className="mt-2 text-3xl font-semibold text-stone-900 dark:text-white">We couldn&apos;t find that page</h1>
			<p className="mt-2 text-stone-600 dark:text-stone-400">It may have been moved, ended or unpublished.</p>
			<div className="mt-8 flex flex-wrap justify-center gap-3">
				{[
					["/blogs", "Blog"],
					["/events", "Events"],
					["/promotions", "Promotions"],
					["/services", "Services"],
				].map(([href, label]) => (
					<Link
						key={href}
						href={href}
						className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-white dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-900"
					>
						{label}
					</Link>
				))}
			</div>
		</main>
	);
}
