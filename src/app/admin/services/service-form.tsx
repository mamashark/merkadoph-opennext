import { saveService } from "./actions";
import type { Service } from "@/lib/services";
import { BasicsSection, ContentForm, ContentSection, CoverCard, Field, FormCard, PublishCard, SeoCard, TagsCard } from "@/components/admin/form-parts";
import { inputClass } from "@/lib/ui";

export function ServiceForm({ service, categories }: { service?: Service; categories: string[] }) {
	const s = service;
	return (
		<ContentForm
			action={saveService}
			id={s?.id}
			main={
				<>
					<BasicsSection row={s} publicPath="/services" titlePlaceholder="e.g. Same-day Grocery Delivery" />

					<FormCard title="Service details">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="category" label="Category" hint="Pick an existing one or type a new one.">
								<input id="category" name="category" list="service-categories" maxLength={60} defaultValue={s?.category ?? ""} placeholder="Delivery" className={inputClass} />
								<datalist id="service-categories">
									{categories.map((c) => (
										<option key={c} value={c} />
									))}
								</datalist>
							</Field>
							<Field id="price_label" label="Pricing" hint="Free text, e.g. “Starts at ₱99”.">
								<input id="price_label" name="price_label" maxLength={80} defaultValue={s?.price_label ?? ""} placeholder="Starts at ₱99" className={inputClass} />
							</Field>
						</div>
						<div className="grid gap-4 sm:grid-cols-[200px_1fr]">
							<Field id="cta_label" label="Button label">
								<input id="cta_label" name="cta_label" maxLength={40} defaultValue={s?.cta_label ?? ""} placeholder="Inquire now" className={inputClass} />
							</Field>
							<Field id="cta_url" label="Button link" hint="A page, form, Messenger or mailto: link.">
								<input id="cta_url" name="cta_url" type="url" maxLength={1000} defaultValue={s?.cta_url ?? ""} placeholder="https://…" className={inputClass} />
							</Field>
						</div>
					</FormCard>

					<ContentSection defaultValue={s?.content} label="Description" />
				</>
			}
			aside={
				<>
					<PublishCard row={s} noun="service" />
					<FormCard title="Display">
						<label className="flex items-start gap-3">
							<input type="checkbox" name="is_featured" defaultChecked={s?.is_featured} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 dark:border-slate-600 dark:bg-slate-800" />
							<span>
								<span className="block text-sm font-medium text-slate-800 dark:text-slate-200">Featured</span>
								<span className="block text-xs text-slate-600 dark:text-slate-400">Shown first on the services page.</span>
							</span>
						</label>
						<Field id="sort_order" label="Sort order" hint="Lower numbers appear first.">
							<input id="sort_order" name="sort_order" type="number" min={-9999} max={9999} step={1} defaultValue={s?.sort_order ?? 0} className={inputClass} />
						</Field>
					</FormCard>
					<CoverCard row={s} />
					<TagsCard row={s} placeholder="delivery, wholesale" />
					<SeoCard row={s} />
				</>
			}
		/>
	);
}
