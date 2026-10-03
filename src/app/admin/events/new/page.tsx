import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
	await requireAdmin();
	return (
		<>
			<PageHeader
				title="New event"
				description="Announce a market day, workshop or community gathering."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Events", href: "/admin/events" },
					{ label: "New event" },
				]}
			/>
			<EventForm />
		</>
	);
}
