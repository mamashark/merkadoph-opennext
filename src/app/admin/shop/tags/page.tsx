import type { Metadata } from "next";
import Link from "next/link";
import { Tags } from "lucide-react";
import { deleteTag, saveTag } from "../actions";
import { requireAdmin } from "@/lib/auth";
import { adminGetTag, adminListTags } from "@/lib/shop-admin";
import { pageParam, param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState, RowActions } from "@/components/admin/row-actions";
import { Field } from "@/components/admin/form-parts";
import { FlashMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass, cardClass, inputClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Product tags" };

const PER_PAGE = 30;

/** Tags list + add/edit form. ?edit=<id> loads a tag into the form. */
export default async function TagsPage({ searchParams }: PageProps<"/admin/shop/tags">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), used: param(params, "used"), sort: param(params, "sort") };
	const page = pageParam(params);
	const editId = param(params, "edit");
	const [{ rows, total }, editing] = await Promise.all([adminListTags({ ...values, page, perPage: PER_PAGE }), /^[0-9a-f-]{36}$/i.test(editId) ? adminGetTag(editId) : null]);
	const filtered = !!(values.q || values.used);

	return (
		<>
			<PageHeader
				title="Tags"
				description="Free-form labels for products. Shoppers can filter the shop by tag (/shop?tag=…)."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Shop", href: "/admin/shop" }, { label: "Tags" }]}
			/>
			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />
				<div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
					<form key={editing?.id ?? "new"} action={saveTag} className={`${cardClass} space-y-4 p-5`}>
						{editing && <input type="hidden" name="id" value={editing.id} />}
						<h2 className="font-semibold text-slate-900 dark:text-white">{editing ? "Edit tag" : "Add tag"}</h2>
						<Field id="name" label="Name">
							<input id="name" name="name" required maxLength={60} defaultValue={editing?.name} className={inputClass} />
						</Field>
						<Field id="slug" label="Slug" hint="Blank = from the name.">
							<input id="slug" name="slug" maxLength={80} pattern="[a-zA-Z0-9\- ]*" defaultValue={editing?.slug} className={inputClass} />
						</Field>
						<div className="flex gap-2">
							<SubmitButton pendingLabel="Saving…" className="flex-1">
								{editing ? "Save tag" : "Add tag"}
							</SubmitButton>
							{editing && (
								<Link href="/admin/shop/tags" className={buttonClass("ghost")}>
									Cancel
								</Link>
							)}
						</div>
					</form>

					<div className="space-y-4">
						<div className={cardClass}>
							<ListToolbar
								basePath="/admin/shop/tags"
								values={values}
								searchPlaceholder="Search tags…"
								filters={[
									{
										name: "used",
										label: "Usage",
										options: [
											{ label: "All tags", value: "" },
											{ label: "Used by products", value: "used" },
											{ label: "Unused", value: "unused" },
										],
									},
								]}
								sorts={[
									{ label: "Name A–Z", value: "" },
									{ label: "Name Z–A", value: "name-desc" },
									{ label: "Newest", value: "newest" },
								]}
							/>
							{rows.length === 0 ? (
								<EmptyState icon={Tags} title={filtered ? "No tags match" : "No tags yet"} description={filtered ? "Try a different search or filter." : "Add tags here or straight from the product form."} />
							) : (
								<ul className="divide-y divide-slate-100 dark:divide-slate-800">
									{rows.map((t) => (
										<li key={t.id} className="flex items-center gap-4 px-4 py-2.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium text-slate-900 dark:text-white">{t.name}</p>
												<p className="text-xs text-slate-600 dark:text-slate-400">
													<span className="font-mono">{t.slug}</span> · {t.product_count} live product{t.product_count === 1 ? "" : "s"}
												</p>
											</div>
											<RowActions label={t.name} id={t.id} editHref={`/admin/shop/tags?edit=${t.id}`} viewHref={`/shop?tag=${t.slug}`} deleteAction={deleteTag} />
										</li>
									))}
								</ul>
							)}
						</div>
						<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/shop/tags" params={listParams(values)} />
					</div>
				</div>
			</div>
		</>
	);
}
