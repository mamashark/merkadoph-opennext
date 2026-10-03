"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { buttonClass, cn } from "@/lib/ui";

type Props = { value: string; label?: string; icon?: "link" | "copy"; className?: string };

export function CopyButton({ value, label = "Copy URL", icon = "link", className }: Props) {
	const [copied, setCopied] = useState(false);
	const Icon = copied ? Check : icon === "copy" ? Copy : Link2;

	return (
		<button
			type="button"
			aria-label={copied ? "Copied" : label}
			title={copied ? "Copied!" : label}
			className={cn(buttonClass("secondary", "icon"), copied && "border-teal-300 text-teal-700 dark:border-teal-800 dark:text-teal-300", className)}
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(value);
					setCopied(true);
					setTimeout(() => setCopied(false), 1500);
				} catch {
					window.prompt("Copy this:", value);
				}
			}}
		>
			<Icon className="h-4 w-4" aria-hidden />
		</button>
	);
}
