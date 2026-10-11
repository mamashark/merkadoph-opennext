import Link from "next/link";
import { saveShippingMethod } from "./actions";
import { SHIPPING_TYPES, type ShippingMethod } from "@/server/shop/shipping";
import { Field, FormCard } from "@/components/admin/form-parts";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass, inputClass } from "@/lib/ui";

const checkbox = "h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 dark:border-slate-600 dark:bg-slate-800";

/** Server-rendered form for one shipping method. Fields that don't apply to the chosen type are ignored on save. */
export function ShippingMethodForm({ method, currency }: { method?: ShippingMethod; currency: string }) {
	const m = method;
	return (
		<form action={saveShippingMethod} className="max-w-3xl space-y-6">
			{m && <input type="hidden" name="id" value={m.id} />}
			<FormCard title="Method">
				<div className="grid gap-4 sm:grid-cols-2">
					<Field id="type" label="Delivery type">
						<select id="type" name="type" defaultValue={m?.type ?? "flat_rate"} className={inputClass}>
							{Object.entries(SHIPPING_TYPES).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</Field>
					<Field id="title" label="Name shown to customers">
						<input id="title" name="title" required maxLength={80} defaultValue={m?.title} placeholder="Home delivery (PostNord)" className={inputClass} />
					</Field>
				</div>
				<Field id="description" label="Description (optional)" hint="E.g. delivery time: “1–3 working days”.">
					<input id="description" name="description" maxLength={300} defaultValue={m?.description ?? ""} className={inputClass} />
				</Field>
				<div className="grid gap-4 sm:grid-cols-3">
					<Field id="price" label={`Price (${currency})`} hint="Flat rate and local delivery. Ignored for pickup (free) and weight-based (uses bands).">
						<input id="price" name="price" inputMode="decimal" defaultValue={m?.price ?? ""} placeholder="69" className={inputClass} />
					</Field>
					<Field id="free_over" label={`Free over (${currency})`} hint="Optional: free when the goods total reaches this.">
						<input id="free_over" name="free_over" inputMode="decimal" defaultValue={m?.free_over ?? ""} placeholder="999" className={inputClass} />
					</Field>
					<Field id="sort_order" label="Order at checkout" hint="Lower comes first.">
						<input id="sort_order" name="sort_order" type="number" step={1} defaultValue={m?.sort_order ?? 0} className={inputClass} />
					</Field>
				</div>
				<label className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
					<input type="checkbox" name="enabled" defaultChecked={m?.enabled ?? true} className={checkbox} /> Offer this method at checkout
				</label>
			</FormCard>

			<FormCard title="By weight">
				<Field id="weight_bands" label="Weight bands" hint="One per line: “up to kg = price”, e.g. “5 = 79” then “20 = 149”. Orders heavier than the last band can't use this method. Every product in the cart needs a weight, otherwise this method isn't offered.">
					<textarea id="weight_bands" name="weight_bands" rows={4} defaultValue={(m?.weight_bands ?? []).map((b) => `${b.max_kg} = ${b.price}`).join("\n")} placeholder={"5 = 79\n20 = 149"} className={`${inputClass} font-mono`} />
				</Field>
			</FormCard>

			<FormCard title="Local delivery area">
				<Field id="postcodes" label="Postcodes you deliver to" hint="Full postcodes or their first digits, separated by commas or new lines: “111, 112, 123 45”. A customer qualifies when their postcode starts with one of these.">
					<textarea id="postcodes" name="postcodes" rows={3} defaultValue={(m?.postcodes ?? []).map((p) => (p.length === 5 ? `${p.slice(0, 3)} ${p.slice(3)}` : p)).join(", ")} placeholder="111, 112, 113, 123 45" className={`${inputClass} font-mono`} />
				</Field>
			</FormCard>

			<FormCard title="Pickup">
				<Field id="pickup_address" label="Pickup address" hint="Shown at checkout and in the order email.">
					<textarea id="pickup_address" name="pickup_address" rows={2} maxLength={300} defaultValue={m?.pickup_address ?? ""} placeholder="Storgatan 1, 123 45 Stockholm — weekdays 10–17" className={inputClass} />
				</Field>
			</FormCard>

			<div className="flex justify-end gap-2">
				<Link href="/admin/shop/shipping" className={buttonClass("secondary")}>
					Cancel
				</Link>
				<SubmitButton pendingLabel="Saving…">{m ? "Save method" : "Add method"}</SubmitButton>
			</div>
		</form>
	);
}
