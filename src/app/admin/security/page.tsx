import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { removeMfa, signOutEverywhere } from "./actions";
import { MfaSetup } from "./mfa-setup";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/datetime";
import { param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/admin/status-badge";
import { FlashMessage } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { buttonClass, cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage({ searchParams }: PageProps<"/admin/security">) {
	const me = await requireAdmin();
	const params = await searchParams;
	const supabase = await createClient();
	const { data: factors } = await supabase.auth.mfa.listFactors();
	const verified = (factors?.totp ?? []).filter((f) => f.status === "verified");
	const { data: events } = await createAdminClient()
		.from("audit_logs")
		.select("id,action,summary,ip,created_at")
		.eq("kind", "security")
		// Quoted so characters in the email can't alter the PostgREST filter (security.md 7.3).
		.or(`actor_id.eq.${me.id},actor_email.eq."${me.email.replace(/["\\]/g, "")}"`)
		.order("created_at", { ascending: false })
		.limit(8);

	return (
		<>
			<PageHeader title="Security" description="Protect your admin account." breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Security" }]} />
			<div className="max-w-3xl space-y-6">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />

				<section className={`${cardClass} p-5`} aria-labelledby="mfa-title">
					<div className="flex items-start gap-3">
						<span
							className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${verified.length ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}
						>
							{verified.length ? <ShieldCheck className="h-5 w-5" aria-hidden /> : <ShieldAlert className="h-5 w-5" aria-hidden />}
						</span>
						<div className="min-w-0 flex-1">
							<h2 id="mfa-title" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
								Two-factor authentication <Badge tone={verified.length ? "published" : "warning"}>{verified.length ? "On" : "Off"}</Badge>
							</h2>
							<p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
								Ask for a code from your phone after your password, so a stolen password alone can&apos;t open the admin.
							</p>
							<div className="mt-4">
								{verified.length ? (
									<ul className="space-y-2">
										{verified.map((f) => (
											<li key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
												<span className="text-slate-800 dark:text-slate-200">
													{f.friendly_name || "Authenticator app"} · added {formatDate(f.created_at)}
												</span>
												<form action={removeMfa}>
													<input type="hidden" name="factorId" value={f.id} />
													<ConfirmButton message="Remove two-factor authentication? Your account will be protected by password only." variant="secondary" size="sm">
														<Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
													</ConfirmButton>
												</form>
											</li>
										))}
									</ul>
								) : (
									<MfaSetup />
								)}
							</div>
						</div>
					</div>
				</section>

				<section className={`${cardClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
					<div>
						<h2 className="font-semibold text-slate-900 dark:text-white">Sign out of all devices</h2>
						<p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">Ends every session for {me.email}, including this one. Use it if a device was lost or shared.</p>
					</div>
					<form action={signOutEverywhere}>
						<ConfirmButton message="Sign out of all devices, including this one?" variant="secondary">
							<LogOut className="h-4 w-4" aria-hidden /> Sign out everywhere
						</ConfirmButton>
					</form>
				</section>

				<section className={cardClass} aria-labelledby="events-title">
					<div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
						<h2 id="events-title" className="text-sm font-semibold text-slate-900 dark:text-white">
							Your recent security activity
						</h2>
						<Link href="/admin/audit?kind=security" className={buttonClass("ghost", "sm")}>
							Full audit log
						</Link>
					</div>
					{!events?.length ? (
						<p className="px-5 py-6 text-sm text-slate-600 dark:text-slate-400">No activity recorded yet.</p>
					) : (
						<ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
							{events.map((e) => (
								<li key={e.id} className="flex flex-wrap justify-between gap-2 px-5 py-2.5">
									<span className="text-slate-800 dark:text-slate-200">{e.summary ?? e.action}</span>
									<span className="text-xs text-slate-600 dark:text-slate-400">
										{formatDate(e.created_at, { dateStyle: "medium", timeStyle: "short" })}
										{e.ip ? ` · ${e.ip}` : ""}
									</span>
								</li>
							))}
						</ul>
					)}
				</section>
			</div>
		</>
	);
}
