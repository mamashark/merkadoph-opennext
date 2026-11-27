/*
 * Build-time integrity check for the case study (design section 1.3). Pure: it takes the content as an argument, so it
 * has no dependency on where the content lives and can be called from generateStaticParams (build only, never per request).
 * Throws one Error listing every problem. Wired into the pages in phase 4.
 */
import type { ChangelogEntry, Challenge, Decision, ISODate, ShotManifest, ShowcaseFeature, Shot } from "./types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TITLE_TEMPLATE = " | Merkado PH";

export type CaseStudyData = {
	/** `caseStudy.updated` of the hub. */
	hubUpdated: ISODate;
	decisions: Pick<Decision, "id">[];
	challenges: Pick<Challenge, "id">[];
	features: ShowcaseFeature[];
	changelog: ChangelogEntry[];
	manifest: ShotManifest;
	/** Metadata text of pages to length-check (titles without the template, descriptions). */
	metadata?: { where: string; title: string; description: string }[];
};

function isRealDate(d: string): boolean {
	if (!DATE.test(d)) return false;
	const t = new Date(`${d}T00:00:00Z`);
	return !Number.isNaN(t.getTime()) && t.toISOString().startsWith(d);
}

function shotsOf(f: ShowcaseFeature): { where: string; shot: Shot }[] {
	const out: { where: string; shot: Shot }[] = [];
	if (f.cardShot) out.push({ where: `${f.slug}.cardShot`, shot: f.cardShot });
	for (const s of f.walkthrough ?? []) s.shots.forEach((shot, i) => out.push({ where: `${f.slug}.walkthrough.${s.id}[${i}]`, shot }));
	for (const [id, h] of Object.entries(f.highlights ?? [])) h?.shots?.forEach((shot, i) => out.push({ where: `${f.slug}.highlights.${id}[${i}]`, shot }));
	f.versions?.forEach((v, i) => {
		if (v.before) out.push({ where: `${f.slug}.versions[${i}].before`, shot: v.before });
		if (v.after) out.push({ where: `${f.slug}.versions[${i}].after`, shot: v.after });
	});
	return out;
}

export function checkCaseStudyIntegrity(d: CaseStudyData): string[] {
	const errors: string[] = [];
	const dup = (label: string, ids: string[]) => {
		const seen = new Set<string>();
		for (const id of ids) {
			if (seen.has(id)) errors.push(`duplicate ${label}: ${id}`);
			seen.add(id);
		}
		return seen;
	};
	const decisionIds = dup("decision id", d.decisions.map((x) => x.id));
	const challengeIds = dup("challenge id", d.challenges.map((x) => x.id));
	const slugs = dup("feature slug", d.features.map((f) => f.slug));

	const dates: ISODate[] = [d.hubUpdated];
	const checkDate = (where: string, v: string) => {
		if (!isRealDate(v)) errors.push(`${where}: "${v}" is not a YYYY-MM-DD date`);
		else dates.push(v);
	};
	checkDate("caseStudy.updated", d.hubUpdated);

	for (const f of d.features) {
		checkDate(`${f.slug}.updated`, f.updated);
		for (const id of f.decisions ?? []) if (!decisionIds.has(id)) errors.push(`${f.slug}: unknown decision id "${id}"`);
		for (const id of f.challenges ?? []) if (!challengeIds.has(id)) errors.push(`${f.slug}: unknown challenge id "${id}"`);
		for (const s of f.related ?? []) if (!slugs.has(s)) errors.push(`${f.slug}: unknown related slug "${s}"`);
		for (const r of f.results ?? []) checkDate(`${f.slug}.results "${r.label}"`, r.measured);
		for (const u of f.underTheHood ?? []) checkDate(`${f.slug}.underTheHood "${u.label}"`, u.verified);
		for (const s of f.walkthrough ?? []) if (s.liveHref && !s.liveHref.startsWith("/")) errors.push(`${f.slug}.walkthrough.${s.id}: liveHref must start with "/"`);
		for (const { where, shot } of shotsOf(f)) {
			if (!d.manifest[shot.file]) errors.push(`${where}: shot "${shot.file}" is not in shots-manifest.json`);
			if (!shot.alt.trim()) errors.push(`${where}: shot has no alt text`);
		}
	}
	for (const c of d.changelog) {
		checkDate(`changelog "${c.text.slice(0, 30)}"`, c.date);
		if (c.feature && !slugs.has(c.feature)) errors.push(`changelog ${c.date}: unknown feature slug "${c.feature}"`);
		for (const file of c.shots ?? []) if (!d.manifest[file]) errors.push(`changelog ${c.date}: shot "${file}" is not in shots-manifest.json`);
	}
	for (const [file, m] of Object.entries(d.manifest)) {
		if (!isRealDate(m.captured)) errors.push(`manifest ${file}: bad captured date`);
		if (!(m.width > 0 && m.height > 0)) errors.push(`manifest ${file}: bad size`);
	}
	const newest = dates.filter(isRealDate).sort().at(-1);
	if (newest && isRealDate(d.hubUpdated) && d.hubUpdated < newest) errors.push(`caseStudy.updated (${d.hubUpdated}) is older than the newest entry (${newest})`);

	for (const m of d.metadata ?? []) {
		if ((m.title + TITLE_TEMPLATE).length > 60) errors.push(`${m.where}: title is ${(m.title + TITLE_TEMPLATE).length} characters with the template (max 60)`);
		if (m.description.length > 155) errors.push(`${m.where}: description is ${m.description.length} characters (max 155)`);
	}
	return errors;
}

/** Throws (fails `next build`) when anything is inconsistent. */
export function assertCaseStudyIntegrity(d: CaseStudyData): void {
	const errors = checkCaseStudyIntegrity(d);
	if (errors.length) throw new Error(`Case study integrity check failed:\n- ${errors.join("\n- ")}`);
}
