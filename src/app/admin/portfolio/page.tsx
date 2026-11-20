import type { Metadata } from "next";
import Link from "next/link";
import { GalleryHorizontalEnd, Plus } from "lucide-react";
import { deletePortfolio } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { adminListPortfolios, adminPortfolioTags, adminPortfolioYears, portfolioCover } from "@/lib/portfolio";
import { contentState, pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState, RowActions, Thumb } from "@/components/admin/row-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { STATE_FILTER } from "@/components/admin/filters";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass, cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Community Impact" };

const PER_PAGE = 20;

export default async function PortfolioAdminPage({ searchParams }: PageProps<"/admin/portfolio">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), status: param(params, "status"), tag: param(params, "tag"), year: param(params, "year"), sort: param(params, "sort") };
	const page = pageParam(params);

	const [{ rows, total }, tags, years] = await Promise.all([adminListPortfolios({ ...values, page, perPage: PER_PAGE }), adminPortfolioTags(), adminPortfolioYears()]);
	const filtered = !!(values.q || values.status || values.tag || values.year);

	return (
		<>
			<PageHeader
				title="Community Impact"
				description="Events and initiatives, grouped by year on the homepage and /impact. Give each entry the date it took place, and the same tag every year for recurring events (e.g. “Spring Market”), so the years link up."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Community Impact" }]}
				actions={
					<Link href="/admin/portfolio/new" className={buttonClass("primary")}>
						<Plus className="h-4 w-4" aria-hidden /> New entry
					</Link>
				}
			/>

			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice") === "deleted" ? "Entry deleted." : undefined} error={param(params, "error")} />

				<div className={cardClass}>
					<ListToolbar
						basePath="/admin/portfolio"
						values={values}
						searchPlaceholder="Search title, location or summary…"
						filters={[
							STATE_FILTER,
							{ name: "year", label: "Year", options: [{ label: "All years", value: "" }, ...years.map((y) => ({ label: y, value: y })), { label: "No date (not shown under a year)", value: "none" }] },
							{ name: "tag", label: "Tag", options: [{ label: "All tags", value: "" }, ...tags.map((t) => ({ label: t, value: t }))] },
						]}
						sorts={[
							{ label: "Last updated", value: "" },
							{ label: "Event date (newest)", value: "date" },
							{ label: "Newest published", value: "newest" },
							{ label: "Title A–Z", value: "title" },
						]}
					/>

					{rows.length === 0 ? (
						<EmptyState
							icon={GalleryHorizontalEnd}
							title={filtered ? "No entries match your filters" : "No entries yet"}
							description={filtered ? "Try a different search or filter." : "Add an event or initiative with its date and photos to show it under its year."}
							action={
								!filtered && (
									<Link href="/admin/portfolio/new" className={buttonClass("primary")}>
										<Plus className="h-4 w-4" aria-hidden /> New entry
									</Link>
								)
							}
						/>
					) : (
						<ul className="divide-y divide-slate-100 dark:divide-slate-800">
							{rows.map((p) => (
								<li key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
									<Thumb src={portfolioCover(p)?.url ?? null} icon={GalleryHorizontalEnd} />
									<div className="min-w-0 flex-1">
										<Link href={`/admin/portfolio/${p.id}/edit`} className="block truncate font-medium text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300">
											{p.title}
										</Link>
										<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
											<StatusBadge row={p} />
											<span>{p.images.length} image{p.images.length === 1 ? "" : "s"}</span>
											{p.completed_on ? <span>{formatDate(p.completed_on)}</span> : <span className="font-medium text-amber-700 dark:text-amber-300">No date: not shown under a year</span>}
											{p.location && <span>{p.location}</span>}
											{p.published_at && <span>Published {formatDate(p.published_at)}</span>}
										</div>
									</div>
									<RowActions
										label={p.title}
										id={p.id}
										editHref={`/admin/portfolio/${p.id}/edit`}
										viewHref={contentState(p) === "published" ? `/impact/${p.slug}` : null}
										deleteAction={deletePortfolio}
									/>
								</li>
							))}
						</ul>
					)}
				</div>

				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/portfolio" params={listParams(values)} />
			</div>
		</>
	);
}
