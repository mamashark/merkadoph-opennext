import type { Metadata } from "next";
import { CreditCard, HandCoins, PlugZap, Wallet } from "lucide-react";
import { savePaymentGateway, testPaymentGateway } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_TITLES, GATEWAY_NAMES, listGatewaysAdmin, missingFor, type GatewayAdminView, type GatewayId } from "@/lib/payments";
import { SITE_URL } from "@/lib/env";
import { param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/admin/page-header";
import { ShopStatusAlert } from "@/components/admin/shop-status-alert";
import { getShopReadiness } from "@/lib/shop-status";
import { Field } from "@/components/admin/form-parts";
import { Badge } from "@/components/admin/status-badge";
import { Alert, FlashMessage } from "@/components/ui/alert";
import { CopyButton } from "@/components/ui/copy-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { cardClass, cn, hintClass, inputClass, labelClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Payments" };

const ICONS: Record<GatewayId, React.ElementType> = { manual: HandCoins, stripe: CreditCard, paypal: Wallet };
const WEBHOOK_URL = `${SITE_URL}/api/webhooks/stripe`;

export default async function PaymentsPage({ searchParams }: PageProps<"/admin/shop/payments">) {
	await requireAdmin();
	const params = await searchParams;
	let loadError = "";
	const [gateways, readiness] = await Promise.all([listGatewaysAdmin().catch((e: Error) => ((loadError = e.message), [] as GatewayAdminView[])), getShopReadiness()]);

	return (
		<>
			<PageHeader
				title="Payments"
				description="Choose how customers pay at checkout. Turn on one or more methods; customers pick at checkout."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Shop", href: "/admin/shop" }, { label: "Payments" }]}
			/>
			<div className="space-y-6">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />
				{loadError && (
					<Alert tone="error">
						Payment settings aren&apos;t available yet ({loadError}). Run <code>supabase/migrations/20261007000000_payments.sql</code> in the Supabase SQL editor.
					</Alert>
				)}
				<ShopStatusAlert status={readiness} />
				<p className="text-sm text-slate-600 dark:text-slate-400">
					Secret keys are encrypted before they&apos;re stored and are never shown again — leave a key field blank to keep the saved one.
				</p>
				{gateways.map((g) => (
					<GatewayCard key={g.id} gateway={g} />
				))}
			</div>
		</>
	);
}

function GatewayCard({ gateway: g }: { gateway: GatewayAdminView }) {
	const Icon = ICONS[g.id];
	const missing = missingFor(g.id, g.settings, g.hasSecret);
	const ready = missing.length === 0;
	const live = g.enabled && ready;

	return (
		<section aria-labelledby={`gw-${g.id}`} className={cn(cardClass, live && "border-teal-200 dark:border-teal-900/60")}>
			<form action={savePaymentGateway}>
				<input type="hidden" name="id" value={g.id} />
				<header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
					<span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
						<Icon className="h-5 w-5" aria-hidden />
					</span>
					<div className="min-w-0 flex-1">
						<h2 id={`gw-${g.id}`} className="font-semibold text-slate-900 dark:text-white">
							{GATEWAY_NAMES[g.id]}
						</h2>
						<p className="text-xs text-slate-600 dark:text-slate-400">Last saved {formatDate(g.updated_at, { dateStyle: "medium", timeStyle: "short" })}</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{g.id !== "manual" && <Badge tone={g.mode === "live" ? "published" : "warning"}>{g.mode === "live" ? "Live" : "Test mode"}</Badge>}
						<Badge tone={live ? "published" : "neutral"}>{live ? "On" : g.enabled ? "On — not configured" : "Off"}</Badge>
					</div>
					<label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
						<input type="checkbox" name="enabled" defaultChecked={g.enabled} className="peer sr-only" />
						<span
							aria-hidden
							className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-teal-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600 peer-focus-visible:ring-offset-2 dark:bg-slate-700"
						/>
						Enable
					</label>
				</header>

				<div className="grid gap-5 p-5 lg:grid-cols-2">
					<div className="space-y-4">
						<Field id={`${g.id}-title`} label="Name at checkout">
							<input id={`${g.id}-title`} name="title" maxLength={80} defaultValue={g.settings.title || DEFAULT_TITLES[g.id]} className={inputClass} />
						</Field>
						<Field id={`${g.id}-description`} label={g.id === "manual" ? "Instructions at checkout" : "Description at checkout"} hint={g.id === "manual" ? "Leave blank to use the checkout note from shop settings." : undefined}>
							<textarea id={`${g.id}-description`} name="description" rows={3} maxLength={300} defaultValue={g.settings.description ?? ""} className={inputClass} />
						</Field>
						{g.id !== "manual" && (
							<fieldset>
								<legend className={labelClass}>Mode</legend>
								<div className="flex gap-2">
									{(["test", "live"] as const).map((m) => (
										<label key={m} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50 dark:border-slate-700 dark:has-[:checked]:border-teal-400 dark:has-[:checked]:bg-teal-950">
											<input type="radio" name="mode" value={m} defaultChecked={g.mode === m} className="accent-teal-700" />
											{m === "test" ? (g.id === "paypal" ? "Sandbox (test)" : "Test") : "Live"}
										</label>
									))}
								</div>
								<p className={hintClass}>Use test/sandbox keys while trying things out; switch to live with live keys when you launch.</p>
							</fieldset>
						)}
						{g.id === "manual" && (
							<p className="text-sm text-slate-600 dark:text-slate-400">
								Customers place the order without paying online. You confirm payment (e.g. Swish or bank transfer) and delivery by email. Stock is reserved as soon as the order is placed.
							</p>
						)}
					</div>

					{g.id === "stripe" && (
						<div className="space-y-4">
							<Field id="publishable_key" label="Publishable key" hint="Starts with pk_test_ or pk_live_.">
								<input id="publishable_key" name="publishable_key" defaultValue={g.settings.publishable_key ?? ""} autoComplete="off" spellCheck={false} className={`${inputClass} font-mono`} />
							</Field>
							<SecretField name="secret_key" label="Secret key" hint="Starts with sk_test_/sk_live_ (or a restricted rk_ key with Checkout write access)." saved={!!g.hasSecret.secret_key} />
							<SecretField name="webhook_secret" label="Webhook signing secret" hint="Starts with whsec_. Recommended — confirms payments even if the customer closes the tab." saved={!!g.hasSecret.webhook_secret} />
							<div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
								<p className="font-semibold">Webhook endpoint (Stripe Dashboard → Developers → Webhooks)</p>
								<p className="mt-1 flex items-center gap-2">
									<code className="truncate font-mono">{WEBHOOK_URL}</code>
									<CopyButton value={WEBHOOK_URL} label="Copy webhook URL" />
								</p>
								<p className="mt-1">Events: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed</p>
							</div>
						</div>
					)}

					{g.id === "paypal" && (
						<div className="space-y-4">
							<Field id="client_id" label="Client ID" hint="PayPal Developer Dashboard → Apps & Credentials (sandbox or live, matching the mode).">
								<input id="client_id" name="client_id" defaultValue={g.settings.client_id ?? ""} autoComplete="off" spellCheck={false} className={`${inputClass} font-mono`} />
							</Field>
							<SecretField name="client_secret" label="Client secret" hint="From the same PayPal app." saved={!!g.hasSecret.client_secret} />
						</div>
					)}
				</div>

				<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/30">
					<p className="text-xs text-slate-600 dark:text-slate-400">{ready ? "Ready to use." : `Needs: ${missing.join(", ")}.`}</p>
					<div className="flex gap-2">
						{g.id !== "manual" && (
							<SubmitButton variant="secondary" pendingLabel="Testing…" formAction={testPaymentGateway}>
								<PlugZap className="h-4 w-4" aria-hidden /> Test connection
							</SubmitButton>
						)}
						<SubmitButton pendingLabel="Saving…">Save {GATEWAY_NAMES[g.id]}</SubmitButton>
					</div>
				</footer>
			</form>
		</section>
	);
}

function SecretField({ name, label, hint, saved }: { name: string; label: string; hint: string; saved: boolean }) {
	return (
		<div>
			<label htmlFor={name} className={labelClass}>
				{label} {saved && <Badge tone="published">Saved</Badge>}
			</label>
			<input
				id={name}
				name={name}
				type="password"
				autoComplete="new-password"
				spellCheck={false}
				placeholder={saved ? "•••••••• saved — leave blank to keep" : "Paste key"}
				className={`${inputClass} font-mono`}
			/>
			<p className={hintClass}>{hint}</p>
			{saved && (
				<label className="mt-1.5 inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
					<input type="checkbox" name={`clear_${name}`} className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600" /> Remove saved key
				</label>
			)}
		</div>
	);
}
