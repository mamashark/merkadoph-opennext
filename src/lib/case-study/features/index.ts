import type { ShowcaseFeature } from "../types";
import { constellation } from "./constellation";

/** Every feature, flagship first. A feature has its own page iff it has a walkthrough (see `caseStudyPages`). */
export const FEATURES: ShowcaseFeature[] = [constellation];

export const featureBySlug = (slug: string) => FEATURES.find((f) => f.slug === slug);

/** Features that get a page at /case-study/<slug>. The sitemap and generateStaticParams both read this. */
export const caseStudyPages = () => FEATURES.filter((f) => f.walkthrough?.length);

/** The <title> and JSON-LD headline of a feature page (the site template adds " | Merkado PH"). */
export const featureMetaTitle = (f: ShowcaseFeature) => `${f.title} (Behind the Build)`;
