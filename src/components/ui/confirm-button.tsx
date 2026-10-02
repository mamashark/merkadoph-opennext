"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { buttonClass } from "@/lib/ui";

type Props = {
	children: React.ReactNode;
	message: string;
	label?: string;
	variant?: Parameters<typeof buttonClass>[0];
	size?: Parameters<typeof buttonClass>[1];
	className?: string;
};

/** Submit button that asks for confirmation first. Place it inside a server-rendered `<form action={...}>`. */
export function ConfirmButton({ children, message, label, variant = "danger", size = "md", className }: Props) {
	const { pending } = useFormStatus();

	return (
		<button
			type="submit"
			disabled={pending}
			aria-label={label}
			title={label}
			className={buttonClass(variant, size, className)}
			onClick={(event) => {
				if (!window.confirm(message)) event.preventDefault();
			}}
		>
			{pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : children}
		</button>
	);
}
