export function cn(...classes: Array<string | false | null | undefined>): string {
	return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md" | "icon";

const variants: Record<ButtonVariant, string> = {
	primary: "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:focus-visible:ring-white",
	accent: "bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-600 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400",
	secondary:
		"border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white",
	ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
	danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
};

const sizes: Record<ButtonSize, string> = {
	sm: "h-8 gap-1.5 px-3 text-xs",
	md: "h-10 gap-2 px-4 text-sm",
	icon: "h-9 w-9",
};

/** Shared button styling so Server Components can style links and plain buttons without a client wrapper. */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
	return cn(
		"inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-60",
		variants[variant],
		sizes[size],
		className,
	);
}

/** Icon button that turns red on hover, for delete actions. */
export const dangerIconClass = "hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400";

export const inputClass =
	"block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/20 dark:[color-scheme:dark]";

export const labelClass = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

export const hintClass = "mt-1.5 text-xs text-slate-600 dark:text-slate-400";

export const cardClass = "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

export const mutedText = "text-slate-600 dark:text-slate-400";
export const strongText = "text-slate-900 dark:text-white";
