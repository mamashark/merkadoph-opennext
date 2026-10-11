import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Percent, Trash2 } from "lucide-react";
import { deleteTaxClass, saveTaxClass, saveTaxSettings } from "./actions";
import { adminTaxClasses, adminTaxSettings } from "./data";
import { requireAdmin } from "@/lib/auth";
import { pageParam, param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState } from "@/components/admin/row-actions";
import { Badge } from "@/components/admin/status-badge";
import { Alert, FlashMessage } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass, cardClass, cn, dangerIconClass, hintClass, inputClass, labelClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Tax (VAT)" };

const PER_PAGE = 20;

export default async function TaxPage({ searchParams }: PageProps<"/admin/shop/tax">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), sort: param(params, "sort") };
	const page = pageParam(params);
	const returnTo = new URLSearchParams({ ...listParams(values), ...(page > 1 ? { page: String(page) } : {}) }).toString();

	let loadError = "";
	const [settings, list] = await Promise.all([
		adminTaxSettings(),
		adminTaxClasses({ ...values, page, perPage: PER_PAGE }).catch((e: Error) => ((loadError = e.message), { rows: [], total: 0 })),
	]);
	const all = loadError ? [] : (await adminTaxClasses({ perPage: 100 })).rows;
	const editing = all.find((c) => c.id === param(params, "edit"));

	return (
		<>
			<PageHeader
				title="Tax (VAT)"
				description="Swedish moms: switch it on once the business is VAT-registered. Prices are entered including VAT."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Shop", href: "/admin/shop" }, { label: "Tax" }]}
			/>
			<div className="max-w-4xl space-y-6">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />
				{loadError && (
					<Alert tone="error">
						VAT settings aren&apos;t available yet ({loadError}). Run <code>supabase/migrations/20261011030000_shipping_tax.sql</code> in the Supabase SQL editor.
					</Alert>
				)}

				<form action={saveTaxSettings} className={cn(cardClass, "space-y-5 p-5")}>
					<label className="flex items-center justify-between gap-4">
						<span>
							<span className="block font-semibold text-slate-900 dark:text-white">VAT is {settings.enabled ? "ON" : "OFF"}</span>
							<span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">
								When on, orders and receipts show the VAT included in prices and shipping (&ldquo;varav moms&rdquo;), split per rate. Shipping VAT follows the goods in
								the order, proportionally. Leave off until you&apos;re registered for moms with Skatteverket.
							</span>
						</span>
						<input type="checkbox" name="enabled" defaultChecked={settings.enabled} aria-label="VAT on or off" className="peer sr-only" />
						<span
							aria-hidden
							className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-teal-600 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600 peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5 dark:bg-slate-700"
						/>
					</label>
					<div>
						<label htmlFor="default_class" className={labelClass}>
							Default VAT class
						</label>
						<select id="default_class" name="default_class" defaultValue={settings.default_class} className={`${inputClass} sm:w-72`}>
							{all.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
						<p className={hintClass}>Used by products that don&apos;t pick their own class (Product → VAT).</p>
					</div>
					<div className="flex justify-end">
						<SubmitButton pendingLabel="Saving…">Save VAT settings</SubmitButton>
					</div>
				</form>

				<form action={saveTaxClass} className={cn(cardClass, "p-5")} aria-labelledby="class-form-title">
					<h2 id="class-form-title" className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
						{editing ? `Edit “${editing.name}”` : "Add a VAT class"}
					</h2>
					{editing && <input type="hidden" name="id" value={editing.id} />}
					<input type="hidden" name="return" value={returnTo} />
					<div className="grid gap-4 sm:grid-cols-[1fr_8rem_8rem]">
						<div>
							<label htmlFor="name" className={labelClass}>
								Name
							</label>
							<input id="name" name="name" required maxLength={60} defaultValue={editing?.name} placeholder="Food (12%)" className={inputClass} />
						</div>
						<div>
							<label htmlFor="rate" className={labelClass}>
								Rate (%)
							</label>
							<input id="rate" name="rate" required inputMode="decimal" defaultValue={editing?.rate} placeholder="12" className={inputClass} />
						</div>
						<div>
							<label htmlFor="sort_order" className={labelClass}>
								Order
							</label>
							<input id="sort_order" name="sort_order" type="number" step={1} defaultValue={editing?.sort_order ?? 0} className={inputClass} />
						</div>
					</div>
					<div className="mt-4 flex flex-wrap justify-end gap-2">
						{editing && (
							<Link href={`/admin/shop/tax${returnTo ? `?${returnTo}` : ""}`} className={buttonClass("secondary")}>
								Cancel
							</Link>
						)}
						<SubmitButton pendingLabel="Saving…">{editing ? "Save class" : "Add class"}</SubmitButton>
					</div>
				</form>

				<div className={cardClass}>
					<ListToolbar
						basePath="/admin/shop/tax"
						values={values}
						searchPlaceholder="Search VAT classes…"
						filters={[]}
						sorts={[
							{ label: "Display order", value: "" },
							{ label: "Name A–Z", value: "name" },
							{ label: "Highest rate", value: "rate-desc" },
							{ label: "Lowest rate", value: "rate" },
						]}
					/>
					{list.rows.length === 0 ? (
						<EmptyState icon={Percent} title={values.q ? "No classes match your search" : "No VAT classes"} description={values.q ? "Try another search." : "Add one above."} />
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-400">
									<tr>
										<th scope="col" className="px-4 py-2.5 font-medium">
											Class
										</th>
										<th scope="col" className="px-4 py-2.5 text-right font-medium">
											Rate
										</th>
										<th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
											Products
										</th>
										<th scope="col" className="px-4 py-2.5 text-right font-medium">
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
									{list.rows.map((c) => (
										<tr key={c.id}>
											<td className="px-4 py-3">
												<span className="font-medium text-slate-900 dark:text-white">{c.name}</span>{" "}
												{c.id === settings.default_class && <Badge tone="published">Default</Badge>}
												<p className="font-mono text-xs text-slate-600 dark:text-slate-400">{c.id}</p>
											</td>
											<td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-white">{c.rate}%</td>
											<td className="hidden px-4 py-3 text-right tabular-nums text-slate-700 sm:table-cell dark:text-slate-300">{c.products}</td>
											<td className="px-4 py-3">
												<div className="flex justify-end gap-1.5">
													<Link
														href={`/admin/shop/tax?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(returnTo)), edit: c.id })}`}
														aria-label={`Edit ${c.name}`}
														className={buttonClass("secondary", "sm")}
													>
														<Pencil className="h-3.5 w-3.5" aria-hidden />
													</Link>
													<form action={deleteTaxClass}>
														<input type="hidden" name="id" value={c.id} />
														<input type="hidden" name="return" value={returnTo} />
														<ConfirmButton message={`Remove the VAT class “${c.name}”?`} label={`Delete ${c.name}`} variant="secondary" size="sm" className={dangerIconClass}>
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
				<Pagination page={page} perPage={PER_PAGE} total={list.total} basePath="/admin/shop/tax" params={listParams(values)} />
			</div>
		</>
	);
}
