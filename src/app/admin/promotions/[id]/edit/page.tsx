import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { deletePromotion } from "../../actions";
import { PromotionForm } from "../../promotion-form";
import { requireAdmin } from "@/lib/auth";
import { adminGetPromotion } from "@/lib/promotions";
import { contentState } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { DangerZone, saveNotices, UUID } from "@/components/admin/form-parts";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Edit promotion" };

export default async function EditPromotionPage({ params, searchParams }: PageProps<"/admin/promotions/[id]/edit">) {
	await requireAdmin();
	const { id } = await params;
	const { notice } = await searchParams;
	if (!UUID.test(id)) notFound();

	const promotion = await adminGetPromotion(id);
	if (!promotion) notFound();

	return (
		<>
			<PageHeader
				title={promotion.title}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Promotions", href: "/admin/promotions" },
					{ label: "Edit" },
				]}
				actions={
					contentState(promotion) === "published" && (
						<a href={`/promotions/${promotion.slug}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
							<ExternalLink className="h-4 w-4" aria-hidden /> View live
						</a>
					)
				}
			/>
			<div className="mb-6">
				<FlashMessage notice={typeof notice === "string" ? saveNotices[notice] : undefined} />
			</div>
			<PromotionForm key={promotion.updated_at} promotion={promotion} />
			<DangerZone
				title="Delete this promotion"
				description="This permanently removes the promotion page."
				confirm={`Delete “${promotion.title}”? This cannot be undone.`}
				action={deletePromotion}
				id={promotion.id}
			/>
		</>
	);
}
