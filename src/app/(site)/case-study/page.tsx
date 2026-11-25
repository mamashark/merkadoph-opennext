import type { Metadata } from "next";
import { PageIntro } from "@/components/site/content-card";
import { JsonLd } from "@/components/site/json-ld";
import { caseStudy as cs } from "@/lib/case-study-content";
import { formatDate } from "@/lib/datetime";
import { absoluteUrl, breadcrumbs, pageMetadata } from "@/lib/seo";

/*
 * /case-study: how this site was built, for developers, collaborators and employers (Kay, 2026-11-25).
 * Linked from the footer credit. All text is in src/lib/case-study-content.ts; this file is layout only.
 * No data: cached for a day and refreshed by Admin → Cache → "Site settings & legal" (it revalidates the root layout).
 */
export const revalidate = 86400; // CACHE_TTL

const PATH = "/case-study";
const LABEL = "font-label text-xs font-medium tracking-[0.14em] uppercase";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata({ title: cs.title, description: cs.description, path: PATH, type: "article", modifiedTime: cs.updated });
}

const SECTIONS = [
	{ id: "goals", label: "Goals" },
	{ id: "features", label: "Features" },
	{ id: "how-it-works", label: "How it works" },
	{ id: "decisions", label: "Decisions" },
	{ id: "challenges", label: "Challenges" },
	{ id: "results", label: "Results" },
	{ id: "next", label: "What's next" },
] as const;

function Section({ id, n, title, intro, children }: { id: string; n: number; title: string; intro?: string; children: React.ReactNode }) {
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
function Row({ label, children, tone = "muted" }: { label: string; children: React.ReactNode; tone?: "muted" | "accent" }) {
	return (
		<div className="grid gap-1 sm:grid-cols-[7.5rem_1fr] sm:gap-4">
			<dt className={`${LABEL} pt-0.5 ${tone === "accent" ? "text-accent" : "text-site-muted"}`}>{label}</dt>
			<dd className="text-site-ink-2">{children}</dd>
		</div>
	);
}

export default function CaseStudyPage() {
	return (
		<main className="accent-case-study mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "Article",
						headline: cs.title,
						description: cs.description,
						url: absoluteUrl(PATH),
						dateModified: cs.updated,
						author: { "@type": "Person", name: "KLA" },
					},
					breadcrumbs([{ name: "Case study", path: PATH }]),
				]}
			/>

			<PageIntro eyebrow="Case study" title={cs.title} description={cs.intro}>
				<p className="mt-4 font-label text-xs tracking-wide text-site-muted">
					Last updated <time dateTime={cs.updated}>{formatDate(cs.updated)}</time> · the site is still in progress
				</p>
			</PageIntro>

			<dl className="grid grid-cols-2 border-t border-l border-site-line lg:grid-cols-4">
				{cs.facts.map((f) => (
					<div key={f.label} className="min-w-0 border-r border-b border-site-line bg-site-surface px-4 py-4 sm:px-5">
						<dt className={`${LABEL} text-site-muted`}>{f.label}</dt>
						<dd className="mt-1.5 font-display text-lg leading-snug font-bold text-site-ink">{f.value}</dd>
					</div>
				))}
			</dl>

			<nav aria-label="On this page" className="mt-10">
				<ul className="flex flex-wrap gap-2">
					{SECTIONS.map((s) => (
						<li key={s.id}>
							<a
								href={`#${s.id}`}
								className="inline-flex min-h-10 items-center border border-site-line-2 px-3.5 font-label text-xs font-medium tracking-[0.1em] text-site-ink-2 uppercase transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
							>
								{s.label}
							</a>
						</li>
					))}
				</ul>
			</nav>

			<div className="mt-14 space-y-16 sm:space-y-20">
				<Section id="goals" n={1} title="Why it was rebuilt">
					<ul className="grid gap-6 sm:grid-cols-2">
						{cs.goals.map((g) => (
							<li key={g.title} className="border-t-2 border-site-ink pt-3">
								<h3 className="font-display text-lg font-bold text-site-ink">{g.title}</h3>
								<p className="mt-1 text-site-ink-2">{g.body}</p>
							</li>
						))}
					</ul>
				</Section>

				<Section id="features" n={2} title="What it does">
					<ul className="grid gap-px border border-site-line bg-site-line sm:grid-cols-2 lg:grid-cols-3">
						{cs.features.map((f) => (
							<li key={f.title} className="bg-site-surface p-5 sm:p-6">
								<h3 className="font-display text-lg leading-snug font-bold text-site-ink">{f.title}</h3>
								<p className="mt-2 text-sm text-site-ink-2">{f.body}</p>
							</li>
						))}
					</ul>
				</Section>

				<Section id="how-it-works" n={3} title="How it works" intro="A request travels top to bottom. Most pages are answered from the cache at the edge and never touch the database.">
					<ol className="max-w-3xl border-l-2 border-accent">
						{cs.architecture.map((a) => (
							<li key={a.title} className="relative py-3 pl-6">
								<span aria-hidden className="absolute top-[1.15rem] -left-1.25 h-2 w-2 bg-accent" />
								<h3 className={`${LABEL} text-site-ink`}>{a.title}</h3>
								<p className="mt-1 text-site-ink-2">{a.body}</p>
							</li>
						))}
					</ol>
				</Section>

				<Section id="decisions" n={4} title="Key decisions" intro="Each choice, the reason for it and the trade-off accepted.">
					<div className="grid gap-5 lg:grid-cols-2">
						{cs.decisions.map((d) => (
							<article key={d.title} className="border border-site-line bg-site-surface p-5 sm:p-6">
								<p className={`${LABEL} text-accent`}>{d.area}</p>
								<h3 className="mt-2 font-display text-xl leading-snug font-bold text-site-ink">{d.title}</h3>
								<dl className="mt-4 space-y-3">
									<Row label="Why" tone="accent">
										{d.why}
									</Row>
									<Row label="Trade-off">{d.tradeoff}</Row>
								</dl>
							</article>
						))}
					</div>
				</Section>

				<Section id="challenges" n={5} title="Challenges and how they were solved" intro="Real problems from the project log, with the cause, the fix and what came of it.">
					<ol className="space-y-5">
						{cs.challenges.map((c, i) => (
							<li key={c.title}>
								<article className="border border-site-line bg-site-surface p-5 sm:p-7">
									<p className={`${LABEL} text-site-muted`}>
										<span className="text-accent">{String(i + 1).padStart(2, "0")}</span> · {c.area}
									</p>
									<h3 className="mt-2 font-display text-xl leading-snug font-bold text-site-ink sm:text-2xl">{c.title}</h3>
									<dl className="mt-4 max-w-3xl space-y-3">
										<Row label="Problem">{c.problem}</Row>
										{c.cause && <Row label="Cause">{c.cause}</Row>}
										<Row label="Fix" tone="accent">
											{c.fix}
										</Row>
										<Row label="Result">{c.result}</Row>
									</dl>
								</article>
							</li>
						))}
					</ol>
				</Section>

				<Section id="results" n={6} title="Results" intro="Measured, not estimated. Lighthouse figures are the median of three runs.">
					<dl className="grid border-t border-l border-site-line sm:grid-cols-2 lg:grid-cols-3">
						{cs.results.map((r) => (
							<div key={r.label} className="border-r border-b border-site-line bg-site-surface px-5 py-5">
								<dt className={`${LABEL} text-site-muted`}>{r.label}</dt>
								<dd className="mt-2 font-display text-xl leading-snug font-bold text-site-ink">{r.value}</dd>
							</div>
						))}
					</dl>
				</Section>

				<Section id="next" n={7} title="What's next" intro="Being clear about what isn't finished yet.">
					<ul className="max-w-3xl space-y-3">
						{cs.next.map((item) => (
							<li key={item} className="flex gap-3 text-site-ink-2">
								<span aria-hidden className="mt-[0.6em] h-2 w-2 shrink-0 bg-accent" />
								<span>{item}</span>
							</li>
						))}
					</ul>
				</Section>

				<section aria-label="How it was made" className="border border-dashed border-site-line-2 p-5 sm:p-6">
					<p className="max-w-3xl text-site-ink-2">{cs.process}</p>
				</section>
			</div>
		</main>
	);
}
