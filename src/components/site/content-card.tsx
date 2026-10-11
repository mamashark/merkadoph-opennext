import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/ui";

type Props = {
	href: string;
	title: string;
	excerpt?: string | null;
	image?: string | null;
	imageAlt?: string | null;
	eyebrow?: React.ReactNode;
	meta?: React.ReactNode;
	badge?: React.ReactNode;
	featured?: boolean;
	/** Mark the first visible image as LCP so it isn't lazy-loaded. */
	priority?: boolean;
	headingLevel?: "h2" | "h3";
};

/** Public listing card used by blogs, events, promotions and services. The whole card is clickable. */
export function ContentCard({ href, title, excerpt, image, imageAlt, eyebrow, meta, badge, featured = false, priority = false, headingLevel = "h2" }: Props) {
	const Heading = headingLevel;
	return (
		<article
			className={cn(
				"group relative flex flex-col overflow-hidden rounded-2xl border border-amber-900/10 bg-white shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-stone-900",
				featured && "md:flex-row",
			)}
		>
			<div className={cn("relative aspect-[16/9] overflow-hidden bg-[#f4ebd9] dark:bg-stone-800", featured && "md:aspect-auto md:min-h-80 md:w-3/5")}>
				{image ? (
					<Image
						src={image}
						alt={imageAlt ?? ""}
						fill
						sizes={featured ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
						className="object-cover transition duration-500 group-hover:scale-[1.03]"
						loading={priority ? "eager" : "lazy"}
						fetchPriority={priority ? "high" : undefined}
					/>
				) : (
					<div className="flex h-full items-center justify-center text-sm font-semibold tracking-widest text-amber-900/40 dark:text-stone-600" aria-hidden>
						MERKADO PH
					</div>
				)}
				{badge && <div className="absolute left-3 top-3">{badge}</div>}
			</div>
			<div className={cn("flex flex-1 flex-col p-5", featured && "md:justify-center md:p-8")}>
				{eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">{eyebrow}</p>}
				<Heading className={cn("font-semibold leading-snug text-stone-900 dark:text-white", featured ? "text-2xl md:text-3xl" : "text-lg")}>
					<Link href={href} className="after:absolute after:inset-0 focus:outline-none focus-visible:underline">
						{title}
					</Link>
				</Heading>
				{excerpt && <p className={cn("mt-2 text-stone-700 dark:text-stone-300", featured ? "line-clamp-4" : "line-clamp-3 text-sm")}>{excerpt}</p>}
				{meta && <div className="mt-auto pt-4 text-xs text-stone-600 dark:text-stone-400">{meta}</div>}
			</div>
		</article>
	);
}

export function Pill({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "accent" | "muted" }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
				tone === "accent" && "bg-orange-600 text-white",
				tone === "light" && "bg-white/95 text-stone-900",
				tone === "muted" && "bg-stone-800/90 text-white",
			)}
		>
			{children}
		</span>
	);
}

export function PageIntro({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
	return (
		<header className="mb-10 max-w-2xl">
			<p className="text-sm font-semibold uppercase tracking-widest text-teal-800 dark:text-teal-300">{eyebrow}</p>
			<h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-5xl">{title}</h1>
			<p className="mt-3 text-lg text-stone-700 dark:text-stone-300">{description}</p>
			{children}
		</header>
	);
}

/** URL-based tabs (e.g. Upcoming / Past). */
export function LinkTabs({ tabs, current, label }: { tabs: Array<{ label: string; href: string; value: string }>; current: string; label: string }) {
	return (
		<nav aria-label={label} className="mb-8">
			<ul className="inline-flex gap-1 rounded-full bg-stone-900/5 p-1 text-sm font-medium dark:bg-white/10">
				{tabs.map((t) => (
					<li key={t.value}>
						<Link
							href={t.href}
							aria-current={t.value === current ? "page" : undefined}
							className={cn(
								"block rounded-full px-4 py-1.5",
								t.value === current ? "bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-white" : "text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white",
							)}
						>
							{t.label}
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
}

export function EmptyNotice({ title, description }: { title: string; description: string }) {
	return (
		<div className="rounded-2xl border border-dashed border-amber-900/20 bg-white/60 px-6 py-20 text-center dark:border-white/15 dark:bg-stone-900/60">
			<p className="text-lg font-medium text-stone-800 dark:text-stone-200">{title}</p>
			<p className="mt-1 text-stone-600 dark:text-stone-400">{description}</p>
		</div>
	);
}
