import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard, Rocket } from "lucide-react";
import type { ShopReadiness } from "@/lib/shop-status";
import { cn } from "@/lib/ui";

const tones = {
	live: "border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-100",
	ready: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100",
	"needs-payment": "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
	"live-without-payment": "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
} as const;

const linkClass = "font-semibold underline underline-offset-2 hover:no-underline";

/** Shop status banner: live, ready to launch, or needs a payment method first. */
export function ShopStatusAlert({ status, compact = false }: { status: ShopReadiness; compact?: boolean }) {
	const names = status.usable.map((m) => `${m.title}${m.mode === "test" && m.id !== "manual" ? " (test mode)" : ""}`).join(", ");
	const testMode = status.usable.some((m) => m.mode === "test" && m.id !== "manual");
	const Icon = status.state === "live" ? CheckCircle2 : status.state === "ready" ? Rocket : status.state === "needs-payment" ? CreditCard : AlertTriangle;

	return (
		<div role={status.state === "live-without-payment" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", tones[status.state])}>
			<Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
			<div className="min-w-0 space-y-1">
				{status.state === "live" && (
					<>
						<p className="font-semibold">The shop is live and taking orders.</p>
						{!compact && (
							<p>
								Customers can pay with: {names}.
								{testMode && " Test mode is on — no real money is charged. Switch to live keys before launch."}{" "}
								<Link href="/admin/shop/payments" className={linkClass}>
									Payment settings
								</Link>
							</p>
						)}
					</>
				)}
				{status.state === "ready" && (
					<>
						<p className="font-semibold">Payments are set up — the shop is ready to go live.</p>
						{!compact && (
							<p>
								Customers will be able to pay with: {names}.{" "}
								<Link href="/admin/shop" className={linkClass}>
									Turn on the shop
								</Link>
							</p>
						)}
					</>
				)}
				{status.state === "needs-payment" && (
					<>
						<p className="font-semibold">The shop is off. Choose and set up a payment method before it can be turned on.</p>
						<p>
							{status.paymentsReady ? (
								<>
									{status.incomplete.length > 0 && `${status.incomplete.map((m) => `${m.title} still needs its ${m.missing.join(" and ")}`).join("; ")}. `}
									<Link href="/admin/shop/payments" className={linkClass}>
										Set up payments
									</Link>{" "}
									(Stripe, PayPal or Pay later).
								</>
							) : (
								<>Run the payments SQL migration first, then set up a payment method in Shop → Payments.</>
							)}
						</p>
					</>
				)}
				{status.state === "live-without-payment" && (
					<>
						<p className="font-semibold">The shop is on, but no payment method is working — checkout is paused.</p>
						<p>
							Customers can browse but can&apos;t order.{" "}
							<Link href="/admin/shop/payments" className={linkClass}>
								Fix payment settings
							</Link>{" "}
							or turn the shop off.
						</p>
					</>
				)}
			</div>
		</div>
	);
}
