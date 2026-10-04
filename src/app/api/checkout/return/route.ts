import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { gatewayConfig } from "@/lib/payments";
import { paypalCapture, stripeGetSession } from "@/lib/payment-providers";
import { markOrderPaid } from "@/lib/orders";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Customers land here after paying on Stripe Checkout or approving on PayPal.
 * The payment is verified server-to-server (never trusting the URL alone), the order is
 * marked paid, then the customer is sent to the confirmation page.
 */
export async function GET(request: NextRequest) {
	const url = request.nextUrl;
	const orderId = url.searchParams.get("order") ?? "";
	const gateway = url.searchParams.get("gateway");
	const done = (state?: string) => NextResponse.redirect(new URL(`/checkout/complete?order=${encodeURIComponent(orderId)}${state ? `&state=${state}` : ""}`, request.url));
	if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.redirect(new URL("/cart", request.url));

	try {
		let result: { paid: boolean; slugs: string[] } = { paid: false, slugs: [] };

		if (gateway === "stripe") {
			const config = await gatewayConfig("stripe");
			const session = await stripeGetSession(config?.secrets.secret_key ?? "", url.searchParams.get("session_id") ?? "");
			if (session.client_reference_id !== orderId) return done("mismatch");
			// Some methods (bank debits, some wallets) confirm later; the webhook finishes those.
			if (session.payment_status !== "paid") return done("processing");
			result = await markOrderPaid(orderId, session.payment_intent ?? session.id);
		} else if (gateway === "paypal") {
			const config = await gatewayConfig("paypal");
			const token = url.searchParams.get("token") ?? "";
			// Only capture the PayPal order we created for this order.
			const { data } = await createAdminClient().from("orders").select("payment_reference,payment_status").eq("id", orderId).maybeSingle();
			if (!data || data.payment_reference !== token) return done("mismatch");
			if (data.payment_status === "paid") return done();
			const capture = await paypalCapture(config?.mode ?? "test", config?.settings.client_id ?? "", config?.secrets.client_secret ?? "", token);
			const unit = capture.purchase_units?.[0];
			const cap = unit?.payments?.captures?.[0];
			if (capture.status !== "COMPLETED" || (unit?.custom_id ?? cap?.custom_id) !== orderId) return done("processing");
			result = await markOrderPaid(orderId, cap?.id ?? capture.id);
		} else {
			return done();
		}

		if (result.slugs.length) {
			revalidateTag("products", { expire: 0 });
			result.slugs.forEach((s) => revalidatePath(`/product/${s}`));
		}
		revalidatePath("/admin/shop", "layout");
		return done(result.paid ? undefined : "processing");
	} catch (err) {
		console.error("Payment return failed:", err instanceof Error ? err.message : err);
		return done("error");
	}
}
