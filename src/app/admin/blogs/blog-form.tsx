import { Globe, Save, Send, Undo2 } from "lucide-react";
import { saveBlog } from "./actions";
import { formatDate, type Blog } from "@/lib/blogs";
import { MarkdownEditor } from "@/components/blog/markdown-editor";
import { MediaField } from "@/components/media/media-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cardClass, cn, hintClass, inputClass, labelClass } from "@/lib/ui";

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
	return (
		<section className={cn(cardClass, className)}>
			<h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">{title}</h2>
			<div className="space-y-4 p-5">{children}</div>
		</section>
	);
}

/** Server-rendered blog form. Only the editor, media field and submit buttons hydrate. */
export function BlogForm({ blog }: { blog?: Blog }) {
	const published = blog?.status === "published";

	return (
		<form action={saveBlog} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
			{blog && <input type="hidden" name="id" value={blog.id} />}

			<div className="min-w-0 space-y-6">
				<section className={`${cardClass} space-y-5 p-5`}>
					<div>
						<label htmlFor="title" className={labelClass}>
							Title
						</label>
						<input
							id="title"
							name="title"
							required
							maxLength={200}
							defaultValue={blog?.title}
							placeholder="A clear, descriptive headline"
							className={`${inputClass} text-base font-medium`}
						/>
					</div>
					<div>
						<label htmlFor="slug" className={labelClass}>
							URL slug
						</label>
						<div className="flex rounded-lg shadow-sm">
							<span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">/blogs/</span>
							<input
								id="slug"
								name="slug"
								maxLength={80}
								pattern="[a-zA-Z0-9\- ]*"
								defaultValue={blog?.slug}
								placeholder="generated-from-title"
								className={`${inputClass} rounded-l-none shadow-none`}
							/>
						</div>
						<p className={hintClass}>Leave blank to generate it from the title. Changing it on a live post breaks existing links.</p>
					</div>
					<div>
						<label htmlFor="excerpt" className={labelClass}>
							Excerpt
						</label>
						<textarea
							id="excerpt"
							name="excerpt"
							rows={3}
							maxLength={500}
							defaultValue={blog?.excerpt ?? ""}
							placeholder="One or two sentences shown on the blog listing."
							className={inputClass}
						/>
					</div>
				</section>

				<div>
					<label htmlFor="content" className={labelClass}>
						Content
					</label>
					<MarkdownEditor name="content" defaultValue={blog?.content ?? ""} />
				</div>
			</div>

			<aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
				<Card title="Publish">
					<dl className="space-y-2 text-sm">
						<div className="flex justify-between">
							<dt className="text-slate-500">Status</dt>
							<dd>
								<span
									className={cn(
										"rounded-full px-2 py-0.5 text-xs font-medium",
										published ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
									)}
								>
									{published ? "Published" : "Draft"}
								</span>
							</dd>
						</div>
						{blog?.published_at && (
							<div className="flex justify-between">
								<dt className="text-slate-500">Published</dt>
								<dd className="text-slate-700">{formatDate(blog.published_at)}</dd>
							</div>
						)}
						{blog && (
							<div className="flex justify-between">
								<dt className="text-slate-500">Last saved</dt>
								<dd className="text-slate-700">{formatDate(blog.updated_at, { dateStyle: "medium", timeStyle: "short" })}</dd>
							</div>
						)}
					</dl>
					<div className="flex flex-col gap-2 pt-1">
						{published ? (
							<>
								<SubmitButton name="intent" value="save" pendingLabel="Updating…" variant="accent">
									<Globe className="h-4 w-4" aria-hidden /> Update post
								</SubmitButton>
								<SubmitButton name="intent" value="unpublish" pendingLabel="Unpublishing…" variant="secondary">
									<Undo2 className="h-4 w-4" aria-hidden /> Revert to draft
								</SubmitButton>
							</>
						) : (
							<>
								<SubmitButton name="intent" value="draft" pendingLabel="Saving…" variant="secondary">
									<Save className="h-4 w-4" aria-hidden /> Save draft
								</SubmitButton>
								<SubmitButton name="intent" value="publish" pendingLabel="Publishing…" variant="accent">
									<Send className="h-4 w-4" aria-hidden /> Publish
								</SubmitButton>
							</>
						)}
					</div>
				</Card>

				<Card title="Cover image">
					<MediaField name="cover_image_url" defaultValue={blog?.cover_image_url} label="Cover image" />
					<div>
						<label htmlFor="cover_image_alt" className={labelClass}>
							Alt text
						</label>
						<input
							id="cover_image_alt"
							name="cover_image_alt"
							maxLength={200}
							defaultValue={blog?.cover_image_alt ?? ""}
							placeholder="Describe the image"
							className={inputClass}
						/>
						<p className={hintClass}>Also used for social sharing previews.</p>
					</div>
				</Card>

				<Card title="Tags">
					<div>
						<label htmlFor="tags" className="sr-only">
							Tags
						</label>
						<input id="tags" name="tags" defaultValue={blog?.tags.join(", ")} placeholder="market, local food, events" className={inputClass} />
						<p className={hintClass}>Comma separated, up to 10.</p>
					</div>
				</Card>

				<Card title="Search engine (SEO)">
					<div>
						<label htmlFor="meta_title" className={labelClass}>
							Meta title
						</label>
						<input id="meta_title" name="meta_title" maxLength={70} defaultValue={blog?.meta_title ?? ""} placeholder="Defaults to the post title" className={inputClass} />
						<p className={hintClass}>Up to 70 characters.</p>
					</div>
					<div>
						<label htmlFor="meta_description" className={labelClass}>
							Meta description
						</label>
						<textarea
							id="meta_description"
							name="meta_description"
							rows={3}
							maxLength={170}
							defaultValue={blog?.meta_description ?? ""}
							placeholder="Defaults to the excerpt"
							className={inputClass}
						/>
						<p className={hintClass}>Up to 170 characters. Shown in Google results.</p>
					</div>
				</Card>
			</aside>
		</form>
	);
}
