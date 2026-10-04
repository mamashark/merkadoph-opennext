import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { getOrderForCustomer } from "@/lib/orders";
import { formatMoney, type Currency } from "@/lib/pricing";
import { param } from "@/lib/content";
import { ClearCart } from "@/components/shop/clear-cart";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false, follow: false } };

/** Where customers land after paying (or placing a pay-later order via redirect flows). */
export default async function CheckoutCompletePage({ searchParams }: PageProps<"/checkout/complete">) {
	const params = await searchParams;
	const order = await getOrderForCustomer(param(params, "order"));
	if (!order) notFound();
	const state = param(params, "state");
	const paid = order.payment_status === "paid";
	const failed = order.payment_status === "failed" || state === "error" || state === "mismatch";
	const currency = order.currency as Currency;

	return (
		<main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
			{(paid || (!failed && state === "processing")) && <ClearCart />}
			<div
				role="status"
				className={
					paid
						? "rounded-2xl border border-teal-200 bg-teal-50 p-8 text-center text-teal-950 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-50"
						: failed
							? "rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-50"
							: "rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50"
				}
			>
				{paid ? <CheckCircle2 className="mx-auto h-10 w-10" aria-hidden /> : failed ? <AlertTriangle className="mx-auto h-10 w-10" aria-hidden /> : <Clock className="mx-auto h-10 w-10" aria-hidden />}
				<h1 className="mt-4 text-2xl font-semibold sm:text-3xl">
					{paid ? `Salamat! Order #${order.order_number} is paid.` : failed ? "We couldn't confirm your payment" : `Order #${order.order_number} received`}
				</h1>
				<p className="mt-3">
					{paid
						? `We've received ${formatMoney(order.subtotal, currency)}. A confirmation will be sent to ${order.email}, and we'll be in touch about delivery.`
						: failed
							? "No money was taken. Your cart is still saved — you can try again or pick another payment method."
							: `Your payment is being confirmed. We'll email ${order.email} as soon as it's through — no need to pay again.`}
				</p>
				<div className="mt-6 flex flex-wrap justify-center gap-3">
					{failed ? (
						<Link href="/checkout" className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900">
							Try again
						</Link>
					) : (
						<Link href="/shop" className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900">
							Continue shopping
						</Link>
					)}
					<Link href="/#contact" className="inline-flex h-11 items-center rounded-xl border border-current/20 px-5 text-sm font-semibold">
						Contact us
					</Link>
				</div>
			</div>
		</main>
	);
}
