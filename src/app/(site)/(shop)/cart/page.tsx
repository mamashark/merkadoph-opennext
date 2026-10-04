import type { Metadata } from "next";
import { getShopSettings } from "@/lib/shop";
import { param } from "@/lib/content";
import { CartView } from "@/components/shop/cart-view";

export const metadata: Metadata = {
	title: "Your cart",
	description: "Review the items in your Merkado PH cart.",
	robots: { index: false, follow: false },
};

export default async function CartPage({ searchParams }: PageProps<"/cart">) {
	const [settings, params] = await Promise.all([getShopSettings(), searchParams]);
	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<h1 className="mb-8 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white">Your cart</h1>
			{param(params, "payment") === "cancelled" && (
				<p role="status" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
					Payment cancelled — nothing was charged. Your cart is still here whenever you&apos;re ready.
				</p>
			)}
			<CartView currency={settings.currency} />
		</main>
	);
}
