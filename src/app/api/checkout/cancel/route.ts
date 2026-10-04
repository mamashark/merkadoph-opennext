import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { markOrderPaymentFailed } from "@/lib/orders";

/** The customer backed out on Stripe/PayPal: close the unpaid order and return to the cart (still filled). */
export async function GET(request: NextRequest) {
	const orderId = request.nextUrl.searchParams.get("order") ?? "";
	if (/^[0-9a-f-]{36}$/i.test(orderId)) {
		await markOrderPaymentFailed(orderId, true).catch(() => {});
		revalidatePath("/admin/shop", "layout");
	}
	return NextResponse.redirect(new URL("/cart?payment=cancelled", request.url));
}
