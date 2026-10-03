import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Tag, TicketPercent } from "lucide-react";
import { deletePromotion } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { adminListPromotions, promotionValidity } from "@/lib/promotions";
import { contentState, pageParam, param } from "@/lib/content";
import { formatDayRange } from "@/lib/datetime";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState, RowActions, Thumb } from "@/components/admin/row-actions";
import { Badge, StatusBadge } from "@/components/admin/status-badge";
import { STATE_FILTER } from "@/components/admin/filters";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass, cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Promotions" };

const PER_PAGE = 20;
const validityBadge = { active: { tone: "published", label: "Running" }, upcoming: { tone: "scheduled", label: "Upcoming" }, ended: { tone: "neutral", label: "Ended" } } as const;

export default async function PromotionsAdminPage({ searchParams }: PageProps<"/admin/promotions">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), status: param(params, "status"), validity: param(params, "validity"), sort: param(params, "sort") };
	const page = pageParam(params);

	const { rows, total } = await adminListPromotions({ ...values, page, perPage: PER_PAGE });
	const filtered = !!(values.q || values.status || values.validity);

	return (
		<>
			<PageHeader
				title="Promotions"
				description="Sales, discounts and limited-time offers shown on /promotions."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Promotions" }]}
				actions={
					<Link href="/admin/promotions/new" className={buttonClass("primary")}>
						<Plus className="h-4 w-4" aria-hidden /> New promotion
					</Link>
				}
			/>

			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice") === "deleted" ? "Promotion deleted." : undefined} error={param(params, "error")} />

				<div className={cardClass}>
					<ListToolbar
						basePath="/admin/promotions"
						values={values}
						searchPlaceholder="Search title, code or discount…"
						filters={[
							STATE_FILTER,
							{
								name: "validity",
								label: "Validity",
								options: [
									{ label: "Any", value: "" },
									{ label: "Running now", value: "active" },
									{ label: "Upcoming", value: "upcoming" },
									{ label: "Ended", value: "ended" },
								],
							},
						]}
						sorts={[
							{ label: "Last updated", value: "" },
							{ label: "Ending soonest", value: "ends" },
							{ label: "Title A–Z", value: "title" },
						]}
					/>

					{rows.length === 0 ? (
						<EmptyState
							icon={TicketPercent}
							title={filtered ? "No promotions match your filters" : "No promotions yet"}
							description={filtered ? "Try a different search or filter." : "Create a promotion to feature it on the site."}
							action={
								!filtered && (
									<Link href="/admin/promotions/new" className={buttonClass("primary")}>
										<Plus className="h-4 w-4" aria-hidden /> New promotion
									</Link>
								)
							}
						/>
					) : (
						<ul className="divide-y divide-slate-100 dark:divide-slate-800">
							{rows.map((p) => {
								const v = validityBadge[promotionValidity(p)];
								return (
									<li key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
										<Thumb src={p.cover_image_url} icon={TicketPercent} />
										<div className="min-w-0 flex-1">
											<Link href={`/admin/promotions/${p.id}/edit`} className="block truncate font-medium text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300">
												{p.title}
											</Link>
											<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
												<StatusBadge row={p} />
												<Badge tone={v.tone}>{v.label}</Badge>
												{p.discount_label && (
													<span className="inline-flex items-center gap-1">
														<Tag className="h-3.5 w-3.5" aria-hidden />
														{p.discount_label}
													</span>
												)}
												<span>{formatDayRange(p.starts_at, p.ends_at)}</span>
											</div>
										</div>
										<RowActions
											label={p.title}
											id={p.id}
											editHref={`/admin/promotions/${p.id}/edit`}
											viewHref={contentState(p) === "published" ? `/promotions/${p.slug}` : null}
											deleteAction={deletePromotion}
										/>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/promotions" params={listParams(values)} />
			</div>
		</>
	);
}
