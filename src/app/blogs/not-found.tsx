import Link from "next/link";

export default function BlogNotFound() {
	return (
		<main className="mx-auto max-w-xl px-4 py-24 text-center">
			<p className="text-sm font-semibold uppercase tracking-widest text-teal-700">404</p>
			<h1 className="mt-2 text-3xl font-semibold text-slate-900">We couldn&apos;t find that story</h1>
			<p className="mt-2 text-slate-600">It may have been moved or unpublished.</p>
			<Link href="/blogs" className="mt-8 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
				Browse all stories
			</Link>
		</main>
	);
}
