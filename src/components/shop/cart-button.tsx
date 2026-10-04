"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";

/** Header cart link with item count. */
export function CartButton() {
	const { count } = useCart();
	return (
		<Link
			href="/cart"
			className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-700 hover:bg-stone-900/5 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white"
			aria-label={count ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart, empty"}
		>
			<ShoppingBag className="h-5 w-5" aria-hidden />
			{count > 0 && (
				<span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
					{count > 99 ? "99+" : count}
				</span>
			)}
		</Link>
	);
}
