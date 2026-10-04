"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { cart, useCart } from "@/lib/cart";
import { formatMoney, type Currency } from "@/lib/pricing";

/** Cart page body (cart lives in the browser). */
export function CartView({ currency }: { currency: Currency }) {
	const { lines, count, subtotal } = useCart();

	if (!lines.length) {
		return (
			<div className="rounded-2xl border border-dashed border-amber-900/20 bg-white/60 px-6 py-20 text-center dark:border-white/15 dark:bg-stone-900/60">
				<ShoppingBag className="mx-auto h-10 w-10 text-stone-400" aria-hidden />
				<p className="mt-4 text-lg font-medium text-stone-800 dark:text-stone-200">Your cart is empty.</p>
				<Link href="/shop" className="mt-6 inline-flex h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900">
					Browse the shop
				</Link>
			</div>
		);
	}

	return (
		<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
			<ul className="divide-y divide-amber-900/10 rounded-2xl border border-amber-900/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-stone-900">
				{lines.map((l) => (
					<li key={l.id} className="flex gap-4 p-4">
						<div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f4ebd9] dark:bg-stone-800">
							{l.image && (
								// eslint-disable-next-line @next/next/no-img-element -- small cart thumbnail
								<img src={l.image} alt="" className="h-full w-full object-cover" />
							)}
						</div>
						<div className="min-w-0 flex-1">
							<Link href={`/product/${l.slug}`} className="font-semibold text-stone-950 hover:text-teal-800 dark:text-white dark:hover:text-teal-300">
								{l.title}
							</Link>
							<p className="text-sm text-stone-600 dark:text-stone-400">{formatMoney(l.price, currency)} each</p>
							<div className="mt-2 flex items-center gap-3">
								<div className="inline-flex h-9 items-center rounded-lg border border-stone-300 dark:border-stone-700">
									<button type="button" onClick={() => cart.setQuantity(l.id, l.quantity - 1)} disabled={l.quantity <= 1} className="flex h-full w-9 items-center justify-center disabled:opacity-40" aria-label={`Decrease quantity of ${l.title}`}>
										<Minus className="h-3.5 w-3.5" aria-hidden />
									</button>
									<span className="w-8 text-center text-sm font-semibold" aria-live="polite">
										{l.quantity}
									</span>
									<button
										type="button"
										onClick={() => cart.setQuantity(l.id, l.quantity + 1)}
										disabled={l.max != null && l.quantity >= l.max}
										className="flex h-full w-9 items-center justify-center disabled:opacity-40"
										aria-label={`Increase quantity of ${l.title}`}
									>
										<Plus className="h-3.5 w-3.5" aria-hidden />
									</button>
								</div>
								<button type="button" onClick={() => cart.remove(l.id)} className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-red-700 dark:text-stone-400 dark:hover:text-red-400">
									<Trash2 className="h-4 w-4" aria-hidden /> Remove
								</button>
							</div>
						</div>
						<p className="shrink-0 font-semibold text-stone-950 dark:text-white">{formatMoney((l.price ?? 0) * l.quantity, currency)}</p>
					</li>
				))}
			</ul>

			<aside className="rounded-2xl border border-amber-900/10 bg-white p-6 dark:border-white/10 dark:bg-stone-900">
				<h2 className="text-lg font-semibold text-stone-950 dark:text-white">Summary</h2>
				<dl className="mt-4 space-y-2 text-sm">
					<div className="flex justify-between text-stone-700 dark:text-stone-300">
						<dt>Items</dt>
						<dd>{count}</dd>
					</div>
					<div className="flex justify-between border-t border-amber-900/10 pt-2 text-base font-semibold text-stone-950 dark:border-white/10 dark:text-white">
						<dt>Subtotal</dt>
						<dd>{formatMoney(subtotal, currency)}</dd>
					</div>
				</dl>
				<p className="mt-2 text-xs text-stone-600 dark:text-stone-400">Delivery is arranged after you order. Final prices are confirmed at checkout.</p>
				<Link href="/checkout" className="mt-5 flex h-12 items-center justify-center rounded-xl bg-stone-900 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200">
					Continue to checkout
				</Link>
				<Link href="/shop" className="mt-3 block text-center text-sm font-medium text-teal-800 hover:underline dark:text-teal-300">
					Continue shopping
				</Link>
			</aside>
		</div>
	);
}
