import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { PortfolioSummary } from "@/lib/portfolio";
import { PortfolioImageGrid } from "./image-grid";
import { PortfolioShowcase } from "./showcase";

/** Images per project on the homepage; the rest are on the project page. */
const HOME_IMAGES = 8;

/**
 * Homepage portfolio content: every project's panel is rendered on the server (crawlable, no layout
 * shift); the client island only switches between them. Projects arrive newest first, so the newest is
 * selected by default.
 */
export function PortfolioHomeShowcase({ projects }: { projects: PortfolioSummary[] }) {
	const panels = projects.map((p) => (
		<div key={p.id}>
			<div className="mb-5 flex flex-wrap items-end justify-between gap-3">
				<div className="min-w-0">
					<h3 className="text-xl font-semibold text-stone-950 dark:text-white sm:text-2xl">{p.title}</h3>
					{p.location && (
						<p className="mt-1 inline-flex items-center gap-1 text-sm text-stone-600 dark:text-stone-400">
							<MapPin className="h-4 w-4" aria-hidden /> {p.location}
						</p>
					)}
					{p.excerpt && <p className="mt-2 max-w-2xl text-stone-700 dark:text-stone-300">{p.excerpt}</p>}
				</div>
				<Link
					href={`/portfolio/${p.slug}`}
					className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-stone-950 dark:hover:bg-teal-400"
				>
					View project<span className="sr-only">: {p.title}</span> <ArrowRight className="h-4 w-4" aria-hidden />
				</Link>
			</div>
			<PortfolioImageGrid images={p.images.slice(0, HOME_IMAGES)} viewerImages={p.images} title={p.title} />
			{p.images.length > HOME_IMAGES && (
				<p className="mt-4 text-sm">
					<Link href={`/portfolio/${p.slug}`} className="font-semibold text-teal-800 hover:underline dark:text-teal-300">
						See all {p.images.length} photos
					</Link>
				</p>
			)}
		</div>
	));
	return <PortfolioShowcase titles={projects.map((p) => p.title)} panels={panels} />;
}
