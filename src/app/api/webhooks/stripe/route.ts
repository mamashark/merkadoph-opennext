import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { gatewayConfig } from "@/lib/payments";
import { stripeVerifyWebhook } from "@/lib/payment-providers";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/orders";

/**
 * Stripe webhook: [site]/api/webhooks/stripe
 * Events: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed.
 * Backup for the browser return — e.g. the customer closed the tab, or the payment confirmed later.
 */
export async function POST(request: Request) {
	const config = await gatewayConfig("stripe").catch(() => null);
	const webhookSecret = config?.secrets.webhook_secret;
	if (!webhookSecret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

	const raw = await request.text();
	if (!(await stripeVerifyWebhook(raw, request.headers.get("stripe-signature"), webhookSecret))) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
	}

	const event = JSON.parse(raw) as { type: string; data: { object: { id: string; client_reference_id?: string | null; payment_status?: string; payment_intent?: string | null } } };
	const session = event.data.object;
	const orderId = session.client_reference_id ?? "";
	if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ received: true, ignored: "no order" });

	if (event.type === "checkout.session.async_payment_failed") {
		await markOrderPaymentFailed(orderId, false);
	} else if ((event.type === "checkout.session.completed" && session.payment_status === "paid") || event.type === "checkout.session.async_payment_succeeded") {
		const { slugs } = await markOrderPaid(orderId, session.payment_intent ?? session.id);
		if (slugs.length) {
			revalidateTag("products", { expire: 0 });
			slugs.forEach((s) => revalidatePath(`/product/${s}`));
		}
	}
	revalidatePath("/admin/shop", "layout");
	return NextResponse.json({ received: true });
}
