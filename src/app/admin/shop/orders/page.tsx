import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { adminListOrders, type OrderStatus } from "@/lib/shop-admin";
import { ORDER_LABELS, ORDER_TONES, PAYMENT_LABELS, PAYMENT_TONES } from "@/components/admin/order-status";
import { pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { formatMoney, type Currency } from "@/lib/pricing";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState } from "@/components/admin/row-actions";
import { Badge } from "@/components/admin/status-badge";
import { FlashMessage } from "@/components/ui/alert";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Orders" };

const PER_PAGE = 20;

export default async function OrdersPage({ searchParams }: PageProps<"/admin/shop/orders">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), status: param(params, "status"), payment: param(params, "payment"), method: param(params, "method"), sort: param(params, "sort") };
	const page = pageParam(params);
	const { rows, total } = await adminListOrders({ ...values, page, perPage: PER_PAGE });
	const filtered = !!(values.q || values.status || values.payment || values.method);

	return (
		<>
			<PageHeader
				title="Orders"
				description="Order requests from checkout. Contact the customer to arrange payment and delivery, then update the status."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Shop", href: "/admin/shop" }, { label: "Orders" }]}
			/>
			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />
				<div className={`${cardClass} overflow-hidden`}>
					<ListToolbar
						basePath="/admin/shop/orders"
						values={values}
						searchPlaceholder="Search name, email or order #…"
						filters={[
							{
								name: "status",
								label: "Status",
								options: [{ label: "All statuses", value: "" }, ...(Object.keys(ORDER_LABELS) as OrderStatus[]).map((s) => ({ label: ORDER_LABELS[s], value: s }))],
							},
							{
								name: "payment",
								label: "Payment",
								options: [
									{ label: "Any payment", value: "" },
									{ label: "Paid", value: "paid" },
									{ label: "Unpaid", value: "unpaid" },
									{ label: "Failed / cancelled", value: "failed" },
									{ label: "Refunded", value: "refunded" },
								],
							},
							{
								name: "method",
								label: "Method",
								options: [
									{ label: "Any method", value: "" },
									{ label: "Pay later", value: "manual" },
									{ label: "Stripe", value: "stripe" },
									{ label: "PayPal", value: "paypal" },
								],
							},
						]}
						sorts={[
							{ label: "Newest first", value: "" },
							{ label: "Oldest first", value: "oldest" },
							{ label: "Order number", value: "number" },
							{ label: "Total (high first)", value: "total-desc" },
							{ label: "Total (low first)", value: "total-asc" },
						]}
					/>
					{rows.length === 0 ? (
						<EmptyState icon={ShoppingCart} title={filtered ? "No orders match" : "No orders yet"} description={filtered ? "Try a different search or filter." : "Orders placed at checkout appear here."} />
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
									<tr>
										<th scope="col" className="px-4 py-3">
											Order
										</th>
										<th scope="col" className="px-4 py-3">
											Customer
										</th>
										<th scope="col" className="hidden px-4 py-3 md:table-cell">
											Date
										</th>
										<th scope="col" className="px-4 py-3">
											Status
										</th>
										<th scope="col" className="px-4 py-3 text-right">
											Total
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
									{rows.map((o) => (
										<tr key={o.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
											<td className="px-4 py-3">
												<Link href={`/admin/shop/orders/${o.id}`} className="font-semibold text-teal-700 hover:underline dark:text-teal-300">
													#{o.order_number}
												</Link>
												<p className="text-xs text-slate-600 dark:text-slate-400">
													{o.items.reduce((n, i) => n + i.quantity, 0)} item{o.items.reduce((n, i) => n + i.quantity, 0) === 1 ? "" : "s"}
												</p>
											</td>
											<td className="px-4 py-3">
												<p className="font-medium text-slate-900 dark:text-white">{o.customer_name}</p>
												<p className="text-xs text-slate-600 dark:text-slate-400">{o.email}</p>
											</td>
											<td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400 md:table-cell">
												{formatDate(o.created_at, { dateStyle: "medium", timeStyle: "short" })}
											</td>
											<td className="px-4 py-3">
												<div className="flex flex-wrap gap-1">
													<Badge tone={ORDER_TONES[o.status]}>{ORDER_LABELS[o.status]}</Badge>
													<Badge tone={PAYMENT_TONES[o.payment_status] ?? "neutral"}>{PAYMENT_LABELS[o.payment_method] ?? o.payment_method} · {o.payment_status}</Badge>
												</div>
											</td>
											<td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{formatMoney(o.subtotal, o.currency as Currency)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/shop/orders" params={listParams(values)} />
			</div>
		</>
	);
}
