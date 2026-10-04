import { cn } from "@/lib/ui";

/**
 * Required attribution when the floating reCAPTCHA badge is hidden (see globals.css).
 * https://developers.google.com/recaptcha/docs/faq#id-like-to-hide-the-recaptcha-badge.-what-is-allowed
 */
export function RecaptchaNotice({ className }: { className?: string }) {
	if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) return null;
	return (
		<p className={cn("text-[11px] leading-relaxed text-stone-600 dark:text-stone-400", className)}>
			Protected by reCAPTCHA. The Google{" "}
			<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
				Privacy Policy
			</a>{" "}
			and{" "}
			<a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
				Terms of Service
			</a>{" "}
			apply.
		</p>
	);
}
