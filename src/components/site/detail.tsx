import { Children } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Markdown } from "@/components/blog/markdown";
import { summarize } from "@/lib/content";
import { cn } from "@/lib/ui";

/*
 * Building blocks for public detail pages (event, promotion, service, Community Impact entry), in the site design
 * system (globals.css `--site-*`, Kay 2026-11-25): the same look as the blog post page. A 42rem reading column,
 * a section-coloured kicker (`--accent`, from the page's `accent-*` class), square corners and Plex Mono labels.
 */

/** The reading column shared by the header, body and footer. */
const COLUMN = "mx-auto w-full max-w-[42rem] px-4 sm:px-8";
const LABEL = "font-label text-xs font-medium tracking-[0.14em] uppercase";

export function DetailHeader({
	backHref,
	backLabel,
	tags,
	title,
	excerpt,
	children,
}: {
	backHref: string;
	backLabel: string;
	tags: string[];
	title: string;
	excerpt?: string | null;
	children?: React.ReactNode;
}) {
	const [kicker, ...more] = tags.filter((t) => t.toLowerCase() !== "sample");
	return (
		<header className={`${COLUMN} pt-8 pb-7 sm:pt-14`}>
			<Link href={backHref} className={`inline-flex min-h-11 items-center gap-1.5 ${LABEL} text-site-muted hover:text-site-ink`}>
				<ArrowLeft className="h-4 w-4" aria-hidden /> {backLabel}
			</Link>
			{kicker && (
				<p className={`kicker-mark mt-6 ${LABEL} text-accent`}>
					{kicker}
					{more.length > 0 && <span className="text-site-muted"> · {more.join(" · ")}</span>}
				</p>
			)}
			<h1 className={cn("font-display text-[clamp(2rem,7vw,3.75rem)] leading-[1.04] font-bold tracking-tight text-balance text-site-ink", kicker ? "mt-4" : "mt-6")}>{title}</h1>
			{excerpt && <p className="mt-4 text-lg leading-snug text-site-ink-2 sm:text-[1.375rem]">{excerpt}</p>}
			{children}
		</header>
	);
}

/**
 * The cover under the title. By default it is cropped to a 16:9 box; `uncropped` shows the whole image at its own
 * proportions across the full column (press clippings and scans must never lose their edges).
 */
export function CoverFigure({ src, alt, caption, uncropped = false }: { src: string | null; alt: string; caption?: string | null; uncropped?: boolean }) {
	if (!src) return null;
	return (
		<figure className="mx-auto mt-4 max-w-5xl px-4 sm:px-8">
			{uncropped ? (
				<div className="bg-site-sunken">
					{/* Natural size is unknown for remote images: width/height 0 + auto height keeps the image's own ratio (no crop, no layout shift beyond the load). */}
					<Image src={src} alt={alt} width={0} height={0} loading="eager" fetchPriority="high" quality={90} sizes="(min-width: 1024px) 1024px, 100vw" className="block h-auto w-full" />
				</div>
			) : (
				<div className="relative aspect-[16/9] overflow-hidden bg-site-sunken">
					<Image src={src} alt={alt} fill loading="eager" fetchPriority="high" sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
				</div>
			)}
			{caption && <figcaption className="mt-2.5 text-sm text-site-muted">{caption}</figcaption>}
		</figure>
	);
}

export type Fact = { icon: React.ElementType; label: string; value: React.ReactNode };

/** Key details box (date, venue, price…). */
export function Facts({ facts, children }: { facts: Fact[]; children?: React.ReactNode }) {
	const shown = facts.filter((f) => f.value);
	// Buttons switched off (false/null) don't count, so no empty divider is drawn.
	const actions = Children.toArray(children);
	if (!shown.length && !actions.length) return null;
	return (
		<div className={`${COLUMN} mt-8`}>
			<div className="border border-site-line bg-site-surface p-5 sm:p-6">
				<dl className="grid gap-5 sm:grid-cols-2">
					{/* B38 (WCAG 1.3.1): each group holds only a <dt> and a <dd>; the icon sits inside the <dt>. */}
					{shown.map(({ icon: Icon, label, value }) => (
						<div key={label} className="relative min-h-10 min-w-0 pl-[3.25rem]">
							<dt className={`${LABEL} text-site-muted`}>
								<span className="absolute top-0 left-0 flex h-10 w-10 items-center justify-center bg-accent/12 text-accent" aria-hidden>
									<Icon className="h-5 w-5" />
								</span>
								{label}
							</dt>
							<dd className="mt-1 text-sm font-medium text-site-ink">{value}</dd>
						</div>
					))}
				</dl>
				{actions.length > 0 && <div className="mt-5 flex flex-wrap gap-3 border-t border-site-line pt-5">{actions}</div>}
			</div>
		</div>
	);
}

export function CtaLink({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
	const external = /^https?:\/\//.test(href);
	const className = cn(
		"inline-flex min-h-11 items-center gap-1.5 border px-4 font-label text-xs font-medium tracking-[0.1em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
		variant === "primary" ? "border-accent bg-accent text-on-accent hover:bg-transparent hover:text-accent" : "border-site-line-2 text-site-ink hover:border-accent hover:text-accent",
	);
	// Paths on this site stay on the current deployment's domain (NEXT_PUBLIC_SITE_URL).
	if (href.startsWith("/")) {
		return (
			<Link href={href} className={className}>
				{children}
			</Link>
		);
	}
	return (
		<a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={className}>
			{children}
			{external && <ArrowUpRight className="h-4 w-4" aria-hidden />}
			{external && <span className="sr-only">(opens in a new tab)</span>}
		</a>
	);
}

/** The page's Markdown body, in the reading column with the blog post's text size. */
export function Body({ content }: { content: string }) {
	if (!content.trim()) return null;
	return (
		<div className={`${COLUMN} prose-article py-10 sm:py-12`}>
			<Markdown content={content} />
		</div>
	);
}

/** `image` is decorative (the title next to it is the link text), so it renders with alt="". */
export type CompanionItem = { href: string; title: string; excerpt?: string | null; image?: { url: string; alt: string } | null; meta?: string | null };

/** Cross-link between a blog post and its Community Impact entry ("Read the story" / "See the photos"). Whole card is clickable. */
export function Companion({ heading, items, id = "companion-heading" }: { heading: string; items: CompanionItem[]; id?: string }) {
	if (!items.length) return null;
	return (
		<section aria-labelledby={id} className={`${COLUMN} pb-10`}>
			<h2 id={id} className={`kicker-mark ${LABEL} text-accent`}>
				{heading}
			</h2>
			<ul className="mt-4 space-y-3">
				{items.map((item, i) => (
					<li key={item.href} className="group relative flex items-center gap-4 border border-site-line bg-site-surface p-3 transition-colors hover:border-accent/60 sm:p-4">
						<div className={cn("relative aspect-[4/3] w-24 shrink-0 overflow-hidden sm:w-32", !item.image && "weave")}>
							{item.image && <Image src={item.image.url} alt="" fill sizes="(min-width: 640px) 128px, 96px" className="object-cover" />}
						</div>
						<div className="min-w-0 flex-1">
							{item.meta && (
								<p id={`${id}-meta-${i}`} className="font-label text-xs tracking-wide text-site-muted uppercase">
									{item.meta}
								</p>
							)}
							<p className="mt-1 line-clamp-3 font-display text-lg leading-snug font-bold text-site-ink">
								{/* Focus: an outline on ::after (survives Windows forced colours, unlike a box-shadow ring) round the whole card. */}
								<Link
									href={item.href}
									aria-describedby={item.meta ? `${id}-meta-${i}` : undefined}
									className="after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
								>
									{item.title}
								</Link>
							</p>
							{/* Shortened, not just clamped, so screen readers don't hear a 500-character excerpt behind a 2-line preview. */}
							{item.excerpt && <p className="mt-1 line-clamp-2 text-sm text-site-ink-2">{summarize({ excerpt: item.excerpt, content: "", meta_description: null }, 160)}</p>}
						</div>
						<ArrowRight className="h-5 w-5 shrink-0 text-accent transition group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
					</li>
				))}
			</ul>
		</section>
	);
}

export function BackFooter({ href, label }: { href: string; label: string }) {
	return (
		<div className={`${COLUMN} border-t border-site-line py-10`}>
			<Link href={href} className={`inline-flex min-h-11 items-center gap-1.5 ${LABEL} text-site-ink hover:text-accent`}>
				<ArrowLeft className="h-4 w-4" aria-hidden /> {label}
			</Link>
		</div>
	);
}
