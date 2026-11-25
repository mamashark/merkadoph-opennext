import type { Metadata } from "next";
import { deleteBulletinCategory, saveBulletinCategory } from "../actions";
import { BULLETIN_ERRORS } from "../notices";
import { requireAdmin } from "@/lib/auth";
import { adminBulletinCategories } from "@/lib/bulletin";
import { messageFor, param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { FormCard, Field } from "@/components/admin/form-parts";
import { Badge } from "@/components/admin/status-badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FlashMessage } from "@/components/ui/alert";
import { cardClass, hintClass, inputClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Bulletin categories" };

const NOTICES: Record<string, string> = { saved: "Category saved.", deleted: "Category deleted." };

/** The /bulletin filters (spec §3.2: extensible without code). "Community Offers" always comes from Promotions. */
export default async function BulletinCategoriesPage({ searchParams }: PageProps<"/admin/bulletin/categories">) {
	await requireAdmin();
	const sp = await searchParams;
	const categories = await adminBulletinCategories();

	return (
		<>
			<PageHeader
				title="Bulletin categories"
				description="The filters on /bulletin, in this order. “Community Offers” is added automatically from Promotions."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Bulletin Board", href: "/admin/bulletin" },
					{ label: "Categories" },
				]}
			/>
			<div className="max-w-3xl space-y-6">
				<FlashMessage notice={messageFor(NOTICES, param(sp, "notice"))} error={messageFor(BULLETIN_ERRORS, param(sp, "error"))} />

				<ul className="space-y-3">
					{categories.map((c) => (
						<li key={c.id} className={`${cardClass} p-4`}>
							<form action={saveBulletinCategory} className="grid gap-3 sm:grid-cols-[1fr_96px_auto] sm:items-end">
								<input type="hidden" name="id" value={c.id} />
								<Field id={`name-${c.id}`} label="Name">
									<input id={`name-${c.id}`} name="name" required maxLength={60} defaultValue={c.name} className={inputClass} />
								</Field>
								<Field id={`order-${c.id}`} label="Order">
									<input id={`order-${c.id}`} name="sort_order" type="number" min={-1000} max={1000} defaultValue={c.sort_order} className={inputClass} />
								</Field>
								<div className="flex items-center gap-3 pb-1">
									<label className="flex items-center gap-2 text-sm">
										<input type="checkbox" name="is_active" defaultChecked={c.is_active} className="h-4 w-4 rounded border-slate-300 text-teal-600" /> Shown
									</label>
									<SubmitButton pendingLabel="Saving…" variant="secondary">
										Save
									</SubmitButton>
								</div>
								<input type="hidden" name="description" value={c.description ?? ""} />
							</form>
							<div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
								<span>
									/bulletin?category={c.slug} · {c.items} {c.items === 1 ? "item" : "items"} {!c.is_active && <Badge>Hidden</Badge>}
								</span>
								{c.items === 0 && (
									<form action={deleteBulletinCategory}>
										<input type="hidden" name="id" value={c.id} />
										<ConfirmButton message={`Delete the category “${c.name}”?`}>Delete</ConfirmButton>
									</form>
								)}
							</div>
						</li>
					))}
				</ul>

				<FormCard title="Add a category">
					<form action={saveBulletinCategory} className="grid gap-3 sm:grid-cols-[1fr_96px_auto] sm:items-end">
						<Field id="new-name" label="Name">
							<input id="new-name" name="name" required maxLength={60} placeholder="e.g. Scholarships" className={inputClass} />
						</Field>
						<Field id="new-order" label="Order">
							<input id="new-order" name="sort_order" type="number" min={-1000} max={1000} defaultValue={(categories.at(-1)?.sort_order ?? 0) + 10} className={inputClass} />
						</Field>
						<div className="pb-1">
							<SubmitButton pendingLabel="Adding…">Add</SubmitButton>
						</div>
					</form>
					<p className={hintClass}>Hiding a category hides its items from the public site too. A category with items can&rsquo;t be deleted: move the items first.</p>
				</FormCard>
			</div>
		</>
	);
}
