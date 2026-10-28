import { savePortfolio } from "./actions";
import type { Portfolio } from "@/lib/portfolio";
import { BasicsSection, ContentForm, ContentSection, CoverCard, Field, FormCard, PublishCard, SeoCard, TagsCard } from "@/components/admin/form-parts";
import { GalleryField } from "@/components/media/gallery-field";
import { inputClass } from "@/lib/ui";

/** Server-rendered project form. Only the editor, image fields and buttons hydrate. */
export function PortfolioForm({ portfolio }: { portfolio?: Portfolio }) {
	const p = portfolio;
	return (
		<ContentForm
			action={savePortfolio}
			id={p?.id}
			main={
				<>
					<BasicsSection row={p} publicPath="/portfolio" titlePlaceholder="e.g. New standing-seam roof in Täby" />

					<FormCard title="Project images">
						<GalleryField
							name="images"
							defaultValue={p?.images ?? []}
							max={40}
							withDescription
							addLabel="Add project image"
							hint="Upload WebP images in Media first. The order here is the order on the site; the first image is used on cards when no cover is set. Alt text is required to publish."
						/>
					</FormCard>

					<FormCard title="Project details">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="location" label="Location" hint="Optional, e.g. “Täby, Stockholm”.">
								<input id="location" name="location" maxLength={120} defaultValue={p?.location ?? ""} className={inputClass} />
							</Field>
							<Field id="completed_on" label="Completed" hint="Optional completion date.">
								<input id="completed_on" name="completed_on" type="date" defaultValue={p?.completed_on ?? ""} className={inputClass} />
							</Field>
						</div>
					</FormCard>

					<ContentSection defaultValue={p?.content} label="Description" />
				</>
			}
			aside={
				<>
					<PublishCard row={p} noun="project" />
					<CoverCard row={p} title="Cover image (optional)" />
					<TagsCard row={p} placeholder="roofing, renovation" />
					<SeoCard row={p} pathPrefix="/portfolio/" />
				</>
			}
		/>
	);
}
