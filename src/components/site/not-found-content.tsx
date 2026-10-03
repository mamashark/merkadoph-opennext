import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarDays, FileText, Home, MessageCircle, TicketPercent } from "lucide-react";

const sections = [
	{ href: "/services", label: "Services", hint: "Roofing, renovation & construction", icon: BriefcaseBusiness },
	{ href: "/promotions", label: "Promotions", hint: "Current offers and discounts", icon: TicketPercent },
	{ href: "/events", label: "Events", hint: "Community gatherings & workshops", icon: CalendarDays },
	{ href: "/blogs", label: "Blog", hint: "Guides, stories and news", icon: FileText },
];

/** Public 404 body, styled like the rest of the site. Wrapped by SiteShell (root) or the (site) layout. */
export function NotFoundContent() {
	return (
		<main className="relative overflow-hidden">
			{/* Soft brand glow */}
			<div
				aria-hidden
				className="pointer-events-none absolute left-1/2 top-0 -z-0 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-amber-200/50 via-transparent to-teal-200/40 blur-3xl dark:from-amber-500/10 dark:to-teal-500/10"
			/>

			<div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
				<p className="inline-flex items-center gap-2 rounded-full border border-amber-900/15 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal-800 dark:border-white/10 dark:bg-white/5 dark:text-teal-300">
					<span className="h-1.5 w-1.5 rounded-full bg-orange-500" aria-hidden /> Error 404
				</p>

				<p aria-hidden className="mt-6 select-none text-[7rem] font-semibold leading-none tracking-tighter text-stone-900/[0.07] dark:text-white/[0.07] sm:text-[10rem]">
					404
				</p>
				<h1 className="-mt-10 text-3xl font-semibold tracking-tight text-stone-950 dark:text-white sm:-mt-14 sm:text-5xl">Naligaw ka yata.</h1>
				<p className="mt-3 text-lg text-stone-700 dark:text-stone-300">
					Looks like you took a wrong turn. The page you&apos;re looking for doesn&apos;t exist, has moved, or is no longer available.
				</p>

				<div className="mt-8 flex flex-wrap justify-center gap-3">
					<Link
						href="/"
						className="inline-flex h-12 items-center gap-2 rounded-xl bg-stone-900 px-6 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200 dark:focus-visible:ring-offset-stone-950"
					>
						<Home className="h-4 w-4" aria-hidden /> Back to home
					</Link>
					<Link
						href="/#contact"
						className="inline-flex h-12 items-center gap-2 rounded-xl border border-stone-300 px-6 text-sm font-semibold text-stone-800 hover:bg-white dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-900"
					>
						<MessageCircle className="h-4 w-4" aria-hidden /> Contact us
					</Link>
				</div>
			</div>

			<nav aria-labelledby="nf-explore" className="relative mx-auto max-w-5xl px-4 pb-20 sm:px-6">
				<h2 id="nf-explore" className="text-center text-sm font-semibold uppercase tracking-widest text-stone-600 dark:text-stone-400">
					Or explore
				</h2>
				<ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{sections.map(({ href, label, hint, icon: Icon }) => (
						<li key={href}>
							<Link
								href={href}
								className="group flex h-full items-start gap-3 rounded-2xl border border-amber-900/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-stone-900"
							>
								<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
									<Icon className="h-5 w-5" aria-hidden />
								</span>
								<span className="min-w-0 flex-1">
									<span className="flex items-center gap-1 font-semibold text-stone-950 dark:text-white">
										{label}
										<ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
									</span>
									<span className="mt-0.5 block text-sm text-stone-600 dark:text-stone-400">{hint}</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			</nav>
		</main>
	);
}
