import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listAuditLogs } from "@/lib/audit";
import { pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState } from "@/components/admin/row-actions";
import { Badge } from "@/components/admin/status-badge";
import { Alert } from "@/components/ui/alert";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Audit log" };

const PER_PAGE = 25;

/** Action prefixes (the part before the dot) offered as the "Area" filter. */
const AREAS = [
	["auth", "Sign-in & accounts"],
	["forms", "Public forms"],
	["payments", "Payments"],
	["users", "Users"],
	["blogs", "Blogs"],
	["events", "Events"],
	["promotions", "Promotions"],
	["services", "Services"],
	["products", "Products"],
	["product_categories", "Categories"],
	["product_tags", "Tags"],
	["orders", "Orders"],
	["shop", "Shop settings"],
	["media", "Media"],
	["seo", "SEO"],
	["redirects", "Redirects"],
	["legal", "Legal pages"],
	["cache", "Cache"],
] as const;

/** Failed/blocked security events get a warning badge. */
const isAlert = (action: string) => /(failed|rate_limited|forbidden|invalid|mismatch)$/.test(action);

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), kind: param(params, "kind"), area: param(params, "area"), sort: param(params, "sort") };
	const page = pageParam(params);

	let loadError = "";
	const { rows, total } = await listAuditLogs({ ...values, page, perPage: PER_PAGE }).catch((e: Error) => ((loadError = e.message), { rows: [], total: 0 }));
	const filtered = !!(values.q || values.kind || values.area);

	return (
		<>
			<PageHeader
				title="Audit log"
				description="Who changed what, and security events like failed sign-ins. Kept for 180 days."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit log" }]}
			/>

			<div className="space-y-4">
				{loadError && (
					<Alert tone="error">
						The audit log isn&apos;t available yet ({loadError}). Run <code>supabase/migrations/20261010000000_security_seo.sql</code> in the Supabase SQL editor.
					</Alert>
				)}

				<div className={cardClass}>
					<ListToolbar
						basePath="/admin/audit"
						values={values}
						searchPlaceholder="Search action, summary, email, IP or id…"
						filters={[
							{
								name: "kind",
								label: "Type",
								options: [
									{ label: "All types", value: "" },
									{ label: "Admin changes", value: "admin" },
									{ label: "Security events", value: "security" },
								],
							},
							{ name: "area", label: "Area", options: [{ label: "All areas", value: "" }, ...AREAS.map(([value, label]) => ({ value, label }))] },
						]}
						sorts={[
							{ label: "Newest first", value: "" },
							{ label: "Oldest first", value: "oldest" },
							{ label: "Action A–Z", value: "action" },
							{ label: "Person A–Z", value: "actor" },
						]}
					/>

					{rows.length === 0 ? (
						<EmptyState icon={ScrollText} title={filtered ? "No entries match your filters" : "Nothing logged yet"} description={filtered ? "Try a different search or filter." : "Changes in the admin and sign-in events show up here."} />
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-400">
									<tr>
										<th scope="col" className="px-4 py-2.5 font-medium">
											When
										</th>
										<th scope="col" className="px-4 py-2.5 font-medium">
											Event
										</th>
										<th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">
											Who
										</th>
										<th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">
											IP
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
									{rows.map((r) => (
										<tr key={r.id} className="align-top">
											<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
												<time dateTime={r.created_at}>{formatDate(r.created_at, { dateStyle: "medium", timeStyle: "short" })}</time>
											</td>
											<td className="px-4 py-3">
												<div className="flex flex-wrap items-center gap-2">
													<Badge tone={r.kind === "security" ? (isAlert(r.action) ? "warning" : "scheduled") : "neutral"}>{r.action}</Badge>
													<span className="text-slate-800 dark:text-slate-200">{r.summary}</span>
												</div>
												<p className="mt-1 text-xs text-slate-600 md:hidden dark:text-slate-400">{r.actor_email ?? "Visitor"}</p>
												{r.details && Object.keys(r.details).length > 0 && (
													<details className="mt-1.5">
														<summary className="cursor-pointer text-xs text-teal-700 dark:text-teal-300">Details</summary>
														<pre className="mt-1 max-w-xl overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
															{JSON.stringify({ ...r.details, ...(r.entity_id ? { id: r.entity_id } : {}), ...(r.user_agent ? { browser: r.user_agent } : {}) }, null, 2)}
														</pre>
													</details>
												)}
											</td>
											<td className="hidden px-4 py-3 text-slate-700 md:table-cell dark:text-slate-300">{r.actor_email ?? <span className="text-slate-600 dark:text-slate-400">Visitor</span>}</td>
											<td className="hidden px-4 py-3 font-mono text-xs text-slate-600 lg:table-cell dark:text-slate-400">{r.ip ?? "—"}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>

				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/audit" params={listParams(values)} />
			</div>
		</>
	);
}
