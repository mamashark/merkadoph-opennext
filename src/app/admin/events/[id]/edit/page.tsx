import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { deleteEvent } from "../../actions";
import { EventForm } from "../../event-form";
import { requireAdmin } from "@/lib/auth";
import { adminGetEvent } from "@/lib/events";
import { contentState } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { DangerZone, saveNotices, UUID } from "@/components/admin/form-parts";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params, searchParams }: PageProps<"/admin/events/[id]/edit">) {
	await requireAdmin();
	const { id } = await params;
	const { notice } = await searchParams;
	if (!UUID.test(id)) notFound();

	const event = await adminGetEvent(id);
	if (!event) notFound();

	return (
		<>
			<PageHeader
				title={event.title}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Events", href: "/admin/events" },
					{ label: "Edit" },
				]}
				actions={
					contentState(event) === "published" && (
						<a href={`/events/${event.slug}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
							<ExternalLink className="h-4 w-4" aria-hidden /> View live
						</a>
					)
				}
			/>
			<div className="mb-6">
				<FlashMessage notice={typeof notice === "string" ? saveNotices[notice] : undefined} />
			</div>
			<EventForm key={event.updated_at} event={event} />
			<DangerZone
				title="Delete this event"
				description="This permanently removes the event page."
				confirm={`Delete “${event.title}”? This cannot be undone.`}
				action={deleteEvent}
				id={event.id}
			/>
		</>
	);
}
