import { savePromotion } from "./actions";
import type { Promotion } from "@/lib/promotions";
import { toDateTimeInput } from "@/lib/datetime";
import { BasicsSection, ContentForm, ContentSection, CoverCard, Field, FormCard, PublishCard, SeoCard, TagsCard } from "@/components/admin/form-parts";
import { inputClass } from "@/lib/ui";

export function PromotionForm({ promotion }: { promotion?: Promotion }) {
	const p = promotion;
	return (
		<ContentForm
			action={savePromotion}
			id={p?.id}
			main={
				<>
					<BasicsSection row={p} publicPath="/promotions" titlePlaceholder="e.g. Back-to-School Sale" />

					<FormCard title="Offer">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="discount_label" label="Discount badge" hint="Short and punchy, shown on the card.">
								<input id="discount_label" name="discount_label" maxLength={40} defaultValue={p?.discount_label ?? ""} placeholder="20% OFF · Buy 1 Take 1" className={inputClass} />
							</Field>
							<Field id="promo_code" label="Promo code" hint="Optional. Visitors can copy it.">
								<input id="promo_code" name="promo_code" maxLength={40} defaultValue={p?.promo_code ?? ""} placeholder="MERKADO20" className={`${inputClass} font-mono uppercase`} />
							</Field>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="starts_at" label="Valid from" hint="PH time. Leave blank to start immediately.">
								<input id="starts_at" name="starts_at" type="datetime-local" defaultValue={toDateTimeInput(p?.starts_at)} className={inputClass} />
							</Field>
							<Field id="ends_at" label="Valid until" hint="Leave blank for no end date.">
								<input id="ends_at" name="ends_at" type="datetime-local" defaultValue={toDateTimeInput(p?.ends_at)} className={inputClass} />
							</Field>
						</div>
					</FormCard>

					<FormCard title="Call to action">
						<div className="grid gap-4 sm:grid-cols-[200px_1fr]">
							<Field id="cta_label" label="Button label">
								<input id="cta_label" name="cta_label" maxLength={40} defaultValue={p?.cta_label ?? ""} placeholder="Shop now" className={inputClass} />
							</Field>
							<Field id="cta_url" label="Button link">
								<input id="cta_url" name="cta_url" type="url" maxLength={1000} defaultValue={p?.cta_url ?? ""} placeholder="https://…" className={inputClass} />
							</Field>
						</div>
					</FormCard>

					<ContentSection defaultValue={p?.content} label="Details" />

					<FormCard title="Terms & conditions">
						<Field id="terms" label="Terms" hint="Plain text, one condition per line.">
							<textarea id="terms" name="terms" rows={5} maxLength={4000} defaultValue={p?.terms ?? ""} className={inputClass} />
						</Field>
					</FormCard>
				</>
			}
			aside={
				<>
					<PublishCard row={p} noun="promotion" />
					<CoverCard row={p} />
					<TagsCard row={p} placeholder="sale, groceries, weekend" />
					<SeoCard row={p} />
				</>
			}
		/>
	);
}
