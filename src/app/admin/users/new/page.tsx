import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { FlashMessage } from "@/components/ui/alert";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "Add user" };

export default async function NewUserPage({ searchParams }: PageProps<"/admin/users/new">) {
	await requireAdmin();
	const params = await searchParams;
	const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

	return (
		<>
			<PageHeader
				title="Add user"
				description="The account can sign in right away with this email and password."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Users", href: "/admin/users" },
					{ label: "Add user" },
				]}
			/>
			<div className="max-w-2xl space-y-4">
				<FlashMessage error={str("error")} />
				<UserForm draft={{ name: str("name"), email: str("email") }} />
			</div>
		</>
	);
}
