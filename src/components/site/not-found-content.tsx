import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarDays, FileText, Home, MessageCircle, TicketPercent } from "lucide-react";

const sections = [
	{ href: "/services", label: "Services", hint: "Roofing, renovation & construction", icon: BriefcaseBusiness },
	{ href: "/promotions", label: "Promotions", hint: "Current offers and discounts", icon: TicketPercent },
	{ href: "/events", label: "Events", hint: "Community gatherings & workshops", icon: CalendarDays },
	{ href: "/blogs", label: "Blogs", hint: "Guides, stories and news", icon: FileText },
];

/** Public 404 body, styled like the rest of the site. Wrapped by SiteShell (root) or the (site) layout. */
export function NotFoundContent() {
	return (
		<main className="relative overflow-hidden">
			<div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
				<p className="kicker-mark font-label text-xs font-medium tracking-[0.14em] text-accent uppercase">
					Error 404
				</p>

				<p aria-hidden className="mt-6 font-display text-[7rem] leading-none font-bold tracking-tighter text-site-ink/[0.07] select-none sm:text-[10rem]">
					404
				</p>
				<h1 className="-mt-10 font-display text-4xl font-bold tracking-tight text-site-ink sm:-mt-14 sm:text-6xl">Naligaw ka yata.</h1>
				<p className="mt-3 text-lg text-site-ink-2">
					Looks like you took a wrong turn. The page you&apos;re looking for doesn&apos;t exist, has moved, or is no longer available.
				</p>

				<div className="mt-8 flex flex-wrap justify-center gap-3">
					<Link
						href="/"
						className="inline-flex min-h-12 items-center gap-2 border border-site-ink bg-site-ink px-6 font-label text-xs font-medium tracking-[0.1em] text-site-bg uppercase transition-colors hover:bg-transparent hover:text-site-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
					>
						<Home className="h-4 w-4" aria-hidden /> Back to home
					</Link>
					<Link
						href="/#contact"
						className="inline-flex min-h-12 items-center gap-2 border border-site-line-2 px-6 font-label text-xs font-medium tracking-[0.1em] text-site-ink uppercase transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
					>
						<MessageCircle className="h-4 w-4" aria-hidden /> Contact us
					</Link>
				</div>
			</div>

			<nav aria-labelledby="nf-explore" className="relative mx-auto max-w-5xl px-4 pb-20 sm:px-6">
				<h2 id="nf-explore" className="text-center text-sm font-semibold uppercase tracking-widest text-site-muted">
					Or explore
				</h2>
				<ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{sections.map(({ href, label, hint, icon: Icon }) => (
						<li key={href}>
							<Link
								href={href}
								className="group flex h-full items-start gap-3 border border-site-line bg-site-surface p-4 text-left transition-colors hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
							>
								<span className="flex h-10 w-10 shrink-0 items-center justify-center bg-accent/12 text-accent">
									<Icon className="h-5 w-5" aria-hidden />
								</span>
								<span className="min-w-0 flex-1">
									<span className="flex items-center gap-1 font-display font-bold text-site-ink">
										{label}
										<ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
									</span>
									<span className="mt-0.5 block text-sm text-site-muted">{hint}</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			</nav>
		</main>
	);
}
