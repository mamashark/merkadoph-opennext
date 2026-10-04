import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { deleteProduct } from "../actions";
import { requireAdmin } from "@/lib/auth";
import { adminAllCategories, adminGetShopSettings, adminListProducts } from "@/lib/shop-admin";
import { contentState, pageParam, param } from "@/lib/content";
import { availability, formatMoney, priceInfo, STOCK_LABELS } from "@/lib/pricing";
import { PageHeader } from "@/components/admin/page-header";
import { ShopStatusAlert } from "@/components/admin/shop-status-alert";
import { getShopReadiness } from "@/lib/shop-status";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState, RowActions, Thumb } from "@/components/admin/row-actions";
import { Badge, StatusBadge } from "@/components/admin/status-badge";
import { STATE_FILTER } from "@/components/admin/filters";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass, cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Products" };

const PER_PAGE = 20;

export default async function ProductsAdminPage({ searchParams }: PageProps<"/admin/shop/products">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), status: param(params, "status"), category: param(params, "category"), stock: param(params, "stock"), sort: param(params, "sort") };
	const page = pageParam(params);

	const [{ rows, total }, categories, settings, readiness] = await Promise.all([adminListProducts({ ...values, page, perPage: PER_PAGE }), adminAllCategories(), adminGetShopSettings(), getShopReadiness()]);
	const filtered = !!(values.q || values.status || values.category || values.stock);

	return (
		<>
			<PageHeader
				title="Products"
				description="Everything you sell in the shop."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Shop", href: "/admin/shop" }, { label: "Products" }]}
				actions={
					<Link href="/admin/shop/products/new" className={buttonClass("primary")}>
						<Plus className="h-4 w-4" aria-hidden /> Add product
					</Link>
				}
			/>

			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice") === "deleted" ? "Product deleted." : undefined} error={param(params, "error")} />
				{readiness.state !== "live" && <ShopStatusAlert status={readiness} />}

				<div className={cardClass}>
					<ListToolbar
						basePath="/admin/shop/products"
						values={values}
						searchPlaceholder="Search name or SKU…"
						filters={[
							STATE_FILTER,
							{ name: "category", label: "Category", options: [{ label: "All categories", value: "" }, ...categories.map((c) => ({ label: c.name, value: c.id }))] },
							{
								name: "stock",
								label: "Stock",
								options: [
									{ label: "Any stock", value: "" },
									{ label: "In stock", value: "instock" },
									{ label: "Out of stock", value: "outofstock" },
									{ label: "On backorder", value: "onbackorder" },
									{ label: "Low (≤ 5)", value: "low" },
								],
							},
						]}
						sorts={[
							{ label: "Last updated", value: "" },
							{ label: "Name A–Z", value: "title" },
							{ label: "Price (low first)", value: "price" },
							{ label: "Stock (low first)", value: "stock" },
							{ label: "Publish date", value: "published" },
						]}
					/>

					{rows.length === 0 ? (
						<EmptyState
							icon={Package}
							title={filtered ? "No products match your filters" : "No products yet"}
							description={filtered ? "Try a different search or filter." : "Add your first product to start selling."}
							action={
								!filtered && (
									<Link href="/admin/shop/products/new" className={buttonClass("primary")}>
										<Plus className="h-4 w-4" aria-hidden /> Add product
									</Link>
								)
							}
						/>
					) : (
						<ul className="divide-y divide-slate-100 dark:divide-slate-800">
							{rows.map((p) => {
								const { price, regular, onSale } = priceInfo(p);
								const stock = availability(p);
								return (
									<li key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
										<Thumb src={p.cover_image_url} icon={Package} />
										<div className="min-w-0 flex-1">
											<Link href={`/admin/shop/products/${p.id}/edit`} className="block truncate font-medium text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300">
												{p.title}
											</Link>
											<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
												<StatusBadge row={p} />
												<Badge tone={stock === "instock" ? "published" : stock === "onbackorder" ? "warning" : "neutral"}>
													{STOCK_LABELS[stock]}
													{p.manage_stock && ` (${p.stock_quantity ?? 0})`}
												</Badge>
												{p.is_featured && <Badge tone="accent">Featured</Badge>}
												{price != null && (
													<span className="font-medium text-slate-800 dark:text-slate-200">
														{onSale && <s className="mr-1 font-normal text-slate-500">{formatMoney(regular, settings.currency)}</s>}
														{formatMoney(price, settings.currency)}
													</span>
												)}
												{p.sku && <span className="font-mono">SKU {p.sku}</span>}
												{p.categories.length > 0 && <span className="hidden md:inline">{p.categories.map((c) => c.name).join(", ")}</span>}
											</div>
										</div>
										<RowActions
											label={p.title}
											id={p.id}
											editHref={`/admin/shop/products/${p.id}/edit`}
											viewHref={contentState(p) === "published" ? `/product/${p.slug}` : null}
											deleteAction={deleteProduct}
										/>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/shop/products" params={listParams(values)} />
			</div>
		</>
	);
}
