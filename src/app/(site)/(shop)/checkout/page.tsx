import type { Metadata } from "next";
import { getShopSettings } from "@/lib/shop";
import { checkoutMethods } from "@/lib/payments";
import { CheckoutForm } from "@/components/shop/checkout-form";

export const metadata: Metadata = {
	title: "Checkout",
	description: "Place your Merkado PH order.",
	robots: { index: false, follow: false },
};

// Always fresh: payment options depend on Admin → Shop → Payments.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
	const [settings, methods] = await Promise.all([getShopSettings(), checkoutMethods()]);
	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<h1 className="mb-8 text-4xl font-semibold tracking-tight text-stone-900 dark:text-white">Checkout</h1>
			<CheckoutForm currency={settings.currency} note={settings.checkout_note} methods={methods.map(({ id, title, description, mode }) => ({ id, title, description, test: mode === "test" }))} />
		</main>
	);
}
