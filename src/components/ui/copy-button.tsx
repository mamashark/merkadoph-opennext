"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { buttonClass, cn } from "@/lib/ui";

export function CopyButton({ value, label = "Copy URL", className }: { value: string; label?: string; className?: string }) {
	const [copied, setCopied] = useState(false);

	return (
		<button
			type="button"
			aria-label={copied ? "Copied" : label}
			title={copied ? "Copied!" : label}
			className={cn(buttonClass("secondary", "icon"), copied && "border-teal-200 text-teal-600", className)}
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(value);
					setCopied(true);
					setTimeout(() => setCopied(false), 1500);
				} catch {
					window.prompt("Copy this URL:", value);
				}
			}}
		>
			{copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
		</button>
	);
}
