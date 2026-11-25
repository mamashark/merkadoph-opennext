import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/ui";

/*
 * Public listing building blocks, in the site design system (globals.css `--site-*`, Kay 2026-11-25): the homepage's
 * look on every page. Square corners, thin lines, Plex Mono labels, and the section colour (`--accent`, set by an
 * `accent-*` class on the page) for kickers, active filters and hover lines.
 */

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
				"group relative flex flex-col overflow-hidden border border-site-line bg-site-surface transition-colors hover:border-accent/60",
				"has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-3 has-[a:focus-visible]:outline-accent",
				featured && "md:flex-row",
			)}
		>
			<div className={cn("relative aspect-[4/3] overflow-hidden", !image && "weave", featured && "md:aspect-auto md:min-h-80 md:w-3/5")}>
				{image && (
					<Image
						src={image}
						alt={imageAlt ?? ""}
						fill
						sizes={featured ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
						className="object-cover transition duration-700 group-hover:scale-[1.04] motion-reduce:transition-none"
						loading={priority ? "eager" : "lazy"}
						fetchPriority={priority ? "high" : undefined}
					/>
				)}
				{badge && <div className="absolute top-3 left-3">{badge}</div>}
			</div>
			<div className={cn("flex flex-1 flex-col gap-2.5 px-5 pt-4 pb-5", featured && "md:justify-center md:p-8")}>
				{eyebrow && <p className="font-label text-xs font-medium tracking-[0.14em] text-accent uppercase">{eyebrow}</p>}
				<Heading className={cn("font-display leading-[1.15] font-bold tracking-tight text-site-ink", featured ? "text-2xl md:text-4xl" : "text-xl")}>
					<Link href={href} className="after:absolute after:inset-0 focus:outline-none">
						{title}
					</Link>
				</Heading>
				{excerpt && <p className={cn("text-site-ink-2", featured ? "line-clamp-4" : "line-clamp-3 text-sm")}>{excerpt}</p>}
				{meta && <div className="mt-auto pt-3 font-label text-xs tracking-wide text-site-muted">{meta}</div>}
			</div>
		</article>
	);
}

/** A small label on a card photo (Pinned, a date…). */
export function Pill({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "accent" | "muted" }) {
	return (
		<span
			className={cn(
				"inline-flex items-center px-2 py-1 font-label text-xs font-medium tracking-[0.08em] uppercase",
				tone === "accent" && "bg-accent text-on-accent",
				tone === "light" && "bg-site-surface text-site-ink",
				tone === "muted" && "bg-site-ink text-site-bg",
			)}
		>
			{children}
		</span>
	);
}

/** Page heading: a section-coloured kicker with its square mark, a big display title and a short intro. */
export function PageIntro({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
	return (
		<header className="mb-10 max-w-3xl">
			<p className="kicker-mark font-label text-xs font-medium tracking-[0.14em] text-accent uppercase">{eyebrow}</p>
			<h1 className="mt-4 font-display text-[clamp(2.5rem,7vw,4.75rem)] leading-[0.95] font-bold tracking-tight text-balance text-site-ink">{title}</h1>
			<p className="mt-5 max-w-2xl text-lg text-site-ink-2">{description}</p>
			{children}
		</header>
	);
}

/** URL-based tabs (e.g. Upcoming / Past): mono labels with a section-coloured underline on the current one. */
export function LinkTabs({ tabs, current, label }: { tabs: Array<{ label: string; href: string; value: string }>; current: string; label: string }) {
	return (
		<nav aria-label={label} className="mb-8 border-b border-site-line">
			<ul className="-mb-px flex gap-6">
				{tabs.map((t) => (
					<li key={t.value}>
						<Link
							href={t.href}
							aria-current={t.value === current ? "page" : undefined}
							className={cn(
								"inline-flex min-h-11 items-center border-b-2 font-label text-xs font-medium tracking-[0.12em] uppercase",
								t.value === current ? "border-accent text-site-ink" : "border-transparent text-site-muted hover:text-site-ink",
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

const CHIP = "inline-flex min-h-10 items-center border px-3.5 font-label text-xs font-medium tracking-[0.1em] uppercase transition-colors";

/**
 * URL-based chip filter (e.g. /events?tag=…): the first chip ("" value) clears it. Square mono chips, as on the homepage.
 * With `visible`, only that many are shown (pass them most-used first); the rest open from "More tags" (a <details>,
 * so it works without JavaScript). A selected tag is always shown.
 */
export function ChipFilter({
	label,
	allLabel,
	items,
	current,
	href,
	visible,
}: {
	label: string;
	allLabel: string;
	items: string[];
	current: string;
	href: (value: string) => string;
	visible?: number;
}) {
	const limit = visible && items.length > visible + 2 ? visible : items.length;
	const shown = items.slice(0, limit);
	if (current && !shown.includes(current) && items.includes(current)) shown.push(current);
	const rest = items.filter((v) => !shown.includes(v));
	const chip = (v: string) => (
		<li key={v || "all"}>
			<Link
				href={href(v)}
				aria-current={v === current ? "page" : undefined}
				className={cn(CHIP, v === current ? "border-accent bg-accent text-on-accent" : "border-site-line-2 text-site-ink-2 hover:border-accent hover:text-accent")}
			>
				{v || allLabel}
			</Link>
		</li>
	);
	return (
		<nav aria-label={label} className="mb-8">
			<ul className="flex flex-wrap gap-2">{["", ...shown].map(chip)}</ul>
			{rest.length > 0 && (
				<details className="group mt-2">
					<summary className={cn(CHIP, "cursor-pointer list-none border-dashed border-site-line-2 text-site-muted hover:border-accent hover:text-accent [&::-webkit-details-marker]:hidden")}>
						<span className="group-open:hidden">More tags ({rest.length})</span>
						<span className="hidden group-open:inline">Fewer tags</span>
					</summary>
					<ul className="flex flex-wrap gap-2 pt-2">{rest.map(chip)}</ul>
				</details>
			)}
		</nav>
	);
}

export function EmptyNotice({ title, description }: { title: string; description: string }) {
	return (
		<div className="border border-dashed border-site-line-2 px-6 py-20 text-center">
			<p className="font-display text-xl font-bold text-site-ink">{title}</p>
			<p className="mt-2 text-site-muted">{description}</p>
		</div>
	);
}
