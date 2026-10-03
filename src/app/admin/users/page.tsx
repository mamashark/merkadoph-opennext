import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { deleteUser } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/datetime";
import { pageParam, param } from "@/lib/content";
import { listUsers } from "@/lib/users";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState } from "@/components/admin/row-actions";
import { Badge } from "@/components/admin/status-badge";
import { FlashMessage } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { buttonClass, cardClass, dangerIconClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Users" };

const PER_PAGE = 20;
const notices: Record<string, string> = { deleted: "User deleted." };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
	const me = await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), access: param(params, "access"), sort: param(params, "sort") };
	const page = pageParam(params);

	// Auth users come from the Supabase Auth admin API, so search/filter/sort run here.
	const q = values.q.toLowerCase();
	const all = (await listUsers())
		.filter((u) => !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
		.filter((u) => (values.access === "admin" ? u.hasAccess : values.access === "none" ? !u.hasAccess : true))
		.sort((a, b) =>
			values.sort === "recent"
				? (b.lastSignInAt ?? "").localeCompare(a.lastSignInAt ?? "")
				: values.sort === "created"
					? b.createdAt.localeCompare(a.createdAt)
					: (a.name || a.email).localeCompare(b.name || b.email),
		);
	const users = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
	const filtered = !!(values.q || values.access);

	return (
		<>
			<PageHeader
				title="Users"
				description="People who can sign in to the admin panel."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users" }]}
				actions={
					<Link href="/admin/users/new" className={buttonClass("primary")}>
						<Plus className="h-4 w-4" aria-hidden /> Add user
					</Link>
				}
			/>

			<div className="space-y-4">
				<FlashMessage notice={notices[param(params, "notice")]} error={param(params, "error")} />

				<div className={`${cardClass} overflow-hidden`}>
					<ListToolbar
						basePath="/admin/users"
						values={values}
						searchPlaceholder="Search name or email…"
						filters={[
							{
								name: "access",
								label: "Access",
								options: [
									{ label: "Everyone", value: "" },
									{ label: "Admin", value: "admin" },
									{ label: "No access", value: "none" },
								],
							},
						]}
						sorts={[
							{ label: "Name A–Z", value: "" },
							{ label: "Recent sign-in", value: "recent" },
							{ label: "Newest", value: "created" },
						]}
					/>

					{users.length === 0 ? (
						<EmptyState icon={Users} title={filtered ? "No users match your filters" : "No users yet"} description={filtered ? "Try a different search or filter." : "Add a teammate to get started."} />
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
									<tr>
										<th scope="col" className="px-4 py-3">
											User
										</th>
										<th scope="col" className="hidden px-4 py-3 md:table-cell">
											Access
										</th>
										<th scope="col" className="hidden px-4 py-3 lg:table-cell">
											Last sign-in
										</th>
										<th scope="col" className="px-4 py-3 text-right">
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
									{users.map((user) => {
										const isSelf = user.id === me.id;
										const label = user.name || user.email;
										return (
											<tr key={user.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
												<td className="px-4 py-3">
													<div className="flex items-center gap-3">
														<span
															aria-hidden
															className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300"
														>
															{label.slice(0, 2)}
														</span>
														<div className="min-w-0">
															<p className="truncate font-medium text-slate-900 dark:text-white">
																{user.name || "—"} {isSelf && <span className="ml-1 text-xs font-normal text-slate-600 dark:text-slate-400">(you)</span>}
															</p>
															<p className="truncate text-xs text-slate-600 dark:text-slate-400">{user.email}</p>
														</div>
													</div>
												</td>
												<td className="hidden px-4 py-3 md:table-cell">
													<Badge tone={user.hasAccess ? "published" : "neutral"}>{user.hasAccess ? "Admin" : "No access"}</Badge>
												</td>
												<td className="hidden px-4 py-3 text-slate-600 dark:text-slate-400 lg:table-cell">
													{user.lastSignInAt ? formatDate(user.lastSignInAt, { dateStyle: "medium", timeStyle: "short" }) : "Never"}
												</td>
												<td className="px-4 py-3">
													<div className="flex justify-end gap-1.5">
														<Link href={`/admin/users/${user.id}`} className={buttonClass("secondary", "icon")} aria-label={`Edit ${label}`} title="Edit">
															<Pencil className="h-4 w-4" aria-hidden />
														</Link>
														{!isSelf && (
															<form action={deleteUser}>
																<input type="hidden" name="id" value={user.id} />
																<ConfirmButton
																	message={`Delete ${label}? They will lose access immediately.`}
																	label={`Delete ${label}`}
																	variant="secondary"
																	size="icon"
																	className={dangerIconClass}
																>
																	<Trash2 className="h-4 w-4" aria-hidden />
																</ConfirmButton>
															</form>
														)}
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>

				<Pagination page={page} perPage={PER_PAGE} total={all.length} basePath="/admin/users" params={listParams(values)} />
			</div>
		</>
	);
}
