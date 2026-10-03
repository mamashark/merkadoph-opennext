import { saveBlog } from "./actions";
import type { Blog } from "@/lib/blogs";
import { BasicsSection, ContentForm, ContentSection, CoverCard, Field, FormCard, PublishCard, SeoCard, TagsCard } from "@/components/admin/form-parts";
import { inputClass } from "@/lib/ui";

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
					<ContentSection defaultValue={blog?.content} />
				</>
			}
			aside={
				<>
					<PublishCard row={blog} noun="post" />
					<CoverCard row={blog} />
					<TagsCard row={blog} placeholder="market, local food, events" />
					<SeoCard row={blog} />
				</>
			}
		/>
	);
}
