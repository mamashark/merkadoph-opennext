import type { OrderStatus } from "@/lib/shop-admin";

export const ORDER_TONES: Record<OrderStatus, "warning" | "scheduled" | "published" | "neutral"> = { pending: "warning", processing: "scheduled", completed: "published", cancelled: "neutral" };
export const ORDER_LABELS: Record<OrderStatus, string> = { pending: "Pending", processing: "Processing", completed: "Completed", cancelled: "Cancelled" };

export const PAYMENT_LABELS: Record<string, string> = { manual: "Pay later", stripe: "Stripe", paypal: "PayPal" };
export const PAYMENT_TONES: Record<string, "warning" | "published" | "neutral" | "accent"> = { unpaid: "warning", paid: "published", failed: "neutral", refunded: "accent" };
