import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { deleteEvent } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { adminListEvents, isPastEvent } from "@/lib/events";
import { contentState, pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState, RowActions, Thumb } from "@/components/admin/row-actions";
import { Badge, StatusBadge } from "@/components/admin/status-badge";
import { STATE_FILTER } from "@/components/admin/filters";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass, cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Events" };

const PER_PAGE = 20;

export default async function EventsAdminPage({ searchParams }: PageProps<"/admin/events">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), status: param(params, "status"), when: param(params, "when"), sort: param(params, "sort") };
	const page = pageParam(params);

	const { rows, total } = await adminListEvents({ ...values, page, perPage: PER_PAGE });
	const filtered = !!(values.q || values.status || values.when);

	return (
		<>
			<PageHeader
				title="Events"
				description="Market days, workshops and community gatherings shown on /events."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Events" }]}
				actions={
					<Link href="/admin/events/new" className={buttonClass("primary")}>
						<Plus className="h-4 w-4" aria-hidden /> New event
					</Link>
				}
			/>

			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice") === "deleted" ? "Event deleted." : undefined} error={param(params, "error")} />

				<div className={cardClass}>
					<ListToolbar
						basePath="/admin/events"
						values={values}
						searchPlaceholder="Search title or venue…"
						filters={[
							STATE_FILTER,
							{
								name: "when",
								label: "When",
								options: [
									{ label: "Any time", value: "" },
									{ label: "Upcoming", value: "upcoming" },
									{ label: "Past", value: "past" },
								],
							},
						]}
						sorts={[
							{ label: "Event date", value: "" },
							{ label: "Last updated", value: "updated" },
							{ label: "Title A–Z", value: "title" },
						]}
					/>

					{rows.length === 0 ? (
						<EmptyState
							icon={CalendarDays}
							title={filtered ? "No events match your filters" : "No events yet"}
							description={filtered ? "Try a different search or filter." : "Create your first event to show it on the site."}
							action={
								!filtered && (
									<Link href="/admin/events/new" className={buttonClass("primary")}>
										<Plus className="h-4 w-4" aria-hidden /> New event
									</Link>
								)
							}
						/>
					) : (
						<ul className="divide-y divide-slate-100 dark:divide-slate-800">
							{rows.map((event) => (
								<li key={event.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
									<Thumb src={event.cover_image_url} icon={CalendarDays} />
									<div className="min-w-0 flex-1">
										<Link href={`/admin/events/${event.id}/edit`} className="block truncate font-medium text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300">
											{event.title}
										</Link>
										<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
											<StatusBadge row={event} />
											{isPastEvent(event) && <Badge>Ended</Badge>}
											<span className="inline-flex items-center gap-1">
												<CalendarDays className="h-3.5 w-3.5" aria-hidden />
												{formatDate(event.starts_at, { dateStyle: "medium", timeStyle: "short" })}
											</span>
											{event.venue_name && (
												<span className="inline-flex items-center gap-1">
													<MapPin className="h-3.5 w-3.5" aria-hidden />
													{event.venue_name}
												</span>
											)}
										</div>
									</div>
									<RowActions
										label={event.title}
										id={event.id}
										editHref={`/admin/events/${event.id}/edit`}
										viewHref={contentState(event) === "published" ? `/events/${event.slug}` : null}
										deleteAction={deleteEvent}
									/>
								</li>
							))}
						</ul>
					)}
				</div>

				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/events" params={listParams(values)} />
			</div>
		</>
	);
}
