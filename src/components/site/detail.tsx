import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Markdown } from "@/components/blog/markdown";

/* Building blocks for public detail pages (blog post, event, promotion, service). */

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
	return (
		<header className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 sm:pt-16">
			<Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white">
				<ArrowLeft className="h-4 w-4" aria-hidden /> {backLabel}
			</Link>
			{tags.length > 0 && (
				<ul className="mt-6 flex flex-wrap gap-2" aria-label="Tags">
					{tags.map((tag) => (
						<li key={tag} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200 dark:bg-teal-950 dark:text-teal-200 dark:ring-teal-900">
							{tag}
						</li>
					))}
				</ul>
			)}
			<h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-stone-900 dark:text-white sm:text-5xl">{title}</h1>
			{excerpt && <p className="mt-4 text-lg leading-relaxed text-stone-700 dark:text-stone-300 sm:text-xl">{excerpt}</p>}
			{children}
		</header>
	);
}

export function CoverFigure({ src, alt, caption }: { src: string | null; alt: string; caption?: string | null }) {
	if (!src) return null;
	return (
		<figure className="mx-auto mt-10 max-w-5xl px-4 sm:px-6">
			<div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#f4ebd9] dark:bg-stone-800">
				<Image src={src} alt={alt} fill fetchPriority="high" sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
			</div>
			{caption && <figcaption className="mt-3 text-center text-sm text-stone-600 dark:text-stone-400">{caption}</figcaption>}
		</figure>
	);
}

export type Fact = { icon: React.ElementType; label: string; value: React.ReactNode };

/** Key details box (date, venue, price…). */
export function Facts({ facts, children }: { facts: Fact[]; children?: React.ReactNode }) {
	const shown = facts.filter((f) => f.value);
	if (!shown.length && !children) return null;
	return (
		<div className="mx-auto mt-10 max-w-3xl px-4 sm:px-6">
			<div className="rounded-2xl border border-amber-900/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-6">
				<dl className="grid gap-5 sm:grid-cols-2">
					{shown.map(({ icon: Icon, label, value }) => (
						<div key={label} className="flex gap-3">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
								<Icon className="h-5 w-5" aria-hidden />
							</span>
							<div className="min-w-0">
								<dt className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">{label}</dt>
								<dd className="mt-0.5 text-sm font-medium text-stone-900 dark:text-stone-100">{value}</dd>
							</div>
						</div>
					))}
				</dl>
				{children && <div className="mt-5 flex flex-wrap gap-3 border-t border-amber-900/10 pt-5 dark:border-white/10">{children}</div>}
			</div>
		</div>
	);
}

export function CtaLink({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
	const external = /^https?:\/\//.test(href);
	return (
		<a
			href={href}
			{...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
			className={
				variant === "primary"
					? "inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-stone-950 dark:hover:bg-teal-400"
					: "inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
			}
		>
			{children}
			{external && <ArrowUpRight className="h-4 w-4" aria-hidden />}
			{external && <span className="sr-only">(opens in a new tab)</span>}
		</a>
	);
}

export function Body({ content }: { content: string }) {
	if (!content.trim()) return null;
	return (
		<div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
			<Markdown content={content} />
		</div>
	);
}

export function BackFooter({ href, label }: { href: string; label: string }) {
	return (
		<div className="mx-auto max-w-3xl border-t border-amber-900/10 px-4 py-10 dark:border-white/10 sm:px-6">
			<Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-800 hover:text-teal-950 dark:text-teal-300 dark:hover:text-teal-200">
				<ArrowLeft className="h-4 w-4" aria-hidden /> {label}
			</Link>
		</div>
	);
}
