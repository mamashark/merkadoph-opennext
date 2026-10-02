import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteUser } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/blogs";
import { listUsers } from "@/lib/users";
import { PageHeader } from "@/components/admin/page-header";
import { FlashMessage } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { buttonClass, cardClass, cn } from "@/lib/ui";

export const metadata: Metadata = { title: "Users" };

const notices: Record<string, string> = { deleted: "User deleted." };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
	const me = await requireAdmin();
	const { notice, error } = await searchParams;
	const users = await listUsers();

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
				<FlashMessage notice={typeof notice === "string" ? notices[notice] : undefined} error={typeof error === "string" ? error : undefined} />

				<div className={`${cardClass} overflow-hidden`}>
					<table className="w-full text-left text-sm">
						<thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
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
						<tbody className="divide-y divide-slate-100">
							{users.map((user) => {
								const isSelf = user.id === me.id;
								const label = user.name || user.email;
								return (
									<tr key={user.id} className="hover:bg-slate-50/60">
										<td className="px-4 py-3">
											<div className="flex items-center gap-3">
												<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold uppercase text-slate-600">
													{label.slice(0, 2)}
												</span>
												<div className="min-w-0">
													<p className="truncate font-medium text-slate-900">
														{user.name || "—"} {isSelf && <span className="ml-1 text-xs font-normal text-slate-500">(you)</span>}
													</p>
													<p className="truncate text-xs text-slate-500">{user.email}</p>
												</div>
											</div>
										</td>
										<td className="hidden px-4 py-3 md:table-cell">
											<span
												className={cn(
													"rounded-full px-2 py-0.5 text-xs font-medium",
													user.hasAccess ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
												)}
											>
												{user.hasAccess ? "Admin" : "No access"}
											</span>
										</td>
										<td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
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
															className="hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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
			</div>
		</>
	);
}
