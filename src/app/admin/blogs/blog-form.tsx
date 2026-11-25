import { saveBlog } from "./actions";
import type { Blog } from "@/lib/blogs";
import { CAPTION_MAX, MAX_SLIDESHOW } from "@/lib/blog-layout";
import { BasicsSection, ContentForm, ContentSection, CoverCard, Field, FormCard, PublishCard, SeoCard, TagsCard } from "@/components/admin/form-parts";
import { PhotoLayoutField } from "@/components/admin/photo-layout-field";
import { GalleryField } from "@/components/media/gallery-field";
import { MediaField } from "@/components/media/media-field";
import { VideoField } from "@/components/media/video-field";
import { hintClass, inputClass, labelClass } from "@/lib/ui";

/** Server-rendered blog form. `defaultAuthor` pre-fills the byline for new posts. */
export function BlogForm({ blog, defaultAuthor }: { blog?: Blog; defaultAuthor?: string }) {
	return (
		<ContentForm
			action={saveBlog}
			id={blog?.id}
			main={
				<>
					<BasicsSection row={blog} publicPath="/blogs" titlePlaceholder="A clear, descriptive headline">
						<Field id="author_name" label="Author" hint="Byline shown on the post.">
							<input id="author_name" name="author_name" maxLength={120} defaultValue={blog ? (blog.author_name ?? "") : defaultAuthor} className={inputClass} />
						</Field>
					</BasicsSection>

					{/* Photo layout first, then the text that places it (approved mock-up). */}
					<FormCard title="Photos">
						<PhotoLayoutField layout={blog?.photo_layout ?? "A"} photos={blog?.layout_photos ?? []} />
					</FormCard>

					<FormCard title="Photo row">
						<GalleryField
							name="slideshow"
							defaultValue={(blog?.slideshow ?? []).map((p) => ({ url: p.url, alt: p.alt, description: p.caption }))}
							max={MAX_SLIDESHOW}
							withDescription
							captionRequired
							descriptionMax={CAPTION_MAX}
							addLabel="Add photo"
							minWidth={1200}
							hint="A row of big photos visitors swipe or step through, with the caption under each. It goes where you put [[slideshow]] in the text, or at the end. Caption required to publish; alt text is optional when the caption describes the photo. Use the arrows to reorder."
						/>
					</FormCard>

					<ContentSection defaultValue={blog?.content} markers />

					<FormCard title="Video or reel">
						<VideoField name="video_url" defaultValue={blog?.video_url} />
						<div role="group" aria-labelledby="video-poster-label" aria-describedby="video-poster-hint">
							<p id="video-poster-label" className={labelClass}>
								Poster image (optional)
							</p>
							<MediaField name="video_poster_url" defaultValue={blog?.video_poster_url} label="Poster image" />
							<p id="video-poster-hint" className={hintClass}>
								Shown before the video plays. Without one, the first frame is shown.
							</p>
						</div>
						<Field id="video_transcript" label="Transcript" hint="Required to publish a post with a video: what is said and shown in it, for people who can't watch or hear it. If it has speech, use a video with burned-in captions too.">
							<textarea id="video_transcript" name="video_transcript" rows={4} maxLength={5000} defaultValue={blog?.video_transcript ?? ""} className={inputClass} />
						</Field>
					</FormCard>
				</>
			}
			aside={
				<>
					<PublishCard row={blog} noun="post" />
					<CoverCard row={blog} />
					<TagsCard row={blog} placeholder="market, local food, events" />
					<SeoCard row={blog} pathPrefix="/blogs/" />
				</>
			}
		/>
	);
}
