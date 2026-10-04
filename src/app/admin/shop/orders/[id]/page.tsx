import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { updateOrderStatus } from "../../actions";
import { ORDER_LABELS, ORDER_TONES, PAYMENT_LABELS, PAYMENT_TONES } from "@/components/admin/order-status";
import { requireAdmin } from "@/lib/auth";
import { adminGetOrder, type OrderStatus } from "@/lib/shop-admin";
import { formatDate } from "@/lib/datetime";
import { formatMoney, type Currency } from "@/lib/pricing";
import { PageHeader } from "@/components/admin/page-header";
import { UUID } from "@/components/admin/form-parts";
import { Badge } from "@/components/admin/status-badge";
import { FlashMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { cardClass, inputClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: PageProps<"/admin/shop/orders/[id]">) {
	await requireAdmin();
	const { id } = await params;
	const { notice, error } = await searchParams;
	if (!UUID.test(id)) notFound();
	const order = await adminGetOrder(id);
	if (!order) notFound();
	const currency = order.currency as Currency;
	const address = [order.address_line1, order.address_line2, [order.postal_code, order.city].filter(Boolean).join(" "), order.country].filter(Boolean);

	return (
		<>
			<PageHeader
				title={`Order #${order.order_number}`}
				description={`Placed ${formatDate(order.created_at, { dateStyle: "full", timeStyle: "short" })}`}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Shop", href: "/admin/shop" },
					{ label: "Orders", href: "/admin/shop/orders" },
					{ label: `#${order.order_number}` },
				]}
				actions={<Badge tone={ORDER_TONES[order.status]}>{ORDER_LABELS[order.status]}</Badge>}
			/>
			<div className="space-y-4">
				<FlashMessage notice={typeof notice === "string" ? notice : undefined} error={typeof error === "string" ? error : undefined} />
				<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
					<section className={`${cardClass} overflow-hidden`}>
						<h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-white">Items</h2>
						<table className="w-full text-left text-sm">
							<thead className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
								<tr>
									<th scope="col" className="px-5 py-2">
										Product
									</th>
									<th scope="col" className="px-5 py-2 text-right">
										Qty
									</th>
									<th scope="col" className="px-5 py-2 text-right">
										Price
									</th>
									<th scope="col" className="px-5 py-2 text-right">
										Total
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
								{order.items.map((i) => (
									<tr key={i.product_id}>
										<td className="px-5 py-3">
											<Link href={`/admin/shop/products/${i.product_id}/edit`} className="font-medium text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300">
												{i.title}
											</Link>
											{i.sku && <p className="font-mono text-xs text-slate-600 dark:text-slate-400">SKU {i.sku}</p>}
										</td>
										<td className="px-5 py-3 text-right">{i.quantity}</td>
										<td className="px-5 py-3 text-right">{formatMoney(i.unit_price, currency)}</td>
										<td className="px-5 py-3 text-right font-medium">{formatMoney(i.line_total, currency)}</td>
									</tr>
								))}
							</tbody>
							<tfoot>
								<tr className="border-t border-slate-200 dark:border-slate-800">
									<th scope="row" colSpan={3} className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">
										Subtotal
									</th>
									<td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatMoney(order.subtotal, currency)}</td>
								</tr>
							</tfoot>
						</table>
						{order.notes && (
							<div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
								<p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Customer note</p>
								<p className="mt-1 whitespace-pre-line text-sm text-slate-800 dark:text-slate-200">{order.notes}</p>
							</div>
						)}
					</section>

					<aside className="space-y-6">
						<form action={updateOrderStatus} className={`${cardClass} space-y-3 p-5`}>
							<input type="hidden" name="id" value={order.id} />
							<label htmlFor="status" className="block text-sm font-semibold text-slate-900 dark:text-white">
								Status
							</label>
							<select id="status" name="status" defaultValue={order.status} className={inputClass}>
								{(Object.keys(ORDER_LABELS) as OrderStatus[]).map((s) => (
									<option key={s} value={s}>
										{ORDER_LABELS[s]}
									</option>
								))}
							</select>
							<SubmitButton pendingLabel="Saving…" className="w-full">
								Update status
							</SubmitButton>
						</form>

						<section className={`${cardClass} space-y-2 p-5 text-sm`}>
							<h2 className="font-semibold text-slate-900 dark:text-white">Payment</h2>
							<dl className="space-y-1.5">
								<div className="flex justify-between gap-3">
									<dt className="text-slate-600 dark:text-slate-400">Method</dt>
									<dd className="text-slate-900 dark:text-white">{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</dd>
								</div>
								<div className="flex justify-between gap-3">
									<dt className="text-slate-600 dark:text-slate-400">Status</dt>
									<dd>
										<Badge tone={PAYMENT_TONES[order.payment_status] ?? "neutral"}>{order.payment_status}</Badge>
									</dd>
								</div>
								{order.paid_at && (
									<div className="flex justify-between gap-3">
										<dt className="text-slate-600 dark:text-slate-400">Paid</dt>
										<dd className="text-slate-900 dark:text-white">{formatDate(order.paid_at, { dateStyle: "medium", timeStyle: "short" })}</dd>
									</div>
								)}
								{order.payment_reference && (
									<div className="flex justify-between gap-3">
										<dt className="text-slate-600 dark:text-slate-400">Reference</dt>
										<dd className="truncate font-mono text-xs text-slate-900 dark:text-white" title={order.payment_reference}>
											{order.payment_reference}
										</dd>
									</div>
								)}
							</dl>
							{order.payment_method !== "manual" && order.payment_status === "paid" && (
								<p className="text-xs text-slate-600 dark:text-slate-400">Refunds are made in the {PAYMENT_LABELS[order.payment_method]} dashboard.</p>
							)}
						</section>

						<section className={`${cardClass} space-y-3 p-5 text-sm`}>
							<h2 className="font-semibold text-slate-900 dark:text-white">Customer</h2>
							<p className="font-medium text-slate-900 dark:text-white">{order.customer_name}</p>
							<a href={`mailto:${order.email}?subject=${encodeURIComponent(`Your order #${order.order_number}`)}`} className="flex items-center gap-2 text-teal-700 hover:underline dark:text-teal-300">
								<Mail className="h-4 w-4" aria-hidden /> {order.email}
							</a>
							{order.phone && (
								<a href={`tel:${order.phone.replace(/\s+/g, "")}`} className="flex items-center gap-2 text-teal-700 hover:underline dark:text-teal-300">
									<Phone className="h-4 w-4" aria-hidden /> {order.phone}
								</a>
							)}
							{address.length > 0 && (
								<p className="flex gap-2 text-slate-700 dark:text-slate-300">
									<MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
									<span>
										{address.map((l) => (
											<span key={l} className="block">
												{l}
											</span>
										))}
									</span>
								</p>
							)}
						</section>
					</aside>
				</div>
			</div>
		</>
	);
}
