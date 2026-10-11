import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { signOut, verifyMfa } from "../actions";
import { getCurrentUser, getMfaState } from "@/lib/auth";
import { param } from "@/lib/content";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { inputClass, labelClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Two-factor sign-in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
	code: "That code didn't work. Check your authenticator app and try again.",
	format: "Enter the 6-digit code from your authenticator app.",
	rate: "Too many attempts. Please wait a minute and try again.",
};

export default async function MfaPage({ searchParams }: PageProps<"/login/mfa">) {
	const params = await searchParams;
	const next = param(params, "next");
	const user = await getCurrentUser();
	if (!user) redirect("/login");
	if (!(await getMfaState()).pending) redirect(next.startsWith("/admin") ? next : "/admin");
	const error = errors[param(params, "error")];

	return (
		<main className="flex min-h-dvh items-center justify-center bg-[#faf9f6] px-4 py-12 dark:bg-slate-950">
			<div className="w-full max-w-sm">
				<div className="mb-8 inline-block rounded-xl dark:bg-white dark:px-3 dark:py-2">
					<Image src="/logo.webp" alt="Merkado PH" width={600} height={188} loading="eager" className="h-auto w-40" />
				</div>
				<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
					<ShieldCheck className="h-6 w-6" aria-hidden />
				</span>
				<h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Two-factor sign-in</h1>
				<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Enter the 6-digit code from your authenticator app for {user.email}.</p>
				{error && (
					<div className="mt-6">
						<Alert tone="error">{error}</Alert>
					</div>
				)}
				<form action={verifyMfa} className="mt-6 space-y-5">
					<input type="hidden" name="next" value={next} />
					<div>
						<label htmlFor="code" className={labelClass}>
							Authentication code
						</label>
						<input
							id="code"
							name="code"
							inputMode="numeric"
							autoComplete="one-time-code"
							pattern="\d{6}"
							maxLength={6}
							required
							autoFocus
							className={`${inputClass} text-center font-mono text-xl tracking-[0.4em]`}
						/>
					</div>
					<SubmitButton pendingLabel="Verifying…" className="w-full">
						Verify
					</SubmitButton>
				</form>
				<form action={signOut} className="mt-4 text-center">
					<button type="submit" className="text-sm text-slate-600 underline underline-offset-2 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
						Use a different account
					</button>
				</form>
			</div>
		</main>
	);
}
