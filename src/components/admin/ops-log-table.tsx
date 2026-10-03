import { History } from "lucide-react";
import type { OpsLog } from "@/lib/ops";
import { formatDate } from "@/lib/datetime";
import { ListToolbar, listParams } from "./list-toolbar";
import { Pagination } from "./pagination";
import { EmptyState } from "./row-actions";
import { Badge } from "./status-badge";
import { cardClass } from "@/lib/ui";

type Props = {
	title: string;
	basePath: string;
	rows: OpsLog[];
	total: number;
	page: number;
	perPage: number;
	values: { q: string; source: string; status: string };
	scopeLabel?: string;
};

/** Searchable, filterable, paginated (URL-driven) log of keep-alive pings or cache purges. */
export function OpsLogTable({ title, basePath, rows, total, page, perPage, values, scopeLabel = "Scope" }: Props) {
	const filtered = !!(values.q || values.source || values.status);
	return (
		<section aria-labelledby="ops-log-title" className="space-y-4">
			<div className={`${cardClass} overflow-hidden`}>
				<h2 id="ops-log-title" className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
					{title}
				</h2>
				<ListToolbar
					basePath={basePath}
					values={values}
					searchPlaceholder="Search messages or people…"
					filters={[
						{
							name: "source",
							label: "Trigger",
							options: [
								{ label: "Any", value: "" },
								{ label: "Manual", value: "manual" },
								{ label: "Cron", value: "cron" },
							],
						},
						{
							name: "status",
							label: "Result",
							options: [
								{ label: "Any", value: "" },
								{ label: "Success", value: "success" },
								{ label: "Error", value: "error" },
							],
						},
					]}
				/>
				{rows.length === 0 ? (
					<EmptyState icon={History} title={filtered ? "No log entries match your filters" : "No activity logged yet"} description={filtered ? "Try a different search or filter." : "Entries appear here after the first run."} />
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
								<tr>
									<th scope="col" className="px-4 py-3">
										When
									</th>
									<th scope="col" className="px-4 py-3">
										Result
									</th>
									<th scope="col" className="hidden px-4 py-3 md:table-cell">
										{scopeLabel}
									</th>
									<th scope="col" className="px-4 py-3">
										Details
									</th>
									<th scope="col" className="hidden px-4 py-3 lg:table-cell">
										By
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
								{rows.map((r) => (
									<tr key={r.id} className="align-top">
										<td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">
											<time dateTime={r.created_at}>{formatDate(r.created_at, { dateStyle: "medium", timeStyle: "short" })}</time>
										</td>
										<td className="px-4 py-3">
											<div className="flex flex-wrap gap-1.5">
												<Badge tone={r.status === "success" ? "published" : "warning"}>{r.status === "success" ? "Success" : "Error"}</Badge>
												<Badge>{r.source === "cron" ? "Cron" : "Manual"}</Badge>
											</div>
										</td>
										<td className="hidden px-4 py-3 text-slate-700 dark:text-slate-300 md:table-cell">{r.scope ?? "—"}</td>
										<td className="px-4 py-3 text-slate-700 dark:text-slate-300">
											{r.message ?? "—"}
											{r.duration_ms != null && <span className="ml-1 text-xs text-slate-600 dark:text-slate-400">({r.duration_ms} ms)</span>}
										</td>
										<td className="hidden px-4 py-3 text-slate-600 dark:text-slate-400 lg:table-cell">{r.actor_email ?? (r.source === "cron" ? "Scheduler" : "—")}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
			<Pagination page={page} perPage={perPage} total={total} basePath={basePath} params={listParams(values)} />
		</section>
	);
}
