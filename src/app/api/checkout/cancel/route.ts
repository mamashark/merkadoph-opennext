import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getOrderForViewer, markOrderPaymentFailed } from "@/lib/orders";
import { siteUrl } from "@/lib/env";
import { SHOP_CODE_ENABLED } from "@/lib/shop-gate";

/**
 * The customer backed out on Stripe/PayPal: close the unpaid order, give its stock back and
 * restore the cart. Requires the order's private token (D21) — a bare id can't cancel anything.
 */
export async function GET(request: NextRequest) {
	// The old shop is closed (src/lib/shop-gate.ts): this endpoint answers 404.
	if (!SHOP_CODE_ENABLED) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
	const params = request.nextUrl.searchParams;
	const order = await getOrderForViewer(params.get("order") ?? "", params.get("t"), null);
	if (order && order.payment_status === "unpaid") {
		const slugs = await markOrderPaymentFailed(order.id, true).catch(() => [] as string[]);
		if (slugs.length) {
			revalidateTag("products", { expire: 0 });
			slugs.forEach((s) => revalidatePath(`/product/${s}`));
		}
		revalidatePath("/admin/shop", "layout");
	}
	return NextResponse.redirect(siteUrl("/cart?payment=cancelled"));
}
