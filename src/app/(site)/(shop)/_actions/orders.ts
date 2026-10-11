"use server";

import { redirect } from "next/navigation";
import * as orders from "@/server/shop/orders";
import type { FormResult } from "./auth";

/**
 * Website transport for "My orders" (shop-reference.md §3.2–3.3, A8). The order number only picks
 * one of the customer's own orders — the service reads through RLS, so other orders can't be reached.
 */
export async function cancelOrderAction(formData: FormData): Promise<void> {
	const number = String(formData.get("order") ?? "");
	const res = await orders.cancelMyOrder(number);
	redirect(`/account/orders/${encodeURIComponent(number)}?${res.ok ? "notice=cancelled" : `error=${encodeURIComponent(res.error.message)}`}`);
}

export async function requestCancellationAction(_prev: FormResult, formData: FormData): Promise<FormResult<null>> {
	const number = String(formData.get("order") ?? "");
	const res = await orders.requestCancellation(number, String(formData.get("reason") ?? ""));
	if (res.ok) redirect(`/account/orders/${encodeURIComponent(number)}?notice=cancel-requested`);
	return res;
}

export async function buyAgainAction(formData: FormData): Promise<void> {
	const res = await orders.buyAgain(String(formData.get("order") ?? ""));
	const skipped = res.ok ? res.data.skipped.length : 0;
	redirect(`/cart?${res.ok ? `notice=buy-again&skipped=${skipped}` : `error=${encodeURIComponent(res.error.message)}`}`);
}
