import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, Plus, Star } from "lucide-react";
import { deleteService } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { adminListServices, getServiceCategories } from "@/lib/services";
import { contentState, pageParam, param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState, RowActions, Thumb } from "@/components/admin/row-actions";
import { Badge, StatusBadge } from "@/components/admin/status-badge";
import { STATE_FILTER } from "@/components/admin/filters";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass, cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Services" };

const PER_PAGE = 20;

export default async function ServicesAdminPage({ searchParams }: PageProps<"/admin/services">) {
	await requireAdmin();
	const params = await searchParams;
	const values = {
		q: param(params, "q").trim(),
		status: param(params, "status"),
		category: param(params, "category"),
		featured: param(params, "featured"),
		sort: param(params, "sort"),
	};
	const page = pageParam(params);

	const [{ rows, total }, categories] = await Promise.all([adminListServices({ ...values, page, perPage: PER_PAGE }), getServiceCategories("admin")]);
	const filtered = !!(values.q || values.status || values.category || values.featured);

	return (
		<>
			<PageHeader
				title="Services"
				description="The services Merkado PH offers, shown on /services."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Services" }]}
				actions={
					<Link href="/admin/services/new" className={buttonClass("primary")}>
						<Plus className="h-4 w-4" aria-hidden /> New service
					</Link>
				}
			/>

			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice") === "deleted" ? "Service deleted." : undefined} error={param(params, "error")} />

				<div className={cardClass}>
					<ListToolbar
						basePath="/admin/services"
						values={values}
						searchPlaceholder="Search title or category…"
						filters={[
							STATE_FILTER,
							{ name: "category", label: "Category", options: [{ label: "All categories", value: "" }, ...categories.map((c) => ({ label: c, value: c }))] },
							{
								name: "featured",
								label: "Featured",
								options: [
									{ label: "Any", value: "" },
									{ label: "Featured", value: "yes" },
									{ label: "Not featured", value: "no" },
								],
							},
						]}
						sorts={[
							{ label: "Display order", value: "" },
							{ label: "Last updated", value: "updated" },
							{ label: "Title A–Z", value: "title" },
						]}
					/>

					{rows.length === 0 ? (
						<EmptyState
							icon={BriefcaseBusiness}
							title={filtered ? "No services match your filters" : "No services yet"}
							description={filtered ? "Try a different search or filter." : "Add the services you offer to show them on the site."}
							action={
								!filtered && (
									<Link href="/admin/services/new" className={buttonClass("primary")}>
										<Plus className="h-4 w-4" aria-hidden /> New service
									</Link>
								)
							}
						/>
					) : (
						<ul className="divide-y divide-slate-100 dark:divide-slate-800">
							{rows.map((s) => (
								<li key={s.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
									<Thumb src={s.cover_image_url} icon={BriefcaseBusiness} />
									<div className="min-w-0 flex-1">
										<Link href={`/admin/services/${s.id}/edit`} className="block truncate font-medium text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300">
											{s.title}
										</Link>
										<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
											<StatusBadge row={s} />
											{s.is_featured && (
												<Badge tone="accent">
													<Star className="mr-1 h-3 w-3" aria-hidden /> Featured
												</Badge>
											)}
											{s.category && <span>{s.category}</span>}
											{s.price_label && <span>{s.price_label}</span>}
											<span>Order {s.sort_order}</span>
										</div>
									</div>
									<RowActions
										label={s.title}
										id={s.id}
										editHref={`/admin/services/${s.id}/edit`}
										viewHref={contentState(s) === "published" ? `/services/${s.slug}` : null}
										deleteAction={deleteService}
									/>
								</li>
							))}
						</ul>
					)}
				</div>

				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/services" params={listParams(values)} />
			</div>
		</>
	);
}
