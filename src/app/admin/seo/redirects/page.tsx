import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Pencil, Route, Trash2 } from "lucide-react";
import { deleteRedirect, saveRedirect } from "../actions";
import { requireAdmin } from "@/lib/auth";
import { getRedirect, listRedirects } from "@/lib/redirects";
import { pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState } from "@/components/admin/row-actions";
import { Badge } from "@/components/admin/status-badge";
import { Alert, FlashMessage } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass, cardClass, cn, dangerIconClass, hintClass, inputClass, labelClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Redirects" };

const PER_PAGE = 25;
const TYPES = [
	{ value: "301", label: "301 — Moved permanently (recommended)" },
	{ value: "308", label: "308 — Moved permanently (keeps form posts)" },
	{ value: "302", label: "302 — Temporary" },
	{ value: "307", label: "307 — Temporary (keeps form posts)" },
];

export default async function RedirectsPage({ searchParams }: PageProps<"/admin/seo/redirects">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), source: param(params, "source"), status: param(params, "status"), sort: param(params, "sort") };
	const page = pageParam(params);
	const returnTo = new URLSearchParams({ ...listParams(values), ...(page > 1 ? { page: String(page) } : {}) }).toString();

	let loadError = "";
	const [{ rows, total }, editing] = await Promise.all([
		listRedirects({ ...values, page, perPage: PER_PAGE }).catch((e: Error) => ((loadError = e.message), { rows: [], total: 0 })),
		getRedirect(param(params, "edit")).catch(() => null),
	]);
	const filtered = !!(values.q || values.source || values.status);

	return (
		<>
			<PageHeader
				title="Redirects"
				description="Send visitors and Google from old links to the right page. Changing the slug of a published page adds one automatically."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "SEO", href: "/admin/seo" }, { label: "Redirects" }]}
			/>

			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />
				{loadError && (
					<Alert tone="error">
						Redirects aren&apos;t available yet ({loadError}). Run <code>supabase/migrations/20261010000000_security_seo.sql</code> in the Supabase SQL editor.
					</Alert>
				)}

				<form action={saveRedirect} className={cn(cardClass, "p-5")} aria-labelledby="redirect-form-title">
					<h2 id="redirect-form-title" className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
						{editing ? "Edit redirect" : "Add a redirect"}
					</h2>
					{editing && <input type="hidden" name="id" value={editing.id} />}
					<input type="hidden" name="return" value={returnTo} />
					<div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
						<div>
							<label htmlFor="from_path" className={labelClass}>
								Old path
							</label>
							<input id="from_path" name="from_path" required maxLength={500} defaultValue={editing?.from_path} placeholder="/old-page" className={inputClass} />
							<p className={hintClass}>A path on this site, or paste a full old URL.</p>
						</div>
						<ArrowRight className="mt-9 hidden h-5 w-5 text-slate-500 lg:block" aria-hidden />
						<div>
							<label htmlFor="to_path" className={labelClass}>
								New path or URL
							</label>
							<input id="to_path" name="to_path" required maxLength={1000} defaultValue={editing?.to_path} placeholder="/services/roofing" className={inputClass} />
							<p className={hintClass}>A path like /blogs/my-post, or a full https:// link to another site.</p>
						</div>
					</div>
					<div className="mt-4 grid gap-4 sm:grid-cols-2">
						<div>
							<label htmlFor="status" className={labelClass}>
								Type
							</label>
							<select id="status" name="status" defaultValue={String(editing?.status ?? 301)} className={inputClass}>
								{TYPES.map((t) => (
									<option key={t.value} value={t.value}>
										{t.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<label htmlFor="note" className={labelClass}>
								Note <span className="font-normal text-slate-600 dark:text-slate-400">(optional)</span>
							</label>
							<input id="note" name="note" maxLength={300} defaultValue={editing?.note ?? ""} placeholder="Old Shopify collection" className={inputClass} />
						</div>
					</div>
					<div className="mt-4 flex flex-wrap justify-end gap-2">
						{editing && (
							<Link href={`/admin/seo/redirects${returnTo ? `?${returnTo}` : ""}`} className={buttonClass("secondary")}>
								Cancel
							</Link>
						)}
						<SubmitButton pendingLabel="Saving…">{editing ? "Save redirect" : "Add redirect"}</SubmitButton>
					</div>
				</form>

				<div className={cardClass}>
					<ListToolbar
						basePath="/admin/seo/redirects"
						values={values}
						searchPlaceholder="Search paths or notes…"
						filters={[
							{
								name: "source",
								label: "Source",
								options: [
									{ label: "All sources", value: "" },
									{ label: "Added by hand", value: "manual" },
									{ label: "Automatic (slug change)", value: "auto" },
								],
							},
							{
								name: "status",
								label: "Type",
								options: [{ label: "All types", value: "" }, ...TYPES.map((t) => ({ value: t.value, label: t.value }))],
							},
						]}
						sorts={[
							{ label: "Newest first", value: "" },
							{ label: "Oldest first", value: "oldest" },
							{ label: "Most used", value: "hits" },
							{ label: "Recently used", value: "recent" },
							{ label: "Old path A–Z", value: "from" },
						]}
					/>

					{rows.length === 0 ? (
						<EmptyState icon={Route} title={filtered ? "No redirects match your filters" : "No redirects yet"} description={filtered ? "Try a different search or filter." : "Add one above, e.g. to move links from the old shop."} />
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-400">
									<tr>
										<th scope="col" className="px-4 py-2.5 font-medium">
											Redirect
										</th>
										<th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">
											Type
										</th>
										<th scope="col" className="hidden px-4 py-2.5 text-right font-medium md:table-cell">
											Hits
										</th>
										<th scope="col" className="px-4 py-2.5 text-right font-medium">
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
									{rows.map((r) => (
										<tr key={r.id} className="align-top">
											<td className="px-4 py-3">
												<p className="break-all font-mono text-xs text-slate-900 dark:text-white">{r.from_path}</p>
												<p className="mt-0.5 flex items-start gap-1 break-all font-mono text-xs text-teal-800 dark:text-teal-300">
													<ArrowRight className="mt-0.5 h-3 w-3 shrink-0" aria-label="to" /> {r.to_path}
												</p>
												{r.note && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{r.note}</p>}
											</td>
											<td className="hidden px-4 py-3 sm:table-cell">
												<div className="flex flex-wrap gap-1">
													<Badge tone={r.status === 301 || r.status === 308 ? "published" : "warning"}>{r.status}</Badge>
													<Badge tone={r.source === "auto" ? "scheduled" : "neutral"}>{r.source === "auto" ? "Automatic" : "Manual"}</Badge>
												</div>
											</td>
											<td className="hidden px-4 py-3 text-right md:table-cell">
												<span className="tabular-nums text-slate-900 dark:text-white">{r.hits}</span>
												{r.last_hit_at && <p className="text-xs text-slate-600 dark:text-slate-400">last {formatDate(r.last_hit_at)}</p>}
											</td>
											<td className="px-4 py-3">
												<div className="flex justify-end gap-1.5">
													<Link
														href={`/admin/seo/redirects?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(returnTo)), edit: r.id })}`}
														aria-label={`Edit redirect from ${r.from_path}`}
														className={buttonClass("secondary", "sm")}
													>
														<Pencil className="h-3.5 w-3.5" aria-hidden />
													</Link>
													<form action={deleteRedirect}>
														<input type="hidden" name="id" value={r.id} />
														<input type="hidden" name="return" value={returnTo} />
														<ConfirmButton message={`Remove the redirect from ${r.from_path}? Old links to it will show "page not found".`} label={`Delete redirect from ${r.from_path}`} variant="secondary" size="sm" className={dangerIconClass}>
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

				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/seo/redirects" params={listParams(values)} />
			</div>
		</>
	);
}
