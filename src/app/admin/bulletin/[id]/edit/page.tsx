import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { deleteBulletinItem } from "../../actions";
import { BulletinForm } from "../../bulletin-form";
import { BULLETIN_ERRORS, BULLETIN_NOTICES } from "../../notices";
import { requireAdmin } from "@/lib/auth";
import { adminBulletinCategories, adminBulletinPublishers, adminGetBulletin, adminRelationChoices } from "@/lib/bulletin";
import { bulletinState, itemPath } from "@/lib/bulletin-shared";
import { messageFor, param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { DangerZone, UUID } from "@/components/admin/form-parts";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Edit bulletin item" };

export default async function EditBulletinPage({ params, searchParams }: PageProps<"/admin/bulletin/[id]/edit">) {
	await requireAdmin();
	const { id } = await params;
	const sp = await searchParams;
	if (!UUID.test(id)) notFound();

	const [item, categories, publishers, relations] = await Promise.all([adminGetBulletin(id), adminBulletinCategories(), adminBulletinPublishers(), adminRelationChoices()]);
	if (!item) notFound();

	return (
		<>
			<PageHeader
				title={item.title}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Bulletin Board", href: "/admin/bulletin" },
					{ label: "Edit" },
				]}
				actions={
					bulletinState(item) === "published" && (
						<a href={itemPath(item)} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
							<ExternalLink className="h-4 w-4" aria-hidden /> View live
						</a>
					)
				}
			/>
			<div className="mb-6 space-y-3">
				<FlashMessage error={messageFor(BULLETIN_ERRORS, param(sp, "error"))} />
				<FlashMessage notice={messageFor(BULLETIN_NOTICES, param(sp, "notice"))} />
			</div>
			<BulletinForm key={item.updated_at} item={item} choices={{ categories, publishers, ...relations }} />
			<DangerZone
				title="Delete this item"
				description="This permanently removes it. To hide it but keep it, use Archive instead."
				confirm={`Delete “${item.title}”? This cannot be undone.`}
				action={deleteBulletinItem}
				id={item.id}
			/>
		</>
	);
}
