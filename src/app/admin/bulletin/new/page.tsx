import type { Metadata } from "next";
import { BulletinForm } from "../bulletin-form";
import { requireAdmin } from "@/lib/auth";
import { adminBulletinCategories, adminBulletinPublishers, adminRelationChoices } from "@/lib/bulletin";
import { BULLETIN_TYPES, type BulletinType } from "@/lib/bulletin-shared";
import { messageFor, param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { FlashMessage } from "@/components/ui/alert";
import { BULLETIN_ERRORS } from "../notices";

export const metadata: Metadata = { title: "New bulletin item" };

export default async function NewBulletinPage({ searchParams }: PageProps<"/admin/bulletin/new">) {
	await requireAdmin();
	const params = await searchParams;
	const t = param(params, "type");
	const initialType = ((BULLETIN_TYPES as readonly string[]).includes(t) ? t : "community_notice") as BulletinType;
	const [categories, publishers, relations] = await Promise.all([adminBulletinCategories(), adminBulletinPublishers(), adminRelationChoices()]);

	return (
		<>
			<PageHeader
				title="New bulletin item"
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Bulletin Board", href: "/admin/bulletin" },
					{ label: "New" },
				]}
			/>
			<div className="mb-6">
				<FlashMessage error={messageFor(BULLETIN_ERRORS, param(params, "error"))} />
			</div>
			<BulletinForm choices={{ categories, publishers, ...relations }} initialType={initialType} />
		</>
	);
}
