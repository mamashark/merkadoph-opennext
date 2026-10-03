import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getServiceCategories } from "@/lib/services";
import { PageHeader } from "@/components/admin/page-header";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = { title: "New service" };

export default async function NewServicePage() {
	await requireAdmin();
	const categories = await getServiceCategories("admin");
	return (
		<>
			<PageHeader
				title="New service"
				description="Describe a service Merkado PH offers."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Services", href: "/admin/services" },
					{ label: "New service" },
				]}
			/>
			<ServiceForm categories={categories} />
		</>
	);
}
