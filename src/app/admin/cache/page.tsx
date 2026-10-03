import type { Metadata } from "next";
import { BriefcaseBusiness, CalendarDays, FileText, Home, LayoutList, Map as MapIcon, RefreshCw, TicketPercent, Zap } from "lucide-react";
import { purgeCache } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { CACHE_GROUP_IDS, CACHE_GROUPS, CACHE_TTL, type CacheGroupId } from "@/lib/cache";
import { listOps } from "@/lib/ops";
import { pageParam, param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { OpsLogTable } from "@/components/admin/ops-log-table";
import { FlashMessage } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Cache" };

const PER_PAGE = 20;
const icons: Record<CacheGroupId, React.ElementType> = {
	home: Home,
	listings: LayoutList,
	blogs: FileText,
	events: CalendarDays,
	promotions: TicketPercent,
	services: BriefcaseBusiness,
	sitemap: MapIcon,
};

export default async function CachePage({ searchParams }: PageProps<"/admin/cache">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), source: param(params, "source"), status: param(params, "status") };
	const page = pageParam(params);
	const logs = await listOps({ kind: "cache_purge", ...values, page, perPage: PER_PAGE }).catch(() => ({ rows: [], total: 0 }));

	return (
		<>
			<PageHeader
				title="Cache"
				description={`Public pages and their data are cached for speed and refresh on their own every ${CACHE_TTL / 60} minutes. Saving content already purges what it affects — use this when something still looks out of date.`}
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Cache" }]}
			/>

			<div className="space-y-6">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />

				<section className={`${cardClass} flex flex-col gap-4 border-amber-200 p-5 dark:border-amber-900/60 sm:flex-row sm:items-center sm:justify-between`}>
					<div className="flex items-start gap-3">
						<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
							<Zap className="h-5 w-5" aria-hidden />
						</span>
						<div>
							<h2 className="font-semibold text-slate-900 dark:text-white">Purge everything</h2>
							<p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">Empties all cached data and pages. The next visit to each page is a little slower while it rebuilds.</p>
						</div>
					</div>
					<form action={purgeCache}>
						<input type="hidden" name="group" value="all" />
						<ConfirmButton message="Purge the whole cache? Every page rebuilds on its next visit." variant="primary">
							<RefreshCw className="h-4 w-4" aria-hidden /> Purge all
						</ConfirmButton>
					</form>
				</section>

				<section aria-labelledby="groups-title">
					<h2 id="groups-title" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
						Purge a group
					</h2>
					<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{CACHE_GROUP_IDS.map((id) => {
							const group = CACHE_GROUPS[id];
							const Icon = icons[id];
							return (
								<li key={id} className={`${cardClass} flex flex-col p-5`}>
									<div className="flex items-center gap-2">
										<Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" aria-hidden />
										<h3 className="font-semibold text-slate-900 dark:text-white">{group.label}</h3>
									</div>
									<p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-400">{group.description}</p>
									<form action={purgeCache} className="mt-4">
										<input type="hidden" name="group" value={id} />
										<SubmitButton variant="secondary" size="sm" pendingLabel="Purging…">
											<RefreshCw className="h-3.5 w-3.5" aria-hidden /> Purge {group.label.toLowerCase()}
										</SubmitButton>
									</form>
								</li>
							);
						})}
					</ul>
				</section>

				<OpsLogTable title="Purge history" basePath="/admin/cache" rows={logs.rows} total={logs.total} page={page} perPage={PER_PAGE} values={values} scopeLabel="Group" />
			</div>
		</>
	);
}
