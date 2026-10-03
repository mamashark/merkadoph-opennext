import { Info } from "lucide-react";
import { UPLOAD_RULES_TEXT } from "@/lib/upload-rules";
import { cn } from "@/lib/ui";

/** The upload requirement, shown next to every upload control. */
export function UploadRulesNote({ id, className }: { id?: string; className?: string }) {
	return (
		<p id={id} className={cn("flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400", className)}>
			<Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
			{UPLOAD_RULES_TEXT}
		</p>
	);
}
