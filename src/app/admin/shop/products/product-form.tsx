import { saveProduct } from "../actions";
import type { Category, Product } from "@/lib/shop";
import { toDateTimeInput } from "@/lib/datetime";
import { BasicsSection, ContentForm, ContentSection, CoverCard, Field, FormCard, PublishCard, SeoCard } from "@/components/admin/form-parts";
import { GalleryField } from "@/components/media/gallery-field";
import { inputClass } from "@/lib/ui";

const checkbox = "h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 dark:border-slate-600 dark:bg-slate-800";

/** Orders categories as a tree (parents followed by their children) with depth for indentation. */
function tree(categories: Category[]) {
	const byParent = new Map<string | null, Category[]>();
	categories.forEach((c) => byParent.set(c.parent_id, [...(byParent.get(c.parent_id) ?? []), c]));
	const out: Array<Category & { depth: number }> = [];
	const walk = (parent: string | null, depth: number) => (byParent.get(parent) ?? []).forEach((c) => (out.push({ ...c, depth }), depth < 5 && walk(c.id, depth + 1)));
	walk(null, 0);
	// Orphans (parent deleted) still appear.
	categories.filter((c) => !out.some((o) => o.id === c.id)).forEach((c) => out.push({ ...c, depth: 0 }));
	return out;
}

/** Server-rendered WooCommerce-style product form. Only the editor, image fields and buttons hydrate. */
export function ProductForm({ product, categories, currency }: { product?: Product; categories: Category[]; currency: string }) {
	const p = product;
	// Shared form parts expect tags as plain names.
	const row = p ? { ...p, tags: p.tags.map((t) => t.name) } : undefined;
	const selected = new Set(p?.categories.map((c) => c.id));

	return (
		<ContentForm
			action={saveProduct}
			id={p?.id}
			main={
				<>
					<BasicsSection row={row} publicPath="/product" titlePlaceholder="Product name" />

					<FormCard title={`Pricing (${currency})`}>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="regular_price" label="Regular price">
								<input id="regular_price" name="regular_price" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={p?.regular_price ?? ""} className={inputClass} />
							</Field>
							<Field id="sale_price" label="Sale price" hint="Optional. Must be lower than the regular price.">
								<input id="sale_price" name="sale_price" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={p?.sale_price ?? ""} className={inputClass} />
							</Field>
							<Field id="sale_starts_at" label="Sale starts" hint="PH time. Blank = starts now.">
								<input id="sale_starts_at" name="sale_starts_at" type="datetime-local" defaultValue={toDateTimeInput(p?.sale_starts_at)} className={inputClass} />
							</Field>
							<Field id="sale_ends_at" label="Sale ends" hint="Blank = no end date.">
								<input id="sale_ends_at" name="sale_ends_at" type="datetime-local" defaultValue={toDateTimeInput(p?.sale_ends_at)} className={inputClass} />
							</Field>
						</div>
					</FormCard>

					<FormCard title="Inventory">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="sku" label="SKU" hint="Unique product code. Used as the ID in the product feed.">
								<input id="sku" name="sku" maxLength={64} defaultValue={p?.sku ?? ""} className={`${inputClass} font-mono`} />
							</Field>
							<Field id="stock_status" label="Stock status" hint="Ignored while stock is tracked (quantity decides).">
								<select id="stock_status" name="stock_status" defaultValue={p?.stock_status ?? "instock"} className={inputClass}>
									<option value="instock">In stock</option>
									<option value="outofstock">Out of stock</option>
									<option value="onbackorder">On backorder</option>
								</select>
							</Field>
						</div>
						<label className="flex items-start gap-3">
							<input type="checkbox" name="manage_stock" defaultChecked={p?.manage_stock} className={`mt-0.5 ${checkbox}`} />
							<span>
								<span className="block text-sm font-medium text-slate-800 dark:text-slate-200">Track stock quantity</span>
								<span className="block text-xs text-slate-600 dark:text-slate-400">Orders reduce the quantity; it shows as out of stock at 0.</span>
							</span>
						</label>
						<Field id="stock_quantity" label="Quantity in stock">
							<input id="stock_quantity" name="stock_quantity" type="number" step={1} defaultValue={p?.stock_quantity ?? ""} className={`${inputClass} sm:w-48`} />
						</Field>
					</FormCard>

					<FormCard title="Shipping">
						<div className="grid gap-4 sm:grid-cols-4">
							<Field id="weight_kg" label="Weight (kg)">
								<input id="weight_kg" name="weight_kg" type="number" min={0} step="0.001" defaultValue={p?.weight_kg ?? ""} className={inputClass} />
							</Field>
							<Field id="length_cm" label="Length (cm)">
								<input id="length_cm" name="length_cm" type="number" min={0} step="0.01" defaultValue={p?.length_cm ?? ""} className={inputClass} />
							</Field>
							<Field id="width_cm" label="Width (cm)">
								<input id="width_cm" name="width_cm" type="number" min={0} step="0.01" defaultValue={p?.width_cm ?? ""} className={inputClass} />
							</Field>
							<Field id="height_cm" label="Height (cm)">
								<input id="height_cm" name="height_cm" type="number" min={0} step="0.01" defaultValue={p?.height_cm ?? ""} className={inputClass} />
							</Field>
						</div>
					</FormCard>

					<ContentSection defaultValue={p?.content} label="Description" />

					<FormCard title="Product feed & identifiers">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="brand" label="Brand" hint="Defaults to the shop brand.">
								<input id="brand" name="brand" maxLength={80} defaultValue={p?.brand ?? ""} className={inputClass} />
							</Field>
							<Field id="condition" label="Condition">
								<select id="condition" name="condition" defaultValue={p?.condition ?? "new"} className={inputClass}>
									<option value="new">New</option>
									<option value="refurbished">Refurbished</option>
									<option value="used">Used</option>
								</select>
							</Field>
							<Field id="gtin" label="GTIN / EAN / barcode" hint="Digits only. Recommended for Google Shopping.">
								<input id="gtin" name="gtin" maxLength={20} inputMode="numeric" defaultValue={p?.gtin ?? ""} className={`${inputClass} font-mono`} />
							</Field>
							<Field id="mpn" label="MPN" hint="Manufacturer part number.">
								<input id="mpn" name="mpn" maxLength={70} defaultValue={p?.mpn ?? ""} className={`${inputClass} font-mono`} />
							</Field>
						</div>
					</FormCard>
				</>
			}
			aside={
				<>
					<PublishCard row={row} noun="product" />

					<FormCard title="Categories">
						{categories.length === 0 ? (
							<p className="text-sm text-slate-600 dark:text-slate-400">No categories yet. Create them under Shop → Categories.</p>
						) : (
							<fieldset>
								<legend className="sr-only">Categories</legend>
								<ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
									{tree(categories).map((c) => (
										<li key={c.id} style={{ paddingLeft: `${c.depth * 1.25}rem` }}>
											<label className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
												<input type="checkbox" name="category_ids" value={c.id} defaultChecked={selected.has(c.id)} className={checkbox} />
												{c.name}
											</label>
										</li>
									))}
								</ul>
							</fieldset>
						)}
					</FormCard>

					<FormCard title="Tags">
						<Field id="tags" label="Tags" hint="Comma separated. New tags are created automatically.">
							<input id="tags" name="tags" defaultValue={p?.tags.map((t) => t.name).join(", ")} placeholder="sale, gift, bestseller" className={inputClass} />
						</Field>
					</FormCard>

					<CoverCard row={row} title="Product image" />

					<FormCard title="Gallery">
						<GalleryField name="gallery" defaultValue={p?.gallery ?? []} />
					</FormCard>

					<FormCard title="Display">
						<label className="flex items-start gap-3">
							<input type="checkbox" name="is_featured" defaultChecked={p?.is_featured} className={`mt-0.5 ${checkbox}`} />
							<span>
								<span className="block text-sm font-medium text-slate-800 dark:text-slate-200">Featured</span>
								<span className="block text-xs text-slate-600 dark:text-slate-400">Shown first in the shop.</span>
							</span>
						</label>
						<Field id="sort_order" label="Sort order" hint="Lower numbers appear first.">
							<input id="sort_order" name="sort_order" type="number" step={1} defaultValue={p?.sort_order ?? 0} className={inputClass} />
						</Field>
					</FormCard>

					<SeoCard row={row} />
				</>
			}
		/>
	);
}
