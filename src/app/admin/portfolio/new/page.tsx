import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { PortfolioForm } from "../portfolio-form";

export const metadata: Metadata = { title: "New Community Impact entry" };

export default async function NewPortfolioPage() {
	await requireAdmin();
	return (
		<>
			<PageHeader
				title="New entry"
				description="An event or initiative: the date it took place, photos and the story. It shows under its year on the homepage and /impact."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Community Impact", href: "/admin/portfolio" },
					{ label: "New entry" },
				]}
			/>
			<PortfolioForm />
		</>
	);
}
