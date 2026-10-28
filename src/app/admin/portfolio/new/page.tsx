import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { PortfolioForm } from "../portfolio-form";

export const metadata: Metadata = { title: "New project" };

export default async function NewPortfolioPage() {
	await requireAdmin();
	return (
		<>
			<PageHeader
				title="New project"
				description="Show a finished project with photos and a short story."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Portfolio", href: "/admin/portfolio" },
					{ label: "New project" },
				]}
			/>
			<PortfolioForm />
		</>
	);
}
