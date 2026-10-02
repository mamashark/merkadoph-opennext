import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteUser } from "../actions";
import { UserForm } from "../user-form";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/blogs";
import { getUser } from "@/lib/users";
import { PageHeader } from "@/components/admin/page-header";
import { FlashMessage } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Edit user" };

const notices: Record<string, string> = {
	created: "User created. They can sign in now.",
	saved: "Changes saved.",
	password: "Changes saved and password updated.",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditUserPage({ params, searchParams }: PageProps<"/admin/users/[id]">) {
	const me = await requireAdmin();
	const { id } = await params;
	const { notice, error } = await searchParams;
	if (!UUID.test(id)) notFound();

	const user = await getUser(id);
	if (!user) notFound();
	const isSelf = user.id === me.id;

	return (
		<>
			<PageHeader
				title={isSelf ? "Your account" : user.name || user.email}
				description={`Member since ${formatDate(user.createdAt)} · Last sign-in ${user.lastSignInAt ? formatDate(user.lastSignInAt, { dateStyle: "medium", timeStyle: "short" }) : "never"}`}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Users", href: "/admin/users" },
					{ label: isSelf ? "Your account" : "Edit" },
				]}
			/>

			<div className="max-w-2xl space-y-4">
				<FlashMessage notice={typeof notice === "string" ? notices[notice] : undefined} error={typeof error === "string" ? error : undefined} />
				<UserForm key={`${user.email}-${user.name}-${user.hasAccess}`} user={user} isSelf={isSelf} />

				{!isSelf && (
					<section className={`${cardClass} flex flex-col gap-4 border-red-200 p-5 sm:flex-row sm:items-center sm:justify-between`}>
						<div>
							<h2 className="text-sm font-semibold text-slate-900">Delete user</h2>
							<p className="mt-0.5 text-sm text-slate-500">Removes the account and signs them out. Their posts are kept.</p>
						</div>
						<form action={deleteUser}>
							<input type="hidden" name="id" value={user.id} />
							<ConfirmButton message={`Delete ${user.email}? They will lose access immediately.`}>
								<Trash2 className="h-4 w-4" aria-hidden /> Delete user
							</ConfirmButton>
						</form>
					</section>
				)}
			</div>
		</>
	);
}
