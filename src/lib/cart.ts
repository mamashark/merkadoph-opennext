"use client";

import { useSyncExternalStore } from "react";

/**
 * Browser-side cart (localStorage). Prices here are for display only — checkout re-reads
 * every price and stock level from the database before an order is created.
 */
export type CartLine = { id: string; slug: string; title: string; price: number | null; image: string | null; quantity: number; max: number | null };

const KEY = "mph-cart-v1";
const EVENT = "mph-cart-change";
const EMPTY: CartLine[] = [];
let cache: { raw: string | null; lines: CartLine[] } = { raw: null, lines: EMPTY };

function read(): CartLine[] {
	let raw: string | null = null;
	try {
		raw = window.localStorage.getItem(KEY);
	} catch {
		return EMPTY;
	}
	if (raw === cache.raw) return cache.lines;
	let lines: CartLine[] = EMPTY;
	try {
		const parsed = JSON.parse(raw ?? "[]");
		lines = Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.id === "string" && Number.isInteger(l.quantity) && l.quantity > 0) : EMPTY;
	} catch {
		lines = EMPTY;
	}
	cache = { raw, lines };
	return lines;
}

function write(lines: CartLine[]) {
	try {
		window.localStorage.setItem(KEY, JSON.stringify(lines));
	} catch {
		// Private mode / storage full: the cart just won't persist.
	}
	window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
	const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
	window.addEventListener(EVENT, onChange);
	window.addEventListener("storage", onStorage); // other tabs
	return () => {
		window.removeEventListener(EVENT, onChange);
		window.removeEventListener("storage", onStorage);
	};
}

export function useCart() {
	const lines = useSyncExternalStore(subscribe, read, () => EMPTY);
	const count = lines.reduce((n, l) => n + l.quantity, 0);
	const subtotal = lines.reduce((sum, l) => sum + (l.price ?? 0) * l.quantity, 0);
	return { lines, count, subtotal };
}

const clamp = (qty: number, max: number | null) => Math.max(1, Math.min(max ?? 99, Math.min(99, Math.floor(qty))));

export const cart = {
	add(line: Omit<CartLine, "quantity">, quantity = 1) {
		const lines = read();
		const existing = lines.find((l) => l.id === line.id);
		const next = existing
			? lines.map((l) => (l.id === line.id ? { ...l, ...line, quantity: clamp(l.quantity + quantity, line.max) } : l))
			: [...lines, { ...line, quantity: clamp(quantity, line.max) }];
		write(next);
	},
	setQuantity(id: string, quantity: number) {
		write(read().map((l) => (l.id === id ? { ...l, quantity: clamp(quantity, l.max) } : l)));
	},
	remove(id: string) {
		write(read().filter((l) => l.id !== id));
	},
	clear() {
		write([]);
	},
};
