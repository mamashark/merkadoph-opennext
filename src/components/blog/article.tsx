import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Markdown } from "@/components/blog/markdown";
import type { BlogPhoto } from "@/lib/blog-layout";

/*
 * Blog post layout (approved mock-up: local/design/blog-layout-mockup.html, Kay 2026-11-24).
 * Text sits in a 42rem reading column; Layout A's header photo and Layout B's pair run full width.
 * Labels (kicker, date line) use IBM Plex Mono via the `--font-plex-mono` variable set on the article.
 */

const MONO = "font-[family-name:var(--font-plex-mono)]";
/** The reading column, shared by the header and every text part. */
const COLUMN = "mx-auto w-full max-w-[42rem] px-4 sm:px-8";

export function ArticleHeader({ kicker, title, dek, children }: { kicker?: string | null; title: string; dek?: string | null; children?: React.ReactNode }) {
	return (
		<header className={`${COLUMN} pt-8 pb-7 sm:pt-14`}>
			<Link href="/blogs" className="inline-flex min-h-11 items-center gap-1.5 font-label text-xs font-medium tracking-[0.14em] text-site-muted uppercase hover:text-site-ink">
				<ArrowLeft className="h-4 w-4" aria-hidden /> All stories
			</Link>
			{kicker && <p className={`${MONO} kicker-mark mt-6 mb-3.5 text-xs font-medium tracking-[0.14em] text-accent uppercase`}>{kicker}</p>}
			<h1 className={`${kicker ? "" : "mt-6 "}text-[clamp(2rem,7vw,3.75rem)] leading-[1.04] font-bold tracking-tight text-balance text-site-ink`}>{title}</h1>
			{dek && <p className="mt-4 text-lg leading-snug text-site-ink-2 sm:text-[1.375rem]">{dek}</p>}
			{children && <div className={`${MONO} mt-5 text-[13px] text-site-muted`}>{children}</div>}
		</header>
	);
}

function Caption({ text, wide = false }: { text?: string | null; wide?: boolean }) {
	if (!text) return null;
	return <figcaption className={`px-4 pt-2.5 text-sm leading-normal text-site-muted sm:px-8 ${wide ? "mx-auto max-w-6xl" : ""}`}>{text}</figcaption>;
}

/** Layout A: one photo, edge to edge under the title (16:8; 4:3 on phones). It's the page's largest paint, so it loads first. */
export function HeaderPhoto({ photo }: { photo: BlogPhoto }) {
	return (
		<figure className="m-0 w-full">
			<div className="relative aspect-[4/3] w-full bg-site-sunken sm:aspect-[16/8]">
				<Image src={photo.url} alt={photo.alt} fill loading="eager" fetchPriority="high" sizes="100vw" className="object-cover" />
			</div>
			<Caption text={photo.caption} wide />
		</figure>
	);
}

/** Layout B: two photos side by side, edge to edge, each with its caption (4:5; stacked at 4:3 on phones). */
export function PhotoPair({ photos }: { photos: BlogPhoto[] }) {
	if (photos.length < 2) return null;
	return (
		<div role="group" aria-label="Two photos" className="mt-11 grid gap-5 sm:grid-cols-2 sm:gap-1">
			{photos.slice(0, 2).map((p, i) => (
				<figure key={`${p.url}-${i}`} className="m-0">
					<div className="relative aspect-[4/3] w-full bg-site-sunken sm:aspect-[4/5]">
						<Image src={p.url} alt={p.alt} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
					</div>
					<Caption text={p.caption} />
				</figure>
			))}
		</div>
	);
}

/** One run of the article text, in the reading column. */
export function ArticleText({ content }: { content: string }) {
	return (
		<div className={`${COLUMN} prose-article pt-9`}>
			<Markdown content={content} />
		</div>
	);
}
