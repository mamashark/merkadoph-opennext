import type { Metadata } from "next";
import { FolderTree } from "lucide-react";
import { deleteCategory } from "../actions";
import { CategoryForm } from "./category-form";
import { requireAdmin } from "@/lib/auth";
import { adminAllCategories, adminListCategories } from "@/lib/shop-admin";
import { pageParam, param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState, RowActions, Thumb } from "@/components/admin/row-actions";
import { FlashMessage } from "@/components/ui/alert";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Product categories" };

const PER_PAGE = 20;

export default async function CategoriesPage({ searchParams }: PageProps<"/admin/shop/categories">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), parent: param(params, "parent"), sort: param(params, "sort") };
	const page = pageParam(params);
	const [{ rows, total }, all] = await Promise.all([adminListCategories({ ...values, page, perPage: PER_PAGE }), adminAllCategories()]);
	const nameOf = new Map(all.map((c) => [c.id, c.name]));
	const filtered = !!(values.q || values.parent);

	return (
		<>
			<PageHeader
				title="Categories"
				description="Group products. A product can be in several categories; each category gets its own page at /shop/[slug]."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Shop", href: "/admin/shop" }, { label: "Categories" }]}
			/>
			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />
				<div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
					<CategoryForm categories={all} />
					<div className="space-y-4">
						<div className={cardClass}>
							<ListToolbar
								basePath="/admin/shop/categories"
								values={values}
								searchPlaceholder="Search categories…"
								filters={[
									{
										name: "parent",
										label: "Level",
										options: [
											{ label: "All", value: "" },
											{ label: "Top level only", value: "top" },
											...all.filter((c) => all.some((x) => x.parent_id === c.id)).map((c) => ({ label: `Inside ${c.name}`, value: c.id })),
										],
									},
								]}
								sorts={[
									{ label: "Display order", value: "" },
									{ label: "Name A–Z", value: "name" },
									{ label: "Newest", value: "newest" },
									{ label: "Last updated", value: "updated" },
								]}
							/>
							{rows.length === 0 ? (
								<EmptyState icon={FolderTree} title={filtered ? "No categories match" : "No categories yet"} description={filtered ? "Try a different search or filter." : "Add one with the form."} />
							) : (
								<ul className="divide-y divide-slate-100 dark:divide-slate-800">
									{rows.map((c) => (
										<li key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
											<Thumb src={c.image_url} icon={FolderTree} />
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium text-slate-900 dark:text-white">{c.name}</p>
												<p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-600 dark:text-slate-400">
													<span className="font-mono">/shop/{c.slug}</span>
													{c.parent_id && <span>in {nameOf.get(c.parent_id) ?? "—"}</span>}
													<span>
														{c.product_count} live product{c.product_count === 1 ? "" : "s"}
													</span>
												</p>
											</div>
											<RowActions label={c.name} id={c.id} editHref={`/admin/shop/categories/${c.id}`} viewHref={`/shop/${c.slug}`} deleteAction={deleteCategory} />
										</li>
									))}
								</ul>
							)}
						</div>
						<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/shop/categories" params={listParams(values)} />
					</div>
				</div>
			</div>
		</>
	);
}
