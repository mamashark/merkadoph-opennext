import { savePortfolio } from "./actions";
import type { Portfolio } from "@/lib/portfolio";
import { adminBlogOptions } from "@/lib/blogs";
import { contentState } from "@/lib/content";
import { BasicsSection, ContentForm, ContentSection, CoverCard, Field, FormCard, PublishCard, SeoCard, TagsCard } from "@/components/admin/form-parts";
import { GalleryField } from "@/components/media/gallery-field";
import { inputClass } from "@/lib/ui";

/** Server-rendered project form. Only the editor, image fields and buttons hydrate. */
export async function PortfolioForm({ portfolio }: { portfolio?: Portfolio }) {
	const p = portfolio;
	const all = await adminBlogOptions(p?.blog_id).catch(() => null);
	// Posts whose page redirects (moved to Community Impact) can't be linked; the current one stays visible so it's clear why it goes.
	const blogs = all?.filter((b) => !b.moved || b.id === p?.blog_id) ?? null;
	const stateLabel = { draft: " (draft)", scheduled: " (scheduled)", published: "" } as const;
	return (
		<ContentForm
			action={savePortfolio}
			id={p?.id}
			main={
				<>
					<BasicsSection row={p} publicPath="/impact" titlePlaceholder="e.g. Spring Market 2026 at Torslanda Torg" />

					<FormCard title="Photos">
						<GalleryField
							name="images"
							defaultValue={p?.images ?? []}
							max={40}
							withDescription
							addLabel="Add photo"
							minWidth={1200}
							hint="Upload WebP photos in Media first, ideally 1600px wide or more so they stay sharp (smaller ones are flagged). The order here is the order on the site; the first photo is used on cards and in the constellation when no cover is set. Alt text is required to publish."
						/>
					</FormCard>

					<FormCard title="When and where">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="completed_on" label="Date" hint="The day it took place (the first day if it ran longer). Required to publish: it puts the entry under its year.">
								<input id="completed_on" name="completed_on" type="date" defaultValue={p?.completed_on ?? ""} className={inputClass} />
							</Field>
							<Field id="location" label="Location" hint="Optional, e.g. “Torslanda Torg, Göteborg”.">
								<input id="location" name="location" maxLength={120} defaultValue={p?.location ?? ""} className={inputClass} />
							</Field>
						</div>
					</FormCard>

					<ContentSection defaultValue={p?.content} label="Description" />
				</>
			}
			aside={
				<>
					<PublishCard row={p} noun="entry" />
					<CoverCard row={p} title="Cover image (optional)" />
					<FormCard title="Related blog post">
						<Field
							id="blog_id"
							label="The story behind this entry"
							hint={
								blogs
									? "Optional. Shows a “Read the story” card here and a “See the photos” card on the post. Drafts are listed, but the link only appears once the post is live. Posts moved to Community Impact (their page redirects) aren’t listed."
									: "Couldn’t load the blog posts, so the current link is kept as it is. Reload to try again."
							}
						>
							{!blogs && <input type="hidden" name="blog_id" value={p?.blog_id ?? ""} />}
							<select id="blog_id" name={blogs ? "blog_id" : undefined} defaultValue={p?.blog_id ?? ""} disabled={!blogs} className={inputClass}>
								<option value="">No linked post</option>
								{(blogs ?? []).map((b) => (
									<option key={b.id} value={b.id}>
										{b.title}
										{b.moved ? " (moved: its page redirects, so this link will be removed on save)" : stateLabel[contentState(b)]}
									</option>
								))}
							</select>
						</Field>
					</FormCard>
					<TagsCard row={p} placeholder="Spring Market, Christmas Market, Tambayan Sessions" />
					<SeoCard row={p} pathPrefix="/impact/" />
				</>
			}
		/>
	);
}
