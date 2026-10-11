import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShopSettings } from "@/lib/shop";
import { alreadySent, sendEmail } from "./send";
import { newOrderAlertEmail, orderCancelledEmail, orderConfirmationEmail, orderShippedEmail, type OrderEmailData } from "./order-templates";

/**
 * Order notifications (shop-reference.md §8, A9). Each kind is sent at most once per order
 * (checked against email_log, plus Resend's idempotency key). Never throws.
 */
export type OrderNotice = "confirmation" | "alert" | "shipped" | "cancelled";

const COLUMNS =
	"id,order_number,access_token,customer_name,email,currency,items,subtotal,shipping_total,tax_total,total,payment_method,payment_status,shipping_method,shipping_address,carrier,tracking_number,tracking_url,notes";

export async function notifyOrder(orderId: string, kind: OrderNotice): Promise<void> {
	try {
		const [{ data }, settings] = await Promise.all([createAdminClient().from("orders").select(COLUMNS).eq("id", orderId).maybeSingle(), getShopSettings()]);
		if (!data) return;
		const o = { ...data, subtotal: Number(data.subtotal), shipping_total: Number(data.shipping_total ?? 0), tax_total: Number(data.tax_total ?? 0), total: Number(data.total ?? data.subtotal) } as unknown as OrderEmailData;

		const template = kind === "confirmation" ? (o.payment_status === "paid" ? "order_paid" : "order_received") : `order_${kind}`;
		if (await alreadySent(template, orderId)) return;

		const to = kind === "alert" ? settings.order_alert_email : o.email;
		if (!to) return; // alerts switched off
		const built = kind === "confirmation" ? orderConfirmationEmail(o) : kind === "shipped" ? orderShippedEmail(o) : kind === "cancelled" ? orderCancelledEmail(o) : newOrderAlertEmail(o);
		const fromAddress = settings.email_from_address;
		await sendEmail({
			template,
			to,
			subject: built.subject,
			html: built.html,
			text: built.text,
			from: fromAddress ? `${settings.email_from_name || "Merkado PH"} <${fromAddress}>` : "",
			// Customers reply to the shop inbox; the alert replies go to the customer.
			replyTo: kind === "alert" ? o.email : settings.order_alert_email || null,
			orderId,
			idempotencyKey: `${template}:${orderId}`,
		});
	} catch (err) {
		console.error(`[notifyOrder:${kind}]`, err instanceof Error ? err.message : err);
	}
}

/** Sends after the response is on its way, so customers never wait for email. */
export function notifyOrderLater(orderId: string, ...kinds: OrderNotice[]): void {
	after(async () => {
		for (const kind of kinds) await notifyOrder(orderId, kind);
	});
}
