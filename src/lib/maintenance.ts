import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY = 24 * 60 * 60 * 1000;
/** Unpaid Stripe/PayPal orders older than this were abandoned at the payment page. */
const ABANDONED_AFTER_MS = DAY;
/** Retention for ops_logs and audit_logs (security.md §10). */
const LOG_RETENTION_DAYS = 180;
/** Contact form messages: 24 months, as stated in the privacy policy. */
const MESSAGE_RETENTION_DAYS = 730;

/**
 * Housekeeping run by the scheduled cron (cloudflare-worker.js → /api/cron/keepalive).
 * Each step is independent; a failure in one doesn't stop the others.
 */
export async function runMaintenance(): Promise<Record<string, number | string>> {
	const db = createAdminClient();
	const out: Record<string, number | string> = {};

	const abandoned = await db
		.from("orders")
		.update({ payment_status: "failed", status: "cancelled" })
		.in("payment_method", ["stripe", "paypal"])
		.eq("payment_status", "unpaid")
		.eq("status", "pending")
		.eq("stock_reserved", false)
		.lt("created_at", new Date(Date.now() - ABANDONED_AFTER_MS).toISOString())
		.select("id");
	out.abandonedOrders = abandoned.error ? `error: ${abandoned.error.message}` : (abandoned.data?.length ?? 0);

	const purge = async (table: string, days: number) => {
		const { error, count } = await db
			.from(table)
			.delete({ count: "exact" })
			.lt("created_at", new Date(Date.now() - days * DAY).toISOString());
		out[table] = error ? `error: ${error.message}` : (count ?? 0);
	};
	await purge("ops_logs", LOG_RETENTION_DAYS);
	await purge("audit_logs", LOG_RETENTION_DAYS);
	await purge("contact_messages", MESSAGE_RETENTION_DAYS);
	await purge("email_log", LOG_RETENTION_DAYS);

	// Carts (shop-reference.md §15.2): idle guest carts after 30 days; merged/converted/abandoned after 90.
	const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
	const guests = await db.from("carts").delete({ count: "exact" }).eq("status", "active").not("guest_token_hash", "is", null).lt("last_activity_at", ago(30));
	const closed = await db.from("carts").delete({ count: "exact" }).in("status", ["merged", "converted", "abandoned"]).lt("updated_at", ago(90));
	out.carts = guests.error || closed.error ? `error: ${(guests.error ?? closed.error)!.message}` : (guests.count ?? 0) + (closed.count ?? 0);
	// Guest wishlists: 60 days after saving (the device cookie lasts 30 days from last use).
	const wish = await db.from("wishlist_items").delete({ count: "exact" }).not("guest_token_hash", "is", null).lt("created_at", ago(60));
	out.wishlist_items = wish.error ? `error: ${wish.error.message}` : (wish.count ?? 0);
	return out;
}
