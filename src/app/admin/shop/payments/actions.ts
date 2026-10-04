"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { seal } from "@/lib/secret-box";
import { gatewayConfig, GATEWAY_IDS, GATEWAY_NAMES, GATEWAY_SECRETS, missingFor, type GatewayId, type GatewayMode, type GatewaySettings } from "@/lib/payments";
import { paypalTest, stripeTest } from "@/lib/payment-providers";
import { getShopReadiness } from "@/lib/shop-status";

const back = (flash: Record<string, string>): never => redirect(`/admin/shop/payments?${new URLSearchParams(flash)}`);
const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

/** Basic key-format checks so a test key isn't saved in live mode (and vice versa). */
function checkKeys(id: GatewayId, mode: GatewayMode, settings: GatewaySettings, newSecrets: Record<string, string>): string | null {
	if (id !== "stripe") return null;
	const env = mode === "live" ? "live" : "test";
	if (newSecrets.secret_key && !new RegExp(`^(sk|rk)_${env}_`).test(newSecrets.secret_key)) return `The Stripe secret key should start with sk_${env}_ (or rk_${env}_) in ${env} mode.`;
	if (settings.publishable_key && !settings.publishable_key.startsWith(`pk_${env}_`)) return `The Stripe publishable key should start with pk_${env}_ in ${env} mode.`;
	if (newSecrets.webhook_secret && !newSecrets.webhook_secret.startsWith("whsec_")) return "The Stripe webhook signing secret should start with whsec_.";
	return null;
}

export async function savePaymentGateway(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id")) as GatewayId;
	if (!GATEWAY_IDS.includes(id)) back({ error: "Unknown payment method." });

	const db = createAdminClient();
	const { data: current } = await db.from("payment_gateways").select("secrets").eq("id", id).maybeSingle();
	if (!current) back({ error: "Payment settings aren't set up yet. Run the payments SQL migration first." });

	const mode: GatewayMode = id === "manual" ? "live" : formData.get("mode") === "live" ? "live" : "test";
	const settings: GatewaySettings = {
		title: str(formData, "title", 80),
		description: str(formData, "description", 300),
		...(id === "stripe" ? { publishable_key: str(formData, "publishable_key", 200) } : {}),
		...(id === "paypal" ? { client_id: str(formData, "client_id", 200) } : {}),
	};

	// Secrets: a new value replaces, "remove" clears, blank keeps the saved one.
	const secrets: Record<string, string> = { ...((current!.secrets as Record<string, string>) ?? {}) };
	const newSecrets: Record<string, string> = {};
	for (const name of GATEWAY_SECRETS[id]) {
		const value = str(formData, name, 500);
		if (formData.get(`clear_${name}`) === "on") delete secrets[name];
		else if (value) newSecrets[name] = value;
	}
	const keyProblem = checkKeys(id, mode, settings, newSecrets);
	if (keyProblem) back({ error: keyProblem });
	try {
		for (const [name, value] of Object.entries(newSecrets)) secrets[name] = await seal(value);
	} catch {
		back({ error: "Encryption isn't configured (SETTINGS_ENCRYPTION_KEY is missing), so keys can't be saved." });
	}

	const enabled = formData.get("enabled") === "on";
	const missing = missingFor(
		id,
		settings,
		Object.fromEntries(Object.keys(secrets).map((k) => [k, true])),
	);
	if (enabled && missing.length) back({ error: `${GATEWAY_NAMES[id]} can't be turned on yet — add the ${missing.join(" and ")}.` });

	// While the shop is live, never leave it without a working payment method.
	const readiness = await getShopReadiness();
	const othersUsable = readiness.usable.some((m) => m.id !== id);
	if (readiness.enabled && !othersUsable && !(enabled && missing.length === 0)) {
		back({ error: `${GATEWAY_NAMES[id]} is the shop's only working payment method. Set up another method or turn the shop off before switching it off.` });
	}

	const { error } = await db.from("payment_gateways").update({ enabled, mode, settings, secrets }).eq("id", id);
	if (error) back({ error: error.message });

	revalidatePath("/admin/shop/payments");
	revalidatePath("/checkout");
	back({ notice: `${GATEWAY_NAMES[id]} saved${enabled ? ` and ON${id !== "manual" ? ` (${mode} mode)` : ""}` : " (off)"}.` });
}

export async function testPaymentGateway(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id")) as GatewayId;
	const config = await gatewayConfig(id).catch(() => null);
	if (!config) back({ error: "Payment settings aren't set up yet." });
	try {
		if (id === "stripe") {
			if (!config!.secrets.secret_key) back({ error: "Save a Stripe secret key first." });
			const account = await stripeTest(config!.secrets.secret_key!);
			back({ notice: `Stripe connection OK — account “${account}” (${config!.mode} mode).` });
		}
		if (id === "paypal") {
			if (!config!.settings.client_id || !config!.secrets.client_secret) back({ error: "Save the PayPal client ID and secret first." });
			const label = await paypalTest(config!.mode, config!.settings.client_id!, config!.secrets.client_secret!);
			back({ notice: `PayPal connection OK — ${label}.` });
		}
	} catch (err) {
		// redirect() throws too; let it through.
		if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
		back({ error: err instanceof Error ? err.message : "Connection failed." });
	}
	back({ error: "Nothing to test for this payment method." });
}
