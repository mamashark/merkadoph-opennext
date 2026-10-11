import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { deletePortfolio } from "../../actions";
import { PortfolioForm } from "../../portfolio-form";
import { requireAdmin } from "@/lib/auth";
import { adminGetPortfolio } from "@/lib/portfolio";
import { contentState } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { DangerZone, saveNotices, UUID } from "@/components/admin/form-parts";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditPortfolioPage({ params, searchParams }: PageProps<"/admin/portfolio/[id]/edit">) {
	await requireAdmin();
	const { id } = await params;
	const { notice } = await searchParams;
	if (!UUID.test(id)) notFound();

	const portfolio = await adminGetPortfolio(id);
	if (!portfolio) notFound();

	return (
		<>
			<PageHeader
				title={portfolio.title}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Portfolio", href: "/admin/portfolio" },
					{ label: "Edit" },
				]}
				actions={
					contentState(portfolio) === "published" && (
						<a href={`/portfolio/${portfolio.slug}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
							<ExternalLink className="h-4 w-4" aria-hidden /> View live
						</a>
					)
				}
			/>
			<div className="mb-6">
				<FlashMessage notice={typeof notice === "string" ? saveNotices[notice] : undefined} />
			</div>
			<PortfolioForm key={portfolio.updated_at} portfolio={portfolio} />
			<DangerZone
				title="Delete this project"
				description="This permanently removes the project page and its homepage tab. Images stay in Media."
				confirm={`Delete “${portfolio.title}”? This cannot be undone.`}
				action={deletePortfolio}
				id={portfolio.id}
			/>
		</>
	);
}
