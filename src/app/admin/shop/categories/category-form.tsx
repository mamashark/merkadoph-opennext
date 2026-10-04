import { saveCategory } from "../actions";
import type { Category } from "@/lib/shop";
import { Field } from "@/components/admin/form-parts";
import { MediaField } from "@/components/media/media-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cardClass, inputClass } from "@/lib/ui";

export function CategoryForm({ category, categories }: { category?: Category; categories: Category[] }) {
	const c = category;
	// A category can't be nested under itself or one of its own descendants.
	const blocked = new Set<string>();
	if (c) {
		blocked.add(c.id);
		let grew = true;
		while (grew) {
			grew = false;
			for (const x of categories) if (x.parent_id && blocked.has(x.parent_id) && !blocked.has(x.id)) (blocked.add(x.id), (grew = true));
		}
	}

	return (
		<form action={saveCategory} className={`${cardClass} space-y-4 p-5`}>
			{c && <input type="hidden" name="id" value={c.id} />}
			<h2 className="font-semibold text-slate-900 dark:text-white">{c ? "Edit category" : "Add category"}</h2>
			<Field id="name" label="Name">
				<input id="name" name="name" required maxLength={120} defaultValue={c?.name} className={inputClass} />
			</Field>
			<Field id="slug" label="Slug" hint="Used in the URL: /shop/your-slug. Blank = from the name.">
				<input id="slug" name="slug" maxLength={80} pattern="[a-zA-Z0-9\- ]*" defaultValue={c?.slug} className={inputClass} />
			</Field>
			<Field id="parent_id" label="Parent category">
				<select id="parent_id" name="parent_id" defaultValue={c?.parent_id ?? ""} className={inputClass}>
					<option value="">None (top level)</option>
					{categories
						.filter((x) => !blocked.has(x.id))
						.map((x) => (
							<option key={x.id} value={x.id}>
								{x.name}
							</option>
						))}
				</select>
			</Field>
			<Field id="description" label="Description" hint="Shown at the top of the category page.">
				<textarea id="description" name="description" rows={3} maxLength={2000} defaultValue={c?.description ?? ""} className={inputClass} />
			</Field>
			<div>
				<p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Image</p>
				<MediaField name="image_url" defaultValue={c?.image_url} label="Category image" />
			</div>
			<Field id="sort_order" label="Sort order" hint="Lower numbers appear first.">
				<input id="sort_order" name="sort_order" type="number" step={1} defaultValue={c?.sort_order ?? 0} className={inputClass} />
			</Field>
			<details className="rounded-lg border border-slate-200 dark:border-slate-800">
				<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200">Search engine (SEO)</summary>
				<div className="space-y-4 border-t border-slate-200 p-3 dark:border-slate-800">
					<Field id="meta_title" label="Meta title" hint="Up to 70 characters.">
						<input id="meta_title" name="meta_title" maxLength={70} defaultValue={c?.meta_title ?? ""} className={inputClass} />
					</Field>
					<Field id="meta_description" label="Meta description" hint="Up to 170 characters.">
						<textarea id="meta_description" name="meta_description" rows={2} maxLength={170} defaultValue={c?.meta_description ?? ""} className={inputClass} />
					</Field>
				</div>
			</details>
			<SubmitButton pendingLabel="Saving…" className="w-full">
				{c ? "Save category" : "Add category"}
			</SubmitButton>
		</form>
	);
}
