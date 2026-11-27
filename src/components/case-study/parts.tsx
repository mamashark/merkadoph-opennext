/* Layout pieces shared by the case-study hub (/case-study) and its feature pages (/case-study/[feature]). */
import type { ReactNode } from "react";

export const LABEL = "font-label text-xs font-medium tracking-[0.14em] uppercase";

export function Section({ id, n, title, intro, children }: { id: string; n: number; title: string; intro?: string; children: ReactNode }) {
	return (
		<section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-t border-site-line pt-10 sm:pt-14">
			<p className={`${LABEL} text-accent`} aria-hidden>
				{String(n).padStart(2, "0")}
			</p>
			<h2 id={`${id}-h`} className="mt-3 font-display text-3xl leading-tight font-bold tracking-tight text-balance text-site-ink sm:text-4xl">
				{title}
			</h2>
			{intro && <p className="mt-3 max-w-2xl text-site-ink-2">{intro}</p>}
			<div className="mt-8">{children}</div>
		</section>
	);
}

/** Label/text pairs inside a card (Why, Trade-off, Problem…). */
export function Row({ label, children, tone = "muted" }: { label: string; children: ReactNode; tone?: "muted" | "accent" }) {
	return (
		<div className="grid gap-1 sm:grid-cols-[7.5rem_1fr] sm:gap-4">
			<dt className={`${LABEL} pt-0.5 ${tone === "accent" ? "text-accent" : "text-site-muted"}`}>{label}</dt>
			<dd className="text-site-ink-2">{children}</dd>
		</div>
	);
}

/** Text with every "[CONFIRM: ...]" marked, so an open question is hard to miss. The e2e suite fails while one is public. */
export function Marked({ text }: { text: string }) {
	return (
		<>
			{text.split(/(\[CONFIRM[^\]]*\])/).map((part, i) =>
				part.startsWith("[CONFIRM") ? (
					<strong key={i} className="border border-dashed border-accent px-1 font-medium text-site-ink">
						{part}
					</strong>
				) : (
					part
				),
			)}
		</>
	);
}
