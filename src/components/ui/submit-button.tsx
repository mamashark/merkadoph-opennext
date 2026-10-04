"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { buttonClass } from "@/lib/ui";

type Props = {
	children: React.ReactNode;
	pendingLabel?: string;
	variant?: Parameters<typeof buttonClass>[0];
	size?: Parameters<typeof buttonClass>[1];
	className?: string;
	name?: string;
	value?: string;
	/** Run a different Server Action than the form's (e.g. "Test connection" next to "Save"). */
	formAction?: (formData: FormData) => void | Promise<void>;
};

/** Submit button for server-rendered forms: shows a spinner while its parent form's Server Action runs. */
export function SubmitButton({ children, pendingLabel, variant = "primary", size = "md", className, name, value, formAction }: Props) {
	const { pending, data } = useFormStatus();
	// When a form has several submit buttons, only spin the one that was pressed.
	const isActive = pending && (!name || data?.get(name) === value);

	return (
		<button type="submit" name={name} value={value} formAction={formAction} disabled={pending} aria-busy={isActive} className={buttonClass(variant, size, className)}>
			{isActive && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
			{isActive && pendingLabel ? pendingLabel : children}
		</button>
	);
}
