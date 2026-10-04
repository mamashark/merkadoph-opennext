"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { cart, type CartLine } from "@/lib/cart";

type Props = Omit<CartLine, "quantity"> & { available: boolean };

/** Quantity stepper + Add to cart. The rest of the product page stays server-rendered. */
export function AddToCart({ available, ...line }: Props) {
	const [qty, setQty] = useState(1);
	const [added, setAdded] = useState(false);
	const max = line.max ?? 99;

	if (!available || line.price == null) {
		return (
			<p className="rounded-xl border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 dark:border-stone-700 dark:text-stone-300">
				{line.price == null ? "Contact us for pricing." : "Currently out of stock."}
			</p>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="inline-flex h-12 items-center rounded-xl border border-stone-300 dark:border-stone-700">
				<button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="flex h-full w-11 items-center justify-center disabled:opacity-40" aria-label="Decrease quantity">
					<Minus className="h-4 w-4" aria-hidden />
				</button>
				<label htmlFor="qty" className="sr-only">
					Quantity
				</label>
				<input
					id="qty"
					type="number"
					min={1}
					max={max}
					value={qty}
					onChange={(e) => setQty(Math.max(1, Math.min(max, Math.floor(Number(e.target.value)) || 1)))}
					className="h-full w-12 bg-transparent text-center text-sm font-semibold [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
				/>
				<button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} className="flex h-full w-11 items-center justify-center disabled:opacity-40" aria-label="Increase quantity">
					<Plus className="h-4 w-4" aria-hidden />
				</button>
			</div>
			<button
				type="button"
				onClick={() => {
					cart.add(line, qty);
					setAdded(true);
					setTimeout(() => setAdded(false), 2500);
				}}
				className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200 sm:flex-none"
			>
				{added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingBag className="h-4 w-4" aria-hidden />}
				{added ? "Added to cart" : "Add to cart"}
			</button>
			<p role="status" className="w-full text-sm text-teal-800 dark:text-teal-300">
				{added && (
					<>
						Added {qty} to your cart.{" "}
						<Link href="/cart" className="font-semibold underline underline-offset-2">
							View cart
						</Link>
					</>
				)}
			</p>
		</div>
	);
}
