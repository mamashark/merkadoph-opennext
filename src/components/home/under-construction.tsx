import Image from "next/image";

/** The public "coming soon" homepage shown on the deployed site until the new homepage launches. */
export function UnderConstruction() {
	return (
		<main className="relative flex h-dvh w-full flex-col items-center justify-between overflow-hidden bg-[#ddb989] px-4 py-8 sm:py-12">
			{/* Optimized (AVIF/WebP, responsive) background that scales with the viewport width. */}
			<Image
				src="/underconstruction-site.jpg"
				alt="Two Merkado PH team members fitting puzzle pieces together"
				width={2752}
				height={1536}
				preload
				sizes="100vw"
				className="pointer-events-none absolute left-0 top-1/2 h-auto w-full -translate-y-1/2 select-none"
			/>

			<h1 className="relative">
				<Image src="/logo.webp" alt="Merkado PH" width={600} height={188} loading="eager" className="h-auto w-55 sm:w-80" />
			</h1>

			<div className="relative rounded-full bg-white/90 px-6 py-3 text-center shadow-lg backdrop-blur-sm sm:px-10 sm:py-4">
				<p className="text-lg font-semibold text-[#2f2a1f] sm:text-2xl">Merkado PH: Bagong Yugto, coming soon! Abangan!</p>
			</div>
		</main>
	);
}
