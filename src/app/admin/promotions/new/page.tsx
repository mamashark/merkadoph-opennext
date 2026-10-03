import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { PromotionForm } from "../promotion-form";

export const metadata: Metadata = { title: "New promotion" };

export default async function NewPromotionPage() {
	await requireAdmin();
	return (
		<>
			<PageHeader
				title="New promotion"
				description="Publish a sale, discount or limited-time offer."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Promotions", href: "/admin/promotions" },
					{ label: "New promotion" },
				]}
			/>
			<PromotionForm />
		</>
	);
}
