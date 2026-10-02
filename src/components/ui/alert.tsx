import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/ui";

export function Alert({ tone = "success", children }: { tone?: "success" | "error"; children: React.ReactNode }) {
	const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
	return (
		<div
			role={tone === "error" ? "alert" : "status"}
			className={cn(
				"flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm",
				tone === "success" ? "border-teal-200 bg-teal-50 text-teal-800" : "border-red-200 bg-red-50 text-red-700",
			)}
		>
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
