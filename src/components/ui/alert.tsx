import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/ui";

const tones = {
	success: { icon: CheckCircle2, className: "border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200" },
	warning: { icon: AlertTriangle, className: "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200" },
	error: { icon: AlertCircle, className: "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300" },
};

export function Alert({ tone = "success", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
	const { icon: Icon, className } = tones[tone];
	return (
		<div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm", className)}>
			<Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
			<div>{children}</div>
		</div>
	);
}

/** Renders `?notice=` / `?error=` flash messages set by Server Action redirects. */
export function FlashMessage({ notice, error }: { notice?: string; error?: string }) {
	if (error) return <Alert tone="error">{error}</Alert>;
	if (notice) return <Alert>{notice}</Alert>;
	return null;
}
