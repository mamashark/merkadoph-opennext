import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getOrderForViewer, markOrderPaymentFailed } from "@/lib/orders";
import { siteUrl } from "@/lib/env";

/**
 * The customer backed out on Stripe/PayPal: close the unpaid order, give its stock back and
 * restore the cart. Requires the order's private token (D21) — a bare id can't cancel anything.
 */
export async function GET(request: NextRequest) {
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
