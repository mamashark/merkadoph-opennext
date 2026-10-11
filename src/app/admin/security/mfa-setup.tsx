"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, QrCode } from "lucide-react";
import { confirmMfaEnrollment, startMfaEnrollment } from "./actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

/** Interactive part of two-factor setup: show the QR code, then confirm a code. */
export function MfaSetup() {
	const router = useRouter();
	const [pending, start] = useTransition();
	const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
	const [error, setError] = useState("");
	const [code, setCode] = useState("");

	if (!setup) {
		return (
			<div className="space-y-2">
				<button
					type="button"
					disabled={pending}
					className={buttonClass("accent")}
					onClick={() =>
						start(async () => {
							setError("");
							const res = await startMfaEnrollment();
							if (res.ok) setSetup(res.data);
							else setError(res.error);
						})
					}
				>
					{pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <QrCode className="h-4 w-4" aria-hidden />} Set up authenticator app
				</button>
				{error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
			</div>
		);
	}

	return (
		<form
			className="grid gap-5 sm:grid-cols-[180px_1fr]"
			onSubmit={(e) => {
				e.preventDefault();
				start(async () => {
					setError("");
					const res = await confirmMfaEnrollment(setup.factorId, code);
					if (res.ok) router.refresh();
					else setError(res.error);
				});
			}}
		>
			{/* eslint-disable-next-line @next/next/no-img-element -- QR code is an SVG data URI from Supabase */}
			<img src={setup.qr} alt="QR code to add Merkado PH to your authenticator app" width={180} height={180} className="rounded-lg bg-white p-2" />
			<div className="space-y-3 text-sm">
				<ol className="list-decimal space-y-1 pl-5 text-slate-700 dark:text-slate-300">
					<li>Open Google Authenticator, Microsoft Authenticator, 1Password or similar.</li>
					<li>Scan the QR code (or enter the key below).</li>
					<li>Type the 6-digit code it shows.</li>
				</ol>
				<p className="break-all rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200">{setup.secret}</p>
				<div>
					<label htmlFor="mfa-code" className={labelClass}>
						Code from the app
					</label>
					<input
						id="mfa-code"
						value={code}
						onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
						inputMode="numeric"
						autoComplete="one-time-code"
						required
						className={`${inputClass} w-40 text-center font-mono tracking-[0.3em]`}
					/>
				</div>
				{error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
				<button type="submit" disabled={pending || code.length !== 6} className={buttonClass("primary")}>
					{pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Turn on two-factor
				</button>
			</div>
		</form>
	);
}
