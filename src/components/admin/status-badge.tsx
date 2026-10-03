import { contentState, type ContentStatus } from "@/lib/content";
import { cn } from "@/lib/ui";

const tones = {
	published: "bg-teal-50 text-teal-800 ring-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:ring-teal-900",
	scheduled: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900",
	draft: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
	neutral: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
	warning: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
	accent: "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-900",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
	return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone])}>{children}</span>;
}

const labels = { published: "Published", scheduled: "Scheduled", draft: "Draft" } as const;

export function StatusBadge({ row }: { row: { status: ContentStatus; published_at: string | null } }) {
	const state = contentState(row);
	return <Badge tone={state}>{labels[state]}</Badge>;
}
