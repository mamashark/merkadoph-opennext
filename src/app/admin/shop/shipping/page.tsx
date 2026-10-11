import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { deleteShippingMethod } from "./actions";
import { adminListShippingMethods } from "./data";
import { requireAdmin } from "@/lib/auth";
import { adminGetShopSettings } from "@/lib/shop-admin";
import { pageParam, param } from "@/lib/content";
import { formatMoney, type Currency } from "@/lib/pricing";
import { SHIPPING_TYPES, type ShippingMethod } from "@/server/shop/shipping";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState } from "@/components/admin/row-actions";
import { Badge } from "@/components/admin/status-badge";
import { Alert, FlashMessage } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { buttonClass, cardClass, dangerIconClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Shipping" };

const PER_PAGE = 20;

/** One-line price summary for the table. */
function priceSummary(m: ShippingMethod, currency: Currency) {
	const free = m.free_over != null ? ` · free over ${formatMoney(m.free_over, currency)}` : "";
	if (m.type === "pickup") return "Free";
	if (m.type === "weight_based") return `${m.weight_bands.map((b) => `≤${b.max_kg} kg ${formatMoney(b.price, currency)}`).join(", ")}${free}`;
	return `${formatMoney(m.price, currency)}${free}`;
}

export default async function ShippingPage({ searchParams }: PageProps<"/admin/shop/shipping">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), type: param(params, "type"), status: param(params, "status"), sort: param(params, "sort") };
	const page = pageParam(params);
	const returnTo = new URLSearchParams({ ...listParams(values), ...(page > 1 ? { page: String(page) } : {}) }).toString();

	let loadError = "";
	const [settings, { rows, total }] = await Promise.all([
		adminGetShopSettings(),
		adminListShippingMethods({ ...values, page, perPage: PER_PAGE }).catch((e: Error) => ((loadError = e.message), { rows: [] as ShippingMethod[], total: 0 })),
	]);
	const currency = settings.currency as Currency;
	const filtered = !!(values.q || values.type || values.status);

	return (
		<>
			<PageHeader
				title="Shipping"
				description="Delivery options customers can choose at checkout (Sweden)."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Shop", href: "/admin/shop" }, { label: "Shipping" }]}
				actions={
					<Link href="/admin/shop/shipping/new" className={buttonClass("primary")}>
						<Plus className="h-4 w-4" aria-hidden /> Add method
					</Link>
				}
			/>
			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />
				{loadError && (
					<Alert tone="error">
						Shipping isn&apos;t available yet ({loadError}). Run <code>supabase/migrations/20261011030000_shipping_tax.sql</code> in the Supabase SQL editor.
					</Alert>
				)}
				<div className={cardClass}>
					<ListToolbar
						basePath="/admin/shop/shipping"
						values={values}
						searchPlaceholder="Search shipping methods…"
						filters={[
							{ name: "type", label: "Type", options: [{ label: "All types", value: "" }, ...Object.entries(SHIPPING_TYPES).map(([value, label]) => ({ value, label }))] },
							{
								name: "status",
								label: "Status",
								options: [
									{ label: "All", value: "" },
									{ label: "Offered", value: "enabled" },
									{ label: "Hidden", value: "disabled" },
								],
							},
						]}
						sorts={[
							{ label: "Checkout order", value: "" },
							{ label: "Name A–Z", value: "title" },
							{ label: "Cheapest first", value: "price" },
							{ label: "Most expensive first", value: "price-desc" },
							{ label: "Newest", value: "newest" },
						]}
					/>
					{rows.length === 0 ? (
						<EmptyState
							icon={Truck}
							title={filtered ? "No methods match your filters" : "No shipping methods yet"}
							description={filtered ? "Try a different search or filter." : "Add home delivery, local delivery or pickup so customers can check out."}
						/>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-400">
									<tr>
										<th scope="col" className="px-4 py-2.5 font-medium">
											Method
										</th>
										<th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">
											Price
										</th>
										<th scope="col" className="px-4 py-2.5 font-medium">
											Status
										</th>
										<th scope="col" className="px-4 py-2.5 text-right font-medium">
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
									{rows.map((m) => (
										<tr key={m.id} className="align-top">
											<td className="px-4 py-3">
												<Link href={`/admin/shop/shipping/${m.id}`} className="font-medium text-slate-900 hover:underline dark:text-white">
													{m.title}
												</Link>
												<p className="text-xs text-slate-600 dark:text-slate-400">
													{SHIPPING_TYPES[m.type]}
													{m.type === "local_delivery" && ` · ${m.postcodes.length} postcode area(s)`}
												</p>
												<p className="mt-0.5 text-xs text-slate-700 md:hidden dark:text-slate-300">{priceSummary(m, currency)}</p>
											</td>
											<td className="hidden px-4 py-3 text-slate-700 md:table-cell dark:text-slate-300">{priceSummary(m, currency)}</td>
											<td className="px-4 py-3">
												<Badge tone={m.enabled ? "published" : "draft"}>{m.enabled ? "Offered" : "Hidden"}</Badge>
											</td>
											<td className="px-4 py-3">
												<div className="flex justify-end gap-1.5">
													<Link href={`/admin/shop/shipping/${m.id}`} aria-label={`Edit ${m.title}`} className={buttonClass("secondary", "sm")}>
														<Pencil className="h-3.5 w-3.5" aria-hidden />
													</Link>
													<form action={deleteShippingMethod}>
														<input type="hidden" name="id" value={m.id} />
														<input type="hidden" name="return" value={returnTo} />
														<ConfirmButton message={`Delete “${m.title}”?`} label={`Delete ${m.title}`} variant="secondary" size="sm" className={dangerIconClass}>
															<Trash2 className="h-3.5 w-3.5" aria-hidden />
														</ConfirmButton>
													</form>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/shop/shipping" params={listParams(values)} />
			</div>
		</>
	);
}
