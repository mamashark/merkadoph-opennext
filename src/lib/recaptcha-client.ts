"use client";

/**
 * reCAPTCHA v3 in the browser. The Google script is loaded lazily — only when a protected
 * form is first used — so it never slows down the initial page load.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

type Grecaptcha = { ready: (cb: () => void) => void; execute: (siteKey: string, opts: { action: string }) => Promise<string> };
declare global {
	interface Window {
		grecaptcha?: Grecaptcha;
	}
}

let loading: Promise<Grecaptcha | null> | null = null;

/** Starts loading the script (call on first focus/interaction with a protected form). */
export function preloadRecaptcha(): Promise<Grecaptcha | null> {
	if (!SITE_KEY || typeof window === "undefined") return Promise.resolve(null);
	if (!loading) {
		loading = new Promise((resolve) => {
			if (window.grecaptcha) return window.grecaptcha.ready(() => resolve(window.grecaptcha!));
			const script = document.createElement("script");
			script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`;
			script.async = true;
			script.onload = () => window.grecaptcha?.ready(() => resolve(window.grecaptcha!));
			script.onerror = () => {
				loading = null; // allow a retry
				resolve(null);
			};
			document.head.appendChild(script);
		});
	}
	return loading;
}

/** Fresh token for `action` (tokens expire after 2 minutes, so get one at submit time). "" if unavailable. */
export async function getRecaptchaToken(action: string): Promise<string> {
	const g = await preloadRecaptcha();
	if (!g) return "";
	try {
		return await g.execute(SITE_KEY, { action });
	} catch {
		return "";
	}
}

/** Adds the token to a FormData under the field the server reads. */
export async function withRecaptcha(formData: FormData, action: string): Promise<FormData> {
	formData.set("recaptcha_token", await getRecaptchaToken(action));
	return formData;
}
