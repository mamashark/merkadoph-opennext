import type { Metadata } from "next";
import { Archive, Inbox, Mail, MailOpen, Phone, Trash2 } from "lucide-react";
import { deleteMessage, setMessageStatus } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { listMessages } from "@/lib/inbox";
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
import { buttonClass, cardClass, dangerIconClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Inbox" };

const PER_PAGE = 20;

export default async function InboxPage({ searchParams }: PageProps<"/admin/inbox">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), status: param(params, "status") };
	const page = pageParam(params);
	const returnTo = new URLSearchParams({ ...listParams(values), ...(page > 1 ? { page: String(page) } : {}) }).toString();

	let loadError = "";
	const { rows, total } = await listMessages({ ...values, page, perPage: PER_PAGE }).catch((e: Error) => ((loadError = e.message), { rows: [], total: 0 }));
	const filtered = !!(values.q || values.status);

	return (
		<>
			<PageHeader title="Inbox" description="Messages sent through the contact form on the homepage." breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Inbox" }]} />

			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />
				{loadError && (
					<Alert tone="error">
						The inbox isn&apos;t available yet ({loadError}). Run <code>supabase/migrations/20261005000000_ops_logs_contact_messages.sql</code> in the Supabase SQL editor.
					</Alert>
				)}

				<div className={cardClass}>
					<ListToolbar
						basePath="/admin/inbox"
						values={values}
						searchPlaceholder="Search name, email, topic or message…"
						filters={[
							{
								name: "status",
								label: "Status",
								options: [
									{ label: "Inbox (new + read)", value: "" },
									{ label: "New", value: "new" },
									{ label: "Read", value: "read" },
									{ label: "Archived", value: "archived" },
								],
							},
						]}
					/>

					{rows.length === 0 ? (
						<EmptyState icon={Inbox} title={filtered ? "No messages match your filters" : "No messages yet"} description={filtered ? "Try a different search or filter." : "Messages from the homepage contact form show up here."} />
					) : (
						<ul className="divide-y divide-slate-100 dark:divide-slate-800">
							{rows.map((m) => (
								<li key={m.id}>
									<details className="group" open={m.status === "new"}>
										<summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 [&::-webkit-details-marker]:hidden">
											{m.status === "new" ? <Mail className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden /> : <MailOpen className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />}
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm">
													<span className={m.status === "new" ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-800 dark:text-slate-200"}>{m.name}</span>
													<span className="text-slate-600 dark:text-slate-400"> · {m.topic ?? "General"}</span>
												</p>
												<p className="truncate text-xs text-slate-600 dark:text-slate-400">{m.message}</p>
											</div>
											<div className="hidden shrink-0 items-center gap-2 sm:flex">
												{m.status === "new" && <Badge tone="published">New</Badge>}
												{m.status === "archived" && <Badge>Archived</Badge>}
												<time dateTime={m.created_at} className="text-xs text-slate-600 dark:text-slate-400">
													{formatDate(m.created_at, { dateStyle: "medium", timeStyle: "short" })}
												</time>
											</div>
										</summary>

										<div className="space-y-4 border-t border-slate-100 bg-slate-50/50 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/30 sm:pl-11">
											<p className="whitespace-pre-line text-sm text-slate-800 dark:text-slate-200">{m.message}</p>
											<div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
												<a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.topic ?? "Your message to Merkado PH"}`)}`} className="inline-flex items-center gap-1.5 font-medium text-teal-700 hover:underline dark:text-teal-300">
													<Mail className="h-4 w-4" aria-hidden /> {m.email}
												</a>
												{m.phone && (
													<a href={`tel:${m.phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1.5 font-medium text-teal-700 hover:underline dark:text-teal-300">
														<Phone className="h-4 w-4" aria-hidden /> {m.phone}
													</a>
												)}
											</div>
											<div className="flex flex-wrap gap-2">
												{m.status !== "read" && (
													<form action={setMessageStatus}>
														<input type="hidden" name="id" value={m.id} />
														<input type="hidden" name="status" value="read" />
														<input type="hidden" name="return" value={returnTo} />
														<SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
															<MailOpen className="h-3.5 w-3.5" aria-hidden /> Mark as read
														</SubmitButton>
													</form>
												)}
												{m.status !== "new" && (
													<form action={setMessageStatus}>
														<input type="hidden" name="id" value={m.id} />
														<input type="hidden" name="status" value="new" />
														<input type="hidden" name="return" value={returnTo} />
														<SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
															<Mail className="h-3.5 w-3.5" aria-hidden /> Mark as new
														</SubmitButton>
													</form>
												)}
												{m.status !== "archived" && (
													<form action={setMessageStatus}>
														<input type="hidden" name="id" value={m.id} />
														<input type="hidden" name="status" value="archived" />
														<input type="hidden" name="return" value={returnTo} />
														<SubmitButton variant="secondary" size="sm" pendingLabel="Archiving…">
															<Archive className="h-3.5 w-3.5" aria-hidden /> Archive
														</SubmitButton>
													</form>
												)}
												<form action={deleteMessage}>
													<input type="hidden" name="id" value={m.id} />
													<input type="hidden" name="return" value={returnTo} />
													<ConfirmButton message={`Delete the message from ${m.name}? This cannot be undone.`} label={`Delete message from ${m.name}`} variant="secondary" size="sm" className={dangerIconClass}>
														<Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
													</ConfirmButton>
												</form>
												<a href={`mailto:${m.email}`} className={buttonClass("accent", "sm")}>
													Reply by email
												</a>
											</div>
										</div>
									</details>
								</li>
							))}
						</ul>
					)}
				</div>

				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/inbox" params={listParams(values)} />
			</div>
		</>
	);
}
