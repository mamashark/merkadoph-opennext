import type { Metadata } from "next";
import { Activity, CalendarClock, Clock, Database, Lock } from "lucide-react";
import { triggerKeepAlive } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { KEEPALIVE_CRON_LABEL, nextManualAt } from "@/lib/keepalive";
import { latestOp, listOps } from "@/lib/ops";
import { pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/admin/page-header";
import { OpsLogTable } from "@/components/admin/ops-log-table";
import { Alert, FlashMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { cardClass, cn } from "@/lib/ui";

export const metadata: Metadata = { title: "Supabase" };

const PER_PAGE = 20;
const ago = (iso?: string | null) => (iso ? formatDate(iso, { dateStyle: "medium", timeStyle: "short" }) : "Never");

export default async function SupabasePage({ searchParams }: PageProps<"/admin/supabase">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), source: param(params, "source"), status: param(params, "status") };
	const page = pageParam(params);

	let tableError = "";
	const [logs, lastAny, lastCron, nextManual] = await Promise.all([
		listOps({ kind: "keepalive", ...values, page, perPage: PER_PAGE }).catch((e: Error) => ((tableError = e.message), { rows: [], total: 0 })),
		latestOp("keepalive", { status: "success" }).catch(() => null),
		latestOp("keepalive", { source: "cron" }).catch(() => null),
		nextManualAt().catch(() => null),
	]);

	const stats = [
		{ icon: Activity, label: "Last successful ping", value: ago(lastAny?.created_at), hint: lastAny ? (lastAny.source === "cron" ? "by the scheduler" : `by ${lastAny.actor_email ?? "admin"}`) : "" },
		{ icon: CalendarClock, label: "Last cron run", value: ago(lastCron?.created_at), hint: lastCron ? (lastCron.status === "success" ? "succeeded" : "failed — see log") : "waiting for first run" },
		{ icon: Clock, label: "Cron schedule", value: KEEPALIVE_CRON_LABEL, hint: "runs automatically on Cloudflare" },
	];

	return (
		<>
			<PageHeader
				title="Supabase"
				description="Keep the database from pausing. Free Supabase projects pause after about 7 days without activity."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Supabase" }]}
			/>

			<div className="space-y-6">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />
				{tableError && (
					<Alert tone="error">
						Logs aren&apos;t available yet ({tableError}). Run <code>supabase/migrations/20261005000000_ops_logs_contact_messages.sql</code> in the Supabase SQL editor.
					</Alert>
				)}

				<div className="grid gap-4 sm:grid-cols-3">
					{stats.map(({ icon: Icon, label, value, hint }) => (
						<div key={label} className={`${cardClass} p-5`}>
							<div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
								<Icon className="h-4 w-4" aria-hidden /> {label}
							</div>
							<p className="mt-2 font-semibold text-slate-900 dark:text-white">{value}</p>
							{hint && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{hint}</p>}
						</div>
					))}
				</div>

				<section className={cn(cardClass, "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between")}>
					<div className="flex items-start gap-3">
						<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
							<Database className="h-5 w-5" aria-hidden />
						</span>
						<div>
							<h2 className="font-semibold text-slate-900 dark:text-white">Manual keep-alive</h2>
							<p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
								Runs a small query against the database and logs it. Use it if the cron hasn&apos;t run recently. Available once every 7 days.
							</p>
							{nextManual && (
								<p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-300">
									<Lock className="h-3.5 w-3.5" aria-hidden /> Available again {formatDate(nextManual.toISOString(), { dateStyle: "full", timeStyle: "short" })}
								</p>
							)}
						</div>
					</div>
					<form action={triggerKeepAlive}>
						{nextManual ? (
							<button type="button" disabled aria-disabled="true" className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-lg bg-slate-200 px-4 text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-500">
								<Lock className="h-4 w-4" aria-hidden /> Triggered this week
							</button>
						) : (
							<SubmitButton variant="accent" pendingLabel="Pinging database…">
								<Activity className="h-4 w-4" aria-hidden /> Ping database now
							</SubmitButton>
						)}
					</form>
				</section>

				<OpsLogTable title="Keep-alive log" basePath="/admin/supabase" rows={logs.rows} total={logs.total} page={page} perPage={PER_PAGE} values={values} scopeLabel="Target" />
			</div>
		</>
	);
}
