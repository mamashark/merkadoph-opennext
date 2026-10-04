import Image from "next/image";
import Link from "next/link";
import { availability, formatMoney, priceInfo, type Currency } from "@/lib/pricing";
import type { ProductCard as ProductCardData } from "@/lib/shop";
import { cn } from "@/lib/ui";

export function Price({ product, currency, size = "md" }: { product: Parameters<typeof priceInfo>[0]; currency: Currency; size?: "md" | "lg" }) {
	const { price, regular, onSale } = priceInfo(product);
	if (price == null) return <span className="text-sm text-stone-600 dark:text-stone-400">Price on request</span>;
	return (
		<span className={cn("inline-flex flex-wrap items-baseline gap-x-2", size === "lg" ? "text-3xl" : "text-base")}>
			<span className={cn("font-semibold", onSale ? "text-orange-700 dark:text-orange-400" : "text-stone-950 dark:text-white")}>{formatMoney(price, currency)}</span>
			{onSale && (
				<s className={cn("text-stone-600 dark:text-stone-400", size === "lg" ? "text-lg" : "text-sm")}>
					<span className="sr-only">Regular price </span>
					{formatMoney(regular, currency)}
				</s>
			)}
		</span>
	);
}

/** Product tile for shop grids. Whole card is a link. */
export function ProductCard({ product, currency, priority = false, headingLevel = "h2" }: { product: ProductCardData; currency: Currency; priority?: boolean; headingLevel?: "h2" | "h3" }) {
	const { onSale, percentOff } = priceInfo(product);
	const soldOut = availability(product) === "outofstock";
	const Heading = headingLevel;
	return (
		<article className="group relative flex flex-col overflow-hidden rounded-2xl border border-amber-900/10 bg-white shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-stone-900">
			<div className="relative aspect-square overflow-hidden bg-[#f4ebd9] dark:bg-stone-800">
				{product.cover_image_url ? (
					<Image
						src={product.cover_image_url}
						alt={product.cover_image_alt ?? product.title}
						fill
						sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
						loading={priority ? "eager" : "lazy"}
						fetchPriority={priority ? "high" : undefined}
						className={cn("object-cover transition duration-500 group-hover:scale-[1.03]", soldOut && "opacity-60")}
					/>
				) : (
					<div className="flex h-full items-center justify-center text-xs font-semibold tracking-widest text-amber-900/40 dark:text-stone-600" aria-hidden>
						MERKADO PH
					</div>
				)}
				<div className="absolute left-2 top-2 flex flex-col items-start gap-1">
					{onSale && percentOff > 0 && <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-bold text-white">−{percentOff}%</span>}
					{soldOut && <span className="rounded-full bg-stone-900/85 px-2 py-0.5 text-xs font-semibold text-white">Sold out</span>}
				</div>
			</div>
			<div className="flex flex-1 flex-col p-4">
				{product.categories[0] && <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">{product.categories[0].name}</p>}
				<Heading className="mt-1 line-clamp-2 font-semibold leading-snug text-stone-950 dark:text-white">
					<Link href={`/product/${product.slug}`} className="after:absolute after:inset-0 focus:outline-none focus-visible:underline">
						{product.title}
					</Link>
				</Heading>
				<div className="mt-auto pt-3">
					<Price product={product} currency={currency} />
				</div>
			</div>
		</article>
	);
}
