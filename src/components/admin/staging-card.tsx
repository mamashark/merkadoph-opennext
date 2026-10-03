import { Eye, EyeOff } from "lucide-react";
import { SITE_URL } from "@/lib/env";
import { secret } from "@/lib/secrets";
import { STAGE_PARAM, stageGateEnabled } from "@/lib/stage";
import { CopyButton } from "@/components/ui/copy-button";
import { cardClass } from "@/lib/ui";

/** Admin-only: the private preview link for the gated public site (see src/lib/stage.ts). */
export function StagingCard() {
	if (process.env.NEXT_PUBLIC_HOMEPAGE_LIVE === "true") return null;

	let key = "";
	try {
		key = secret("STAGE_KEY");
	} catch {
		// Not configured yet.
	}
	const link = key ? `${SITE_URL}/?${STAGE_PARAM}=${encodeURIComponent(key)}` : "";

	return (
		<section className={`${cardClass} mb-6 flex flex-col gap-4 border-sky-200 p-5 dark:border-sky-900/60 sm:flex-row sm:items-center sm:justify-between`}>
			<div className="flex min-w-0 items-start gap-3">
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
					<EyeOff className="h-5 w-5" aria-hidden />
				</span>
				<div className="min-w-0">
					<h2 className="font-semibold text-slate-900 dark:text-white">The public site is in &ldquo;coming soon&rdquo; mode</h2>
					<p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
						{stageGateEnabled() ? "Visitors see the maintenance page." : "Locally (npm run dev) everything is open; the deployed site shows the maintenance page."} Open the preview link once
						and that browser can browse the whole site for 30 days. Add <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">?{STAGE_PARAM}=off</code> to lock it again.
					</p>
					{link ? (
						<p className="mt-2 truncate font-mono text-xs text-slate-700 dark:text-slate-300" title={link}>
							{link}
						</p>
					) : (
						<p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300">STAGE_KEY isn&apos;t set — add it as a Worker secret to enable the preview link.</p>
					)}
				</div>
			</div>
			{link && (
				<div className="flex shrink-0 items-center gap-2">
					<CopyButton value={link} label="Copy preview link" />
					<a href={link} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sky-700 px-3 text-sm font-medium text-white hover:bg-sky-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
						<Eye className="h-4 w-4" aria-hidden /> Open preview
					</a>
				</div>
			)}
		</section>
	);
}
