"use client";

import { preloadRecaptcha, withRecaptcha } from "@/lib/recaptcha-client";

type Props = Omit<React.FormHTMLAttributes<HTMLFormElement>, "action"> & {
	action: (formData: FormData) => void | Promise<void>;
	recaptchaAction: string;
};

/**
 * A <form> for a Server Action that adds a reCAPTCHA v3 token on submit. The fields stay
 * server-rendered children; the script starts loading on first focus inside the form.
 */
export function RecaptchaForm({ action, recaptchaAction, children, ...rest }: Props) {
	return (
		<form
			{...rest}
			onFocusCapture={() => void preloadRecaptcha()}
			action={async (formData) => {
				await action(await withRecaptcha(formData, recaptchaAction));
			}}
		>
			{children}
		</form>
	);
}
