import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { signIn } from "./actions";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { RecaptchaForm } from "@/components/ui/recaptcha-form";
import { RecaptchaNotice } from "@/components/ui/recaptcha-notice";
import { inputClass, labelClass } from "@/lib/ui";

export const metadata: Metadata = {
	title: "Sign in",
	robots: { index: false, follow: false },
};

const errors: Record<string, string> = {
	missing: "Please enter your email and password.",
	invalid: "Incorrect email or password.",
	forbidden: "This account doesn't have access to the admin panel.",
	captcha: "We couldn't verify that you're human. Please try again.",
};

const notices: Record<string, string> = {
	"signed-out": "You've been signed out.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
	const params = await searchParams;
	const get = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
	const error = errors[get("error")];
	const notice = notices[get("notice")];

	return (
		<main className="grid min-h-dvh bg-slate-50 dark:bg-slate-950 lg:grid-cols-2">
			<section className="relative hidden overflow-hidden bg-[#f4ebd9] lg:block" aria-hidden>
				<Image src="/underconstruction-site.jpg" alt="" fill fetchPriority="high" sizes="50vw" className="object-cover object-center" />
				<div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
				<div className="absolute inset-x-0 bottom-0 p-12 text-white">
					<p className="text-sm font-medium uppercase tracking-widest text-teal-300">Merkado PH</p>
					<p className="mt-2 max-w-md text-3xl font-semibold leading-tight">Manage your stories, media and team in one place.</p>
				</div>
			</section>

			<section className="flex items-center justify-center px-4 py-12 sm:px-8">
				<div className="w-full max-w-sm">
					<Link href="/" className="mb-10 inline-block rounded-xl dark:bg-white dark:px-3 dark:py-2">
						<Image src="/logo.webp" alt="Merkado PH" width={600} height={188} loading="eager" className="h-auto w-44" />
					</Link>

					<h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Sign in to admin</h1>
					<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use the account your administrator created for you.</p>

					<div className="mt-6 space-y-3">
						{error && <Alert tone="error">{error}</Alert>}
						{notice && <Alert>{notice}</Alert>}
					</div>

					<RecaptchaForm action={signIn} recaptchaAction="login" className="mt-6 space-y-5">
						<input type="hidden" name="next" value={get("next")} />
						<div>
							<label htmlFor="email" className={labelClass}>
								Email
							</label>
							<div className="relative">
								<Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden />
								<input
									id="email"
									name="email"
									type="email"
									autoComplete="email"
									required
									defaultValue={get("email")}
									placeholder="you@example.com"
									className={`${inputClass} pl-9`}
								/>
							</div>
						</div>
						<div>
							<label htmlFor="password" className={labelClass}>
								Password
							</label>
							<div className="relative">
								<Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden />
								<input
									id="password"
									name="password"
									type="password"
									autoComplete="current-password"
									required
									autoFocus={!!get("email")}
									className={`${inputClass} pl-9`}
								/>
							</div>
						</div>
						<SubmitButton pendingLabel="Signing in…" className="w-full">
							Sign in
						</SubmitButton>
					</RecaptchaForm>
					<RecaptchaNotice className="mt-4 text-slate-600 dark:text-slate-400" />

					<p className="mt-10 text-xs text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} Merkado PH. Authorized personnel only.</p>
				</div>
			</section>
		</main>
	);
}
