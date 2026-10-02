import Image from "next/image";

export default function Home() {
	return (
		<main
			className="relative flex h-dvh w-full flex-col items-center justify-between overflow-hidden bg-[#ddb989] bg-[url('/underconstruction-site.jpg')] bg-no-repeat bg-center bg-size-[100%_auto] px-4 py-8 sm:py-12"
		>
			<Image
				src="/logo.webp"
				alt="Merkado PH"
				width={600}
				height={188}
				priority
				className="h-auto w-[220px] sm:w-[320px]"
			/>

			<div className="rounded-full bg-white/85 px-6 py-3 text-center shadow-lg backdrop-blur-sm sm:px-10 sm:py-4">
				<p className="text-lg font-semibold text-[#2f2a1f] sm:text-2xl">Merkado PH: Bagong Yugto, coming soon! Abangan!</p>
			</div>
		</main>
	);
}
