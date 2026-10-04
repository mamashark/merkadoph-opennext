"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { placeOrder, type CheckoutState } from "@/app/checkout-actions";
import { cart, useCart } from "@/lib/cart";
import { formatMoney, type Currency } from "@/lib/pricing";
import { cn } from "@/lib/ui";

const field =
	"block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-500 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-teal-400 dark:[color-scheme:dark]";
const label = "mb-1.5 block text-sm font-medium text-stone-800 dark:text-stone-200";

type Method = { id: "manual" | "stripe" | "paypal"; title: string; description: string; test: boolean };

export function CheckoutForm({ currency, note, methods }: { currency: Currency; note: string; methods: Method[] }) {
	const { lines, subtotal } = useCart();
	const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, { status: "idle" });
	const [startedAt] = useState(() => Date.now());
	const [method, setMethod] = useState<Method["id"] | "">(methods[0]?.id ?? "");
	const redirecting = state.status === "redirect" && !!state.redirectUrl;

	// Pay later: empty the cart once the order is in. Online payment: go to Stripe / PayPal
	// (the cart is cleared on the confirmation page, so it survives a cancelled payment).
	useEffect(() => {
		if (state.status === "success") cart.clear();
		if (state.status === "redirect" && state.redirectUrl) window.location.assign(state.redirectUrl);
	}, [state.status, state.redirectUrl]);

	if (state.status === "success" && state.order) {
		return (
			<div role="status" className="mx-auto max-w-xl rounded-2xl border border-teal-200 bg-teal-50 p-8 text-center text-teal-950 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-50">
				<CheckCircle2 className="mx-auto h-10 w-10" aria-hidden />
				<h2 className="mt-4 text-2xl font-semibold">Salamat! Order #{state.order.number} is in.</h2>
				<p className="mt-2">
					Total {formatMoney(state.order.total, state.order.currency as Currency)}. We&apos;ll email <strong>{state.order.email}</strong> to confirm payment and delivery.
				</p>
				<Link href="/shop" className="mt-6 inline-flex h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900">
					Back to the shop
				</Link>
			</div>
		);
	}

	if (!lines.length) {
		return (
			<p className="rounded-2xl border border-dashed border-amber-900/20 px-6 py-16 text-center text-stone-700 dark:border-white/15 dark:text-stone-300">
				Your cart is empty.{" "}
				<Link href="/shop" className="font-semibold text-teal-800 underline dark:text-teal-300">
					Browse the shop
				</Link>
			</p>
		);
	}

	const err = state.errors ?? {};
	const v = state.values;
	const problem = (id: string) => state.problems?.find((p) => p.id === id)?.message;

	return (
		<form key={JSON.stringify(v ?? {})} action={action} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
			<input type="hidden" name="items" value={JSON.stringify(lines.map((l) => ({ id: l.id, quantity: l.quantity })))} />
			<input type="hidden" name="started_at" value={startedAt} />
			<div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
				<label htmlFor="company">Company</label>
				<input id="company" name="company" tabIndex={-1} autoComplete="off" />
			</div>

			<div className="space-y-6">
				{state.status === "error" && state.message && (
					<p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
						{state.message}
					</p>
				)}
				<fieldset className="space-y-4 rounded-2xl border border-amber-900/10 bg-white p-6 dark:border-white/10 dark:bg-stone-900">
					<legend className="px-1 text-lg font-semibold text-stone-950 dark:text-white">Contact</legend>
					<div className="grid gap-4 sm:grid-cols-2">
						<Input id="name" label="Full name" autoComplete="name" defaultValue={v?.name} error={err.name} required />
						<Input id="email" label="Email" type="email" autoComplete="email" defaultValue={v?.email} error={err.email} required />
						<Input id="phone" label="Phone (optional)" type="tel" autoComplete="tel" defaultValue={v?.phone} />
					</div>
				</fieldset>
				<fieldset className="space-y-4 rounded-2xl border border-amber-900/10 bg-white p-6 dark:border-white/10 dark:bg-stone-900">
					<legend className="px-1 text-lg font-semibold text-stone-950 dark:text-white">Delivery address (Sweden)</legend>
					<Input id="address_line1" label="Street address" autoComplete="address-line1" defaultValue={v?.address_line1} error={err.address} required />
					<Input id="address_line2" label="Apartment, c/o (optional)" autoComplete="address-line2" defaultValue={v?.address_line2} />
					<div className="grid gap-4 sm:grid-cols-[160px_1fr]">
						<Input id="postal_code" label="Postal code" autoComplete="postal-code" defaultValue={v?.postal_code} error={err.postal} required />
						<Input id="city" label="City" autoComplete="address-level2" defaultValue={v?.city} error={err.city} required />
					</div>
					<div>
						<label htmlFor="notes" className={label}>
							Order notes (optional)
						</label>
						<textarea id="notes" name="notes" rows={3} maxLength={2000} defaultValue={v?.notes} className={field} />
					</div>
				</fieldset>
			</div>

			<aside className="rounded-2xl border border-amber-900/10 bg-white p-6 dark:border-white/10 dark:bg-stone-900 lg:sticky lg:top-24">
				<h2 className="text-lg font-semibold text-stone-950 dark:text-white">Your order</h2>
				<ul className="mt-4 divide-y divide-amber-900/10 text-sm dark:divide-white/10">
					{lines.map((l) => (
						<li key={l.id} className="py-3">
							<div className="flex justify-between gap-3">
								<span className="text-stone-800 dark:text-stone-200">
									{l.title} <span className="text-stone-600 dark:text-stone-400">× {l.quantity}</span>
								</span>
								<span className="font-medium text-stone-950 dark:text-white">{formatMoney((l.price ?? 0) * l.quantity, currency)}</span>
							</div>
							{problem(l.id) && (
								<p className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">
									{problem(l.id)}{" "}
									<Link href="/cart" className="underline">
										Fix in cart
									</Link>
								</p>
							)}
						</li>
					))}
				</ul>
				<div className="mt-2 flex justify-between border-t border-amber-900/10 pt-3 text-base font-semibold text-stone-950 dark:border-white/10 dark:text-white">
					<span>Subtotal</span>
					<span>{formatMoney(subtotal, currency)}</span>
				</div>
				{methods.length > 0 ? (
					<fieldset className="mt-5">
						<legend className="text-sm font-semibold text-stone-950 dark:text-white">Payment</legend>
						<div className="mt-2 space-y-2">
							{methods.map((m) => (
								<label
									key={m.id}
									className={cn(
										"flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition",
										method === m.id ? "border-teal-700 bg-teal-50/60 dark:border-teal-400 dark:bg-teal-950/40" : "border-stone-300 hover:border-stone-400 dark:border-stone-700",
									)}
								>
									<input type="radio" name="payment_method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="mt-0.5 h-4 w-4 accent-teal-700" />
									<span>
										<span className="flex flex-wrap items-center gap-2 font-medium text-stone-950 dark:text-white">
											{m.title}
											{m.test && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900 dark:bg-amber-900 dark:text-amber-100">Test mode</span>}
										</span>
										{(m.id === "manual" ? note || m.description : m.description) && (
											<span className="mt-0.5 block text-xs leading-relaxed text-stone-600 dark:text-stone-400">{m.id === "manual" ? note || m.description : m.description}</span>
										)}
									</span>
								</label>
							))}
						</div>
					</fieldset>
				) : (
					<p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
						Online ordering is paused right now. Please contact us to order.
					</p>
				)}
				<button
					type="submit"
					disabled={pending || redirecting || !methods.length}
					className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
				>
					{(pending || redirecting) && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
					{redirecting
						? "Redirecting to payment…"
						: pending
							? "Placing order…"
							: method === "stripe"
								? `Pay ${formatMoney(subtotal, currency)}`
								: method === "paypal"
									? "Continue to PayPal"
									: "Place order"}
				</button>
				{method !== "manual" && method && <p className="mt-2 text-center text-xs text-stone-600 dark:text-stone-400">You&apos;ll complete payment securely on {method === "stripe" ? "Stripe" : "PayPal"}.</p>}
			</aside>
		</form>
	);
}

function Input({ id, label: text, error, ...rest }: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
	return (
		<div>
			<label htmlFor={id} className={label}>
				{text}
			</label>
			<input id={id} name={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className={cn(field, error && "border-red-500")} {...rest} />
			{error && (
				<p id={`${id}-err`} className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">
					{error}
				</p>
			)}
		</div>
	);
}
