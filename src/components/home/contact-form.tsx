"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { sendContactMessage, type ContactState } from "@/app/contact-actions";
import { preloadRecaptcha, withRecaptcha } from "@/lib/recaptcha-client";
import { RecaptchaNotice } from "@/components/ui/recaptcha-notice";
import { cn } from "@/lib/ui";

const field =
	"block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-500 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-teal-400 dark:[color-scheme:dark]";
const label = "mb-1.5 block text-sm font-medium text-stone-800 dark:text-stone-200";
const errorText = "mt-1 text-xs font-medium text-red-700 dark:text-red-400";

/** Wording per language. The Server Action answers in English, so a Swedish form shows its own messages instead. */
const TEXT = {
	en: {
		sent: "Message sent",
		name: "Name",
		email: "Email",
		phone: "Phone",
		optional: "(optional)",
		topic: "What can we help with?",
		chooseTopic: "Choose a topic",
		extraTopics: [
			["Community & events", "Community & events"],
			["Something else", "Something else"],
		],
		message: "Message",
		placeholder: "Tell us about your project — roof type, rough size, location and timing.",
		privacy: "We only use your details to reply to you.",
		sending: "Sending…",
		send: "Send message",
		success: null,
		fieldErrors: null,
		checkFields: null,
		failed: null,
	},
	sv: {
		sent: "Meddelandet är skickat",
		name: "Namn",
		email: "E-post",
		phone: "Telefon",
		optional: "(valfritt)",
		topic: "Vad kan vi hjälpa dig med?",
		chooseTopic: "Välj ett ämne",
		extraTopics: [["Something else", "Något annat"]],
		message: "Meddelande",
		placeholder: "Berätta om ditt projekt: typ av tak, ungefärlig storlek, plats och när.",
		privacy: "Vi använder bara dina uppgifter för att svara dig.",
		sending: "Skickar…",
		send: "Skicka meddelande",
		success: "Tack! Vi svarar oftast inom 1–2 arbetsdagar.",
		fieldErrors: { name: "Fyll i ditt namn.", email: "Ange en giltig e-postadress.", phone: "Kontrollera telefonnumret.", topic: "Välj ett ämne.", message: "Skriv ett meddelande." } as Record<string, string>,
		checkFields: "Kontrollera de markerade fälten.",
		failed: "Det gick inte att skicka meddelandet just nu. Försök igen om en stund.",
	},
} as const;

/** The only client piece of the contact section: keeps typed values and shows inline results. */
export function ContactForm({ topics, locale = "en" }: { topics: string[]; locale?: "en" | "sv" }) {
	const t = TEXT[locale];
	// reCAPTCHA token is added just before the Server Action runs.
	const [state, action, pending] = useActionState<ContactState, FormData>(async (prev, fd) => sendContactMessage(prev, await withRecaptcha(fd, "contact")), { status: "idle" });
	const [startedAt] = useState(() => Date.now());

	if (state.status === "success") {
		return (
			<div role="status" className="flex flex-col items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-6 text-teal-900 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-100">
				<CheckCircle2 className="h-7 w-7" aria-hidden />
				<p className="text-lg font-semibold">{t.sent}</p>
				<p className="text-sm">{t.success ?? state.message}</p>
			</div>
		);
	}

	const rawErr = state.errors ?? {};
	const err: Partial<Record<string, string>> = t.fieldErrors ? Object.fromEntries(Object.keys(rawErr).map((k) => [k, t.fieldErrors![k] ?? rawErr[k]])) : rawErr;
	const errorMessage = t.checkFields ? (Object.keys(rawErr).length ? t.checkFields : t.failed) : state.message;
	const v = state.values;
	return (
		<form key={JSON.stringify(v ?? {})} action={action} onFocusCapture={() => void preloadRecaptcha()} noValidate className="space-y-4" aria-describedby={state.status === "error" ? "contact-error" : undefined}>
			{/* Spam traps */}
			<input type="hidden" name="started_at" value={startedAt} />
			<div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
				<label htmlFor="company">Company</label>
				<input id="company" name="company" tabIndex={-1} autoComplete="off" />
			</div>

			{state.status === "error" && errorMessage && (
				<p id="contact-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
					{errorMessage}
				</p>
			)}

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label htmlFor="c-name" className={label}>
						{t.name}
					</label>
					<input id="c-name" name="name" defaultValue={v?.name} required maxLength={120} autoComplete="name" aria-invalid={!!err.name} aria-describedby={err.name ? "c-name-err" : undefined} className={cn(field, err.name && "border-red-500")} />
					{err.name && (
						<p id="c-name-err" className={errorText}>
							{err.name}
						</p>
					)}
				</div>
				<div>
					<label htmlFor="c-email" className={label}>
						{t.email}
					</label>
					<input
						id="c-email"
						name="email"
						defaultValue={v?.email}
						type="email"
						required
						maxLength={254}
						autoComplete="email"
						aria-invalid={!!err.email}
						aria-describedby={err.email ? "c-email-err" : undefined}
						className={cn(field, err.email && "border-red-500")}
					/>
					{err.email && (
						<p id="c-email-err" className={errorText}>
							{err.email}
						</p>
					)}
				</div>
				<div>
					<label htmlFor="c-phone" className={label}>
						{t.phone} <span className="font-normal text-stone-600 dark:text-stone-400">{t.optional}</span>
					</label>
					<input id="c-phone" name="phone" defaultValue={v?.phone} type="tel" maxLength={40} autoComplete="tel" className={field} />
				</div>
				<div>
					<label htmlFor="c-topic" className={label}>
						{t.topic}
					</label>
					<select id="c-topic" name="topic" defaultValue={v?.topic ?? ""} className={field}>
						<option value="">{t.chooseTopic}</option>
						{topics.map((t) => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
						{t.extraTopics.map(([value, text]) => (
							<option key={value} value={value}>
								{text}
							</option>
						))}
					</select>
				</div>
			</div>

			<div>
				<label htmlFor="c-message" className={label}>
					{t.message}
				</label>
				<textarea
					id="c-message"
					name="message"
					defaultValue={v?.message}
					required
					rows={5}
					maxLength={5000}
					placeholder={t.placeholder}
					aria-invalid={!!err.message}
					aria-describedby={err.message ? "c-message-err" : undefined}
					className={cn(field, err.message && "border-red-500")}
				/>
				{err.message && (
					<p id="c-message-err" className={errorText}>
						{err.message}
					</p>
				)}
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<p className="text-xs text-stone-600 dark:text-stone-400">{t.privacy}</p>
					<RecaptchaNotice locale={locale} />
				</div>
				<button
					type="submit"
					disabled={pending}
					className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200 dark:focus-visible:ring-offset-stone-950"
				>
					{pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
					{pending ? t.sending : t.send}
				</button>
			</div>
		</form>
	);
}
