import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LABEL, Marked, Row, Section } from "@/components/case-study/parts";
import { ShotFigure } from "@/components/case-study/shot-figure";
import { Walkthrough } from "@/components/case-study/walkthrough";
import { PageIntro } from "@/components/site/content-card";
import { JsonLd } from "@/components/site/json-ld";
import { caseStudy as cs } from "@/lib/case-study-content";
import { caseStudyIntegrity } from "@/lib/case-study/check";
import { caseStudyPages, featureBySlug, featureMetaTitle } from "@/lib/case-study/features";
import type { Shot, ShowcaseFeature, WalkthroughStep } from "@/lib/case-study/types";
import { formatDate } from "@/lib/datetime";
import { HIGHLIGHT_IDS, HIGHLIGHTS } from "@/lib/highlights";
import { absoluteUrl, breadcrumbs, pageMetadata } from "@/lib/seo";

/*
 * /case-study/[feature]: one feature of the site, told with a guided walkthrough (design: local/behind-the-build-phase2-design.md, section 3).
 * All text is in src/lib/case-study/features/<slug>.ts. No data and no searchParams, so it is cached for a day and refreshed by
 * Admin → Cache → "Site settings & legal". The slugs are finite and in code: anything else is a 404 without rendering.
 */
export const revalidate = 86400; // CACHE_TTL
export const dynamicParams = false;

export function generateStaticParams() {
	caseStudyIntegrity(); // build time only: fails `next build` on a dangling id, a missing shot, a stale date or a too-long title
	return caseStudyPages().map((f) => ({ feature: f.slug }));
}

const pathOf = (f: ShowcaseFeature) => `/case-study/${f.slug}`;
const LINK = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export async function generateMetadata({ params }: PageProps<"/case-study/[feature]">): Promise<Metadata> {
	const f = featureBySlug((await params).feature);
	if (!f?.walkthrough?.length) return { title: "Not found", robots: { index: false } };
	return pageMetadata({ title: featureMetaTitle(f), description: f.summary, path: pathOf(f), type: "article", publishedTime: cs.published, modifiedTime: f.updated });
}

/** The shots of a step, grouped by state: a desktop capture with its phone partner, or a lone capture. */
function groupShots(step: WalkthroughStep) {
	const byState = new Map<string, { desktop: Shot[]; mobile: Shot[] }>();
	for (const s of step.shots) {
		const g = byState.get(s.state) ?? { desktop: [], mobile: [] };
		(s.viewport === "mobile" ? g.mobile : g.desktop).push(s);
		byState.set(s.state, g);
	}
	const all = [...byState.values()];
	return { paired: all.filter((g) => g.desktop.length && g.mobile.length), single: all.filter((g) => !(g.desktop.length && g.mobile.length)) };
}

function StepBody({ step, n, total }: { step: WalkthroughStep; n: number; total: number }) {
	const { paired, single } = groupShots(step);
	return (
		<article aria-labelledby={`step-${step.id}-h`} className="border border-site-line bg-site-surface p-5 sm:p-7">
			<p className={`${LABEL} text-accent`}>
				Step {n} of {total}
			</p>
			<h3 id={`step-${step.id}-h`} className="mt-2 font-display text-2xl leading-snug font-bold text-site-ink">
				{step.step}
			</h3>
			<p className="mt-3 max-w-3xl text-site-ink-2">
				<Marked text={step.body} />
			</p>
			{step.liveHref && (
				<p className="mt-3">
					<Link href={step.liveHref} className={`inline-flex min-h-11 items-center font-label text-xs font-medium tracking-[0.1em] text-accent uppercase underline underline-offset-4 ${LINK}`}>
						Try this on the live site
					</Link>
				</p>
			)}
			{paired.map((g, i) => (
				<div key={g.desktop[0].file} className="mt-6 grid items-start gap-5 md:grid-cols-[1fr_12rem]">
					{/* The very first picture on the page is the one that may be the largest paint: load it at once. */}
					<ShotFigure shots={g.desktop} eager={n === 1 && i === 0} />
					<ShotFigure shots={g.mobile} className="max-w-48" />
				</div>
			))}
			{single.length > 0 && (
				<div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{single.map((g) => (
						<ShotFigure key={(g.desktop[0] ?? g.mobile[0]).file} shots={g.desktop.length ? g.desktop : g.mobile} />
					))}
				</div>
			)}
		</article>
	);
}

export default async function FeaturePage({ params }: PageProps<"/case-study/[feature]">) {
	const f = featureBySlug((await params).feature);
	if (!f || !f.walkthrough?.length) notFound();

	const steps = f.walkthrough;
	const path = pathOf(f);
	const pages = caseStudyPages();
	const at = pages.findIndex((p) => p.slug === f.slug);
	const prev = at > 0 ? pages[at - 1] : null;
	const next = at < pages.length - 1 ? pages[at + 1] : null;
	const challenges = (f.challenges ?? []).flatMap((id) => cs.challenges.filter((c) => c.id === id));
	const decisions = (f.decisions ?? []).flatMap((id) => cs.decisions.filter((d) => d.id === id));
	let n = 0;
	const num = () => ++n;

	return (
		<main className="accent-case-study mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "Article",
						headline: featureMetaTitle(f),
						description: f.summary,
						url: absoluteUrl(path),
						datePublished: cs.published,
						dateModified: f.updated,
						mainEntityOfPage: absoluteUrl(path),
						isPartOf: absoluteUrl("/case-study"),
						author: { "@type": "Person", name: "KLA" },
					},
					breadcrumbs([
						{ name: "Case study", path: "/case-study" },
						{ name: f.title, path },
					]),
				]}
			/>

			<nav aria-label="Breadcrumb" className="mb-6 font-label text-xs tracking-wide text-site-muted">
				<Link href="/case-study" className={`inline-flex min-h-11 items-center underline underline-offset-4 hover:text-accent ${LINK}`}>
					← Behind the Build
				</Link>
			</nav>

			<PageIntro eyebrow="Case study · Behind the Build" title={f.title} description={f.summary}>
				<p className="mt-4 font-label text-xs tracking-wide text-site-muted">
					{f.status === "live" ? "Live on the site" : f.status} · Last updated <time dateTime={f.updated}>{formatDate(f.updated)}</time>
				</p>
			</PageIntro>

			<div className="space-y-16 sm:space-y-20">
				<Section id="overview" n={num()} title="The problem and the solution">
					<dl className="max-w-3xl space-y-4">
						<Row label="Problem">{f.problem}</Row>
						<Row label="Solution" tone="accent">
							{f.solution}
						</Row>
					</dl>
				</Section>

				<Section id="walkthrough" n={num()} title="Walkthrough" intro="Step through the experience as a visitor sees it. The screenshots are real, taken from the site, and follow your light or dark setting.">
					<Walkthrough steps={steps.map((s) => ({ id: s.id, title: s.step }))}>
						{steps.map((s, i) => (
							<StepBody key={s.id} step={s} n={i + 1} total={steps.length} />
						))}
					</Walkthrough>
				</Section>

				{f.highlights && (
					<Section id="highlights" n={num()} title="The seven Highlights" intro="Each Highlight, with its real name and line from the homepage, what feeds it and the rule that picks what appears.">
						<ul className="grid gap-5 lg:grid-cols-2">
							{HIGHLIGHT_IDS.map((id) => {
								const def = HIGHLIGHTS[id];
								const c = f.highlights?.[id];
								return (
									<li key={id} id={`highlight-${id}`} className="scroll-mt-24 border border-site-line bg-site-surface p-5 sm:p-6">
										<h3 className="font-display text-xl leading-snug font-bold text-site-ink">{def.label}</h3>
										<p className="mt-1 text-sm text-site-muted">{def.sub}</p>
										{c ? (
											<>
												<dl className="mt-4 space-y-3">
													<Row label="What">{c.what}</Row>
													<Row label="Fed by">{c.feeds}</Row>
													<Row label="Rule">
														<Marked text={c.rule} />
													</Row>
													{c.count && (
														<Row label="Size">
															{c.count.value} in the sky on {formatDate(c.count.asOf)} (a snapshot, not live)
														</Row>
													)}
												</dl>
												{c.shots && <ShotFigure shots={c.shots} className="mt-4" />}
											</>
										) : (
											<p className="mt-4">
												<Marked text={`[CONFIRM: ${def.label} has no description yet]`} />
											</p>
										)}
										<p className="mt-4">
											<Link href={def.list} className={`inline-flex min-h-11 items-center font-label text-xs font-medium tracking-[0.1em] text-accent uppercase underline underline-offset-4 ${LINK}`}>
												{def.allLabel}
											</Link>
										</p>
									</li>
								);
							})}
						</ul>
					</Section>
				)}

				{f.underTheHood && (
					<Section id="under-the-hood" n={num()} title="Under the hood" intro="How it is built. File names are application source files; each note was checked against the code on the date shown.">
						<div className="max-w-3xl divide-y divide-site-line border border-site-line bg-site-surface">
							{f.underTheHood.map((u) => (
								<details key={u.label} className="p-4 sm:p-5">
									<summary className={`flex min-h-11 cursor-pointer items-center font-display text-lg font-bold text-site-ink ${LINK}`}>{u.label}</summary>
									<p className="mt-2 text-site-ink-2">{u.body}</p>
									<p className="mt-3 font-label text-xs tracking-wide text-site-muted">
										{u.source?.map((s) => (
											<code key={s} className="mr-2 border border-site-line px-1.5 py-0.5">
												{s}
											</code>
										))}
										Checked <time dateTime={u.verified}>{formatDate(u.verified)}</time>
									</p>
								</details>
							))}
						</div>
					</Section>
				)}

				{(decisions.length > 0 || challenges.length > 0) && (
					<Section id="related" n={num()} title="Decisions and challenges" intro="The matching entries on the main page.">
						<ul className="max-w-3xl space-y-3">
							{decisions.map((d) => (
								<li key={d.id}>
									<Link href={`/case-study#decision-${d.id}`} className={`inline-flex min-h-11 items-center text-site-ink underline underline-offset-4 hover:text-accent ${LINK}`}>
										<span className={`${LABEL} mr-3 text-accent`}>Decision</span>
										{d.title}
									</Link>
								</li>
							))}
							{challenges.map((c) => (
								<li key={c.id}>
									<Link href={`/case-study#challenge-${c.id}`} className={`inline-flex min-h-11 items-center text-site-ink underline underline-offset-4 hover:text-accent ${LINK}`}>
										<span className={`${LABEL} mr-3 text-accent`}>Challenge</span>
										{c.title}
									</Link>
								</li>
							))}
						</ul>
					</Section>
				)}

				{f.results && (
					<Section id="results" n={num()} title="Results" intro="Measured, with the date. Phone figures are from emulated phones, not real devices.">
						<dl className="grid border-t border-l border-site-line sm:grid-cols-2 lg:grid-cols-3">
							{f.results.map((r) => (
								<div key={r.label} className="border-r border-b border-site-line bg-site-surface px-5 py-5">
									<dt className={`${LABEL} text-site-muted`}>{r.label}</dt>
									<dd className="mt-2 font-display text-xl leading-snug font-bold text-site-ink">{r.value}</dd>
									<dd className="mt-2 text-sm text-site-muted">
										Measured <time dateTime={r.measured}>{formatDate(r.measured)}</time>
										{r.note ? `. ${r.note}` : ""}
									</dd>
								</div>
							))}
						</dl>
					</Section>
				)}

				{f.future && f.future.length > 0 && (
					<Section id="future" n={num()} title="What's next">
						<ul className="max-w-3xl space-y-3">
							{f.future.map((item) => (
								<li key={item} className="flex gap-3 text-site-ink-2">
									<span aria-hidden className="mt-[0.6em] h-2 w-2 shrink-0 bg-accent" />
									<span>{item}</span>
								</li>
							))}
						</ul>
					</Section>
				)}
			</div>

			<nav aria-label="More from Behind the Build" className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-site-line pt-6">
				{prev ? (
					<Link href={pathOf(prev)} className={`inline-flex min-h-11 items-center underline underline-offset-4 hover:text-accent ${LINK}`}>
						← {prev.title}
					</Link>
				) : (
					<span />
				)}
				<Link href="/case-study" className={`inline-flex min-h-11 items-center underline underline-offset-4 hover:text-accent ${LINK}`}>
					Back to the case study
				</Link>
				{next ? (
					<Link href={pathOf(next)} className={`inline-flex min-h-11 items-center underline underline-offset-4 hover:text-accent ${LINK}`}>
						{next.title} →
					</Link>
				) : (
					<span />
				)}
			</nav>
		</main>
	);
}
