/**
 * A post's video or reel: our own file in Supabase Storage, played with the browser's native player (no third-party
 * scripts or tracking). Framed upright (9:16) for reels; a landscape video sits letterboxed in the same frame.
 * Nothing downloads until the visitor presses play (preload="none"), so it costs the page nothing up front.
 */
export function Reel({ src, poster, transcript, title }: { src: string; poster?: string | null; transcript?: string | null; title: string }) {
	const type = src.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4";
	return (
		<section aria-labelledby="reel-heading" className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
			<div className="grid items-center gap-6 rounded-3xl bg-brand-olive p-4 text-stone-50 sm:p-6 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-10 md:p-8">
				<div className="mx-auto w-full max-w-[22rem] overflow-hidden rounded-2xl bg-black">
					<video
						controls
						playsInline
						preload={poster ? "none" : "metadata"}
						poster={poster ?? undefined}
						className="aspect-[9/16] max-h-[78svh] w-full object-contain"
						aria-label={`Video: ${title}`}
						aria-describedby={transcript ? "reel-transcript" : undefined}
					>
						<source src={src} type={type} />
						Your browser can&apos;t play this video.{" "}
						<a href={src} className="underline">
							Download it
						</a>
						.
					</video>
				</div>
				<div>
					<p className="text-xs font-semibold tracking-[0.14em] text-brand-yellow uppercase">Video</p>
					<h2 id="reel-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
						Panoorin
					</h2>
					<p className="mt-3 max-w-prose text-base text-stone-300">{title}</p>
					{transcript && (
						<details className="mt-6 max-w-prose rounded-xl border border-white/15 p-4 open:bg-white/5">
							<summary className="cursor-pointer font-medium text-brand-yellow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-yellow">Read the transcript</summary>
							<p id="reel-transcript" className="mt-3 whitespace-pre-line text-stone-300">
								{transcript}
							</p>
						</details>
					)}
				</div>
			</div>
		</section>
	);
}
