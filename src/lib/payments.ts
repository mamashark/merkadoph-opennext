import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { open } from "@/lib/secret-box";

// Payment gateway settings. Service role only — never import from a Client Component.

export const GATEWAY_IDS = ["manual", "stripe", "paypal"] as const;
export type GatewayId = (typeof GATEWAY_IDS)[number];
export type GatewayMode = "test" | "live";

export type GatewaySettings = {
	title?: string;
	description?: string;
	/** Stripe */
	publishable_key?: string;
	/** PayPal */
	client_id?: string;
};

/** Which secrets each gateway uses (stored encrypted). */
export const GATEWAY_SECRETS = {
	manual: [],
	stripe: ["secret_key", "webhook_secret"],
	paypal: ["client_secret"],
} as const satisfies Record<GatewayId, readonly string[]>;
export type SecretName = (typeof GATEWAY_SECRETS)[GatewayId][number];

export type GatewayRow = {
	id: GatewayId;
	enabled: boolean;
	mode: GatewayMode;
	settings: GatewaySettings;
	secrets: Partial<Record<SecretName, string>>;
	sort_order: number;
	updated_at: string;
};

/** Admin view: secrets are never returned, only whether each one is set. */
export type GatewayAdminView = Omit<GatewayRow, "secrets"> & { hasSecret: Partial<Record<SecretName, boolean>> };

export async function listGatewaysAdmin(): Promise<GatewayAdminView[]> {
	const { data, error } = await createAdminClient().from("payment_gateways").select("*").order("sort_order");
	if (error) throw new Error(`Failed to load payment gateways: ${error.message}`);
	return (data as GatewayRow[]).map(({ secrets, ...g }) => ({ ...g, hasSecret: Object.fromEntries(Object.entries(secrets ?? {}).map(([k, v]) => [k, !!v])) }));
}

/** Server-side config with secrets decrypted, for API calls. */
export async function gatewayConfig(id: GatewayId) {
	const { data } = await createAdminClient().from("payment_gateways").select("*").eq("id", id).maybeSingle();
	if (!data) return null;
	const row = data as GatewayRow;
	const secrets: Partial<Record<SecretName, string>> = {};
	for (const [k, v] of Object.entries(row.secrets ?? {})) {
		const value = await open(v);
		if (value) secrets[k as SecretName] = value;
	}
	return { ...row, secrets };
}

/** Missing settings that stop a gateway from working (empty = ready). */
export function missingFor(id: GatewayId, settings: GatewaySettings, has: Partial<Record<SecretName, boolean>>): string[] {
	if (id === "stripe") return [!has.secret_key && "secret key"].filter(Boolean) as string[];
	if (id === "paypal") return [!settings.client_id && "client ID", !has.client_secret && "client secret"].filter(Boolean) as string[];
	return [];
}

export type CheckoutMethod = { id: GatewayId; title: string; description: string; mode: GatewayMode };

/** Payment methods offered at checkout: enabled and fully configured, in admin order. */
export async function checkoutMethods(): Promise<CheckoutMethod[]> {
	const gateways = await listGatewaysAdmin().catch(() => [] as GatewayAdminView[]);
	const usable = gateways
		.filter((g) => g.enabled && missingFor(g.id, g.settings, g.hasSecret).length === 0)
		.map((g) => ({ id: g.id, mode: g.mode, title: g.settings.title || DEFAULT_TITLES[g.id], description: g.settings.description || "" }));
	// No working method (or the payments table isn't there yet) means checkout is paused.
	return usable;
}

export const DEFAULT_TITLES: Record<GatewayId, string> = { manual: "Pay later", stripe: "Card, Apple Pay & Google Pay", paypal: "PayPal" };
export const GATEWAY_NAMES: Record<GatewayId, string> = { manual: "Pay later (manual)", stripe: "Stripe", paypal: "PayPal" };
