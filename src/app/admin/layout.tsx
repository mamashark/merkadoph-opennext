import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { AdminShell, SIDEBAR_COOKIE } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
	title: { default: "Admin", template: "%s · Admin · Merkado PH" },
	robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
	const user = await requireAdmin();
	const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";

	return (
		<AdminShell user={user} defaultCollapsed={collapsed}>
			{children}
		</AdminShell>
	);
}
