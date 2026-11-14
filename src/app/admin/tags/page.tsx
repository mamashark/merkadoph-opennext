import type { Metadata } from "next";
import Link from "next/link";
import { Tags } from "lucide-react";
import { deleteSharedTag, saveSharedTag } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { adminGetSharedTag, adminListSharedTags, TAG_USAGE_TYPES, type TagUsage } from "@/lib/tags";
import { pageParam, param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState, RowActions } from "@/components/admin/row-actions";
import { Field } from "@/components/admin/form-parts";
import { FlashMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass, cardClass, inputClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Tags" };

const PER_PAGE = 30;

/** Shared tags for blogs, events, promotions, services and portfolio. ?edit=<id> loads a tag into the form. */
export default async function SharedTagsPage({ searchParams }: PageProps<"/admin/tags">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), used: param(params, "used"), sort: param(params, "sort") };
	const page = pageParam(params);
	const [{ rows, total }, editing] = await Promise.all([adminListSharedTags({ ...values, page, perPage: PER_PAGE }), adminGetSharedTag(param(params, "edit"))]);
	const filtered = !!(values.q || values.used);

	return (
		<>
			<PageHeader
				title="Tags"
				description="One list of tags for blogs, events, promotions, services and portfolio. Renaming or deleting a tag here updates every item that uses it."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Tags" }]}
			/>
			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />
				<div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
					<form key={editing?.id ?? "new"} action={saveSharedTag} className={`${cardClass} space-y-4 p-5`}>
						{editing && <input type="hidden" name="id" value={editing.id} />}
						<h2 className="font-semibold text-slate-900 dark:text-white">{editing ? `Rename “${editing.name}”` : "Add tag"}</h2>
						<Field
							id="name"
							label="Name"
							hint={editing ? `Used ${editing.total} time${editing.total === 1 ? "" : "s"}. Using another tag's name merges the two.` : "Up to 40 characters. Tags typed in a content form are added here automatically."}
						>
							<input id="name" name="name" required maxLength={40} defaultValue={editing?.name} className={inputClass} />
						</Field>
						<div className="flex gap-2">
							<SubmitButton pendingLabel="Saving…" className="flex-1">
								{editing ? "Save name" : "Add tag"}
							</SubmitButton>
							{editing && (
								<Link href="/admin/tags" className={buttonClass("ghost")}>
									Cancel
								</Link>
							)}
						</div>
					</form>

					<div className="space-y-4">
						<div className={cardClass}>
							<ListToolbar
								basePath="/admin/tags"
								values={values}
								searchPlaceholder="Search tags…"
								filters={[
									{
										name: "used",
										label: "Used in",
										options: [
											{ label: "All tags", value: "" },
											{ label: "Any content", value: "used" },
											...TAG_USAGE_TYPES.map((t) => ({ label: t.label, value: t.key })),
											{ label: "Unused", value: "unused" },
										],
									},
								]}
								sorts={[
									{ label: "Name A–Z", value: "" },
									{ label: "Name Z–A", value: "name-desc" },
									{ label: "Most used", value: "used" },
									{ label: "Newest", value: "newest" },
								]}
							/>
							{rows.length === 0 ? (
								<EmptyState icon={Tags} title={filtered ? "No tags match" : "No tags yet"} description={filtered ? "Try a different search or filter." : "Add tags here or straight from any content form."} />
							) : (
								<ul className="divide-y divide-slate-100 dark:divide-slate-800">
									{rows.map((t) => (
										<li key={t.id} className="flex items-center gap-4 px-4 py-2.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium text-slate-900 dark:text-white">{t.name}</p>
												<Usage tag={t} />
											</div>
											<RowActions label={t.name} id={t.id} editHref={`/admin/tags?edit=${t.id}`} viewHref={null} deleteAction={deleteSharedTag} />
										</li>
									))}
								</ul>
							)}
						</div>
						<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/tags" params={listParams(values)} />
					</div>
				</div>
			</div>
		</>
	);
}

/** "3 posts · 1 event", each linking to that admin list filtered by the tag. */
function Usage({ tag }: { tag: TagUsage }) {
	const used = TAG_USAGE_TYPES.filter((t) => tag[t.key] > 0);
	if (used.length === 0) return <p className="text-xs text-slate-600 dark:text-slate-400">Not used yet</p>;
	return (
		<p className="flex flex-wrap gap-x-2 text-xs text-slate-600 dark:text-slate-400">
			{used.map((t, i) => (
				<span key={t.key}>
					{i > 0 && <span aria-hidden>· </span>}
					<Link href={`${t.adminPath}?${new URLSearchParams({ tag: tag.name })}`} className="hover:text-teal-700 hover:underline dark:hover:text-teal-300">
						{tag[t.key]} {tag[t.key] === 1 ? t.singular : t.plural}
					</Link>
				</span>
			))}
		</p>
	);
}
