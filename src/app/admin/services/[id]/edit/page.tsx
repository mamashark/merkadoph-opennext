import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { deleteService } from "../../actions";
import { ServiceForm } from "../../service-form";
import { requireAdmin } from "@/lib/auth";
import { adminGetService, getServiceCategories } from "@/lib/services";
import { contentState } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { DangerZone, saveNotices, UUID } from "@/components/admin/form-parts";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Edit service" };

export default async function EditServicePage({ params, searchParams }: PageProps<"/admin/services/[id]/edit">) {
	await requireAdmin();
	const { id } = await params;
	const { notice } = await searchParams;
	if (!UUID.test(id)) notFound();

	const [service, categories] = await Promise.all([adminGetService(id), getServiceCategories("admin")]);
	if (!service) notFound();

	return (
		<>
			<PageHeader
				title={service.title}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Services", href: "/admin/services" },
					{ label: "Edit" },
				]}
				actions={
					contentState(service) === "published" && (
						<a href={`/services/${service.slug}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
							<ExternalLink className="h-4 w-4" aria-hidden /> View live
						</a>
					)
				}
			/>
			<div className="mb-6">
				<FlashMessage notice={typeof notice === "string" ? saveNotices[notice] : undefined} />
			</div>
			<ServiceForm key={service.updated_at} service={service} categories={categories} />
			<DangerZone
				title="Delete this service"
				description="This permanently removes the service page."
				confirm={`Delete “${service.title}”? This cannot be undone.`}
				action={deleteService}
				id={service.id}
			/>
		</>
	);
}
