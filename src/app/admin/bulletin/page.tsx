import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Pin, Plus, Star, House } from "lucide-react";
import { deleteBulletinItem } from "./actions";
import { BULLETIN_ERRORS } from "./notices";
import { requireAdmin } from "@/lib/auth";
import { adminBulletinCategories, adminListBulletin } from "@/lib/bulletin";
import { BULLETIN_TYPES, STATE_LABEL, TYPE_LABEL, bulletinState, type BulletinState } from "@/lib/bulletin-shared";
import { messageFor, pageParam, param } from "@/lib/content";
import { UUID } from "@/lib/validation";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ListToolbar, listParams } from "@/components/admin/list-toolbar";
import { EmptyState, RowActions, Thumb } from "@/components/admin/row-actions";
import { Badge } from "@/components/admin/status-badge";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass, cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Bulletin Board" };

const PER_PAGE = 20;
const tone: Record<BulletinState, "draft" | "warning" | "scheduled" | "published" | "neutral"> = {
	draft: "draft",
	in_review: "warning",
	scheduled: "scheduled",
	published: "published",
	expired: "neutral",
	archived: "neutral",
};

export default async function BulletinAdminPage({ searchParams }: PageProps<"/admin/bulletin">) {
	await requireAdmin();
	const params = await searchParams;
	// Only known values are used (guidelines §0.5); a bad ?category= would otherwise be a database error (Sig, Arvid).
	const raw = { state: param(params, "state"), type: param(params, "type"), category: param(params, "category") };
	const values = {
		q: param(params, "q").trim(),
		state: Object.hasOwn(STATE_LABEL, raw.state) ? raw.state : "",
		type: (BULLETIN_TYPES as readonly string[]).includes(raw.type) ? raw.type : "",
		category: UUID.test(raw.category) ? raw.category : "",
		sort: param(params, "sort"),
	};
	const page = pageParam(params);

	const [{ rows, total }, categories] = await Promise.all([adminListBulletin({ ...values, page, perPage: PER_PAGE }), adminBulletinCategories()]);
	const filtered = !!(values.q || values.state || values.type || values.category);

	return (
		<>
			<PageHeader
				title="Bulletin Board"
				description="Embassy updates, community notices, opportunities and press items. Offers are managed under Promotions."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Bulletin Board" }]}
				actions={
					<>
						<Link href="/admin/bulletin/categories" className={buttonClass("secondary")}>
							Categories
						</Link>
						<Link href="/admin/bulletin/publishers" className={buttonClass("secondary")}>
							Publishers
						</Link>
						<Link href="/admin/bulletin/new" className={buttonClass("primary")}>
							<Plus className="h-4 w-4" aria-hidden /> New item
						</Link>
					</>
				}
			/>

			<div className="space-y-4">
				<FlashMessage notice={param(params, "notice") === "deleted" ? "Item deleted." : undefined} error={messageFor(BULLETIN_ERRORS, param(params, "error"))} />

				<div className={cardClass}>
					<ListToolbar
						basePath="/admin/bulletin"
						values={values}
						searchPlaceholder="Search title, summary or headline…"
						filters={[
							{ name: "state", label: "Status", options: [{ label: "Any", value: "" }, ...(Object.keys(STATE_LABEL) as BulletinState[]).map((s) => ({ label: STATE_LABEL[s], value: s }))] },
							{ name: "type", label: "Type", options: [{ label: "Any", value: "" }, ...BULLETIN_TYPES.map((t) => ({ label: TYPE_LABEL[t], value: t }))] },
							{ name: "category", label: "Category", options: [{ label: "Any", value: "" }, ...categories.map((c) => ({ label: c.name, value: c.id }))] },
						]}
						sorts={[
							{ label: "Last updated", value: "" },
							{ label: "Publish date", value: "published" },
							{ label: "Priority", value: "priority" },
							{ label: "Title A–Z", value: "title" },
						]}
					/>

					{rows.length === 0 ? (
						<EmptyState
							icon={Megaphone}
							title={filtered ? "No items match your filters" : "Nothing on the Bulletin Board yet"}
							description={filtered ? "Try a different search or filter." : "Add an embassy update, a community notice or an opportunity."}
							action={
								!filtered && (
									<Link href="/admin/bulletin/new" className={buttonClass("primary")}>
										<Plus className="h-4 w-4" aria-hidden /> New item
									</Link>
								)
							}
						/>
					) : (
						<ul className="divide-y divide-slate-100 dark:divide-slate-800">
							{rows.map((r) => {
								const s = bulletinState(r);
								return (
									<li key={r.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
										<Thumb src={r.cover_image_url} icon={Megaphone} />
										<div className="min-w-0 flex-1">
											<Link href={`/admin/bulletin/${r.id}/edit`} className="block truncate font-medium text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300">
												{r.title}
											</Link>
											<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
												<Badge tone={tone[s]}>{STATE_LABEL[s]}</Badge>
												<span>{TYPE_LABEL[r.content_type]}</span>
												{r.category && <span>{r.category.name}</span>}
												{r.published_at && <span>{formatDate(r.published_at, { dateStyle: "medium" })}</span>}
												{r.expires_at && <span>until {formatDate(r.expires_at, { dateStyle: "medium" })}</span>}
												{r.is_pinned && (
													<span className="inline-flex items-center gap-1">
														<Pin className="h-3.5 w-3.5" aria-hidden /> Pinned
													</span>
												)}
												{r.is_featured && (
													<span className="inline-flex items-center gap-1">
														<Star className="h-3.5 w-3.5" aria-hidden /> Featured
													</span>
												)}
												{r.show_on_homepage && (
													<span className="inline-flex items-center gap-1">
														<House className="h-3.5 w-3.5" aria-hidden /> Homepage
													</span>
												)}
											</div>
										</div>
										<RowActions label={r.title} id={r.id} editHref={`/admin/bulletin/${r.id}/edit`} viewHref={s === "published" ? `/bulletin/${r.slug}` : null} deleteAction={deleteBulletinItem} />
									</li>
								);
							})}
						</ul>
					)}
				</div>

				<Pagination page={page} perPage={PER_PAGE} total={total} basePath="/admin/bulletin" params={listParams(values)} />
			</div>
		</>
	);
}
