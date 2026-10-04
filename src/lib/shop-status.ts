import "server-only";
import { adminGetShopSettings } from "@/lib/shop-admin";
import { DEFAULT_TITLES, listGatewaysAdmin, missingFor, type GatewayAdminView } from "@/lib/payments";

export type ShopReadiness = {
	enabled: boolean;
	/** Payment methods that are on and fully configured. */
	usable: Array<{ id: GatewayAdminView["id"]; title: string; mode: GatewayAdminView["mode"] }>;
	/** Methods switched on but missing keys. */
	incomplete: Array<{ id: GatewayAdminView["id"]; title: string; missing: string[] }>;
	/** The payments table exists (migration has run). */
	paymentsReady: boolean;
	state: "live" | "ready" | "needs-payment" | "live-without-payment";
};

/** Whether the shop can take orders. The shop may only be switched on when at least one payment method is usable. */
export async function getShopReadiness(): Promise<ShopReadiness> {
	const [settings, gateways] = await Promise.all([adminGetShopSettings(), listGatewaysAdmin().catch(() => null)]);
	const all = gateways ?? [];
	const usable = all.filter((g) => g.enabled && missingFor(g.id, g.settings, g.hasSecret).length === 0).map((g) => ({ id: g.id, title: g.settings.title || DEFAULT_TITLES[g.id], mode: g.mode }));
	const incomplete = all
		.filter((g) => g.enabled && missingFor(g.id, g.settings, g.hasSecret).length > 0)
		.map((g) => ({ id: g.id, title: g.settings.title || DEFAULT_TITLES[g.id], missing: missingFor(g.id, g.settings, g.hasSecret) }));
	const state = settings.enabled ? (usable.length ? "live" : "live-without-payment") : usable.length ? "ready" : "needs-payment";
	return { enabled: settings.enabled, usable, incomplete, paymentsReady: gateways !== null, state };
}
