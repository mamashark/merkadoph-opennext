import { saveEvent } from "./actions";
import type { EventItem } from "@/lib/events";
import { toDateTimeInput } from "@/lib/datetime";
import { BasicsSection, ContentForm, ContentSection, CoverCard, Field, FormCard, PublishCard, SeoCard, TagsCard } from "@/components/admin/form-parts";
import { inputClass } from "@/lib/ui";

export function EventForm({ event }: { event?: EventItem }) {
	return (
		<ContentForm
			action={saveEvent}
			id={event?.id}
			main={
				<>
					<BasicsSection row={event} publicPath="/events" titlePlaceholder="e.g. Sunday Night Market at Kapitolyo" />

					<FormCard title="When">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="starts_at" label="Starts" hint="PH time.">
								<input id="starts_at" name="starts_at" type="datetime-local" required defaultValue={toDateTimeInput(event?.starts_at)} className={inputClass} />
							</Field>
							<Field id="ends_at" label="Ends" hint="Optional.">
								<input id="ends_at" name="ends_at" type="datetime-local" defaultValue={toDateTimeInput(event?.ends_at)} className={inputClass} />
							</Field>
						</div>
					</FormCard>

					<FormCard title="Where">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="venue_name" label="Venue">
								<input id="venue_name" name="venue_name" maxLength={200} defaultValue={event?.venue_name ?? ""} placeholder="Kapitolyo Open Grounds" className={inputClass} />
							</Field>
							<Field id="map_url" label="Map link" hint="Google Maps or Waze URL.">
								<input id="map_url" name="map_url" type="url" maxLength={1000} defaultValue={event?.map_url ?? ""} placeholder="https://maps.google.com/…" className={inputClass} />
							</Field>
						</div>
						<Field id="venue_address" label="Address">
							<input id="venue_address" name="venue_address" maxLength={300} defaultValue={event?.venue_address ?? ""} placeholder="Street, barangay, city" className={inputClass} />
						</Field>
					</FormCard>

					<FormCard title="Details">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="organizer" label="Organizer">
								<input id="organizer" name="organizer" maxLength={120} defaultValue={event?.organizer ?? ""} placeholder="Merkado PH" className={inputClass} />
							</Field>
							<Field id="price_info" label="Admission">
								<input id="price_info" name="price_info" maxLength={120} defaultValue={event?.price_info ?? ""} placeholder="Free entry · ₱150 for workshops" className={inputClass} />
							</Field>
						</div>
						<Field id="registration_url" label="Registration / tickets link" hint="Shows a “Register” button on the event page.">
							<input id="registration_url" name="registration_url" type="url" maxLength={1000} defaultValue={event?.registration_url ?? ""} placeholder="https://…" className={inputClass} />
						</Field>
					</FormCard>

					<ContentSection defaultValue={event?.content} label="Description" />
				</>
			}
			aside={
				<>
					<PublishCard row={event} noun="event" />
					<CoverCard row={event} />
					<TagsCard row={event} placeholder="night market, food, family" />
					<SeoCard row={event} />
				</>
			}
		/>
	);
}
