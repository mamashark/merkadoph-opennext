/* Wires the case-study content into the build-time integrity check (src/lib/case-study/integrity.ts). Called from generateStaticParams. */
import { caseStudy } from "../case-study-content";
import { FEATURES, featureMetaTitle } from "./features";
import { assertCaseStudyIntegrity } from "./integrity";
import manifest from "./shots-manifest.json";
import type { ChangelogEntry, ShotManifest } from "./types";

/** Phase 5 adds the changelog (src/lib/case-study/changelog.ts). */
const CHANGELOG: ChangelogEntry[] = [];

export function caseStudyIntegrity() {
	assertCaseStudyIntegrity({
		hubUpdated: caseStudy.updated,
		decisions: caseStudy.decisions,
		challenges: caseStudy.challenges,
		features: FEATURES,
		changelog: CHANGELOG,
		manifest: manifest as ShotManifest,
		metadata: FEATURES.map((f) => ({ where: `/case-study/${f.slug}`, title: featureMetaTitle(f), description: f.summary })),
	});
}
