export function cn(...classes: Array<string | false | null | undefined>): string {
	return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md" | "icon";

const variants: Record<ButtonVariant, string> = {
	primary: "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-900",
	accent: "bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-600",
	secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-slate-400",
	ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400",
	danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
};

const sizes: Record<ButtonSize, string> = {
	sm: "h-8 gap-1.5 px-3 text-xs",
	md: "h-10 gap-2 px-4 text-sm",
	icon: "h-8 w-8",
};

/** Shared button styling so Server Components can style links and plain buttons without a client wrapper. */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
	return cn(
		"inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
		variants[variant],
		sizes[size],
		className,
	);
}

export const inputClass =
	"block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-50";

export const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

export const hintClass = "mt-1.5 text-xs text-slate-500";

export const cardClass = "rounded-xl border border-slate-200 bg-white shadow-sm";
