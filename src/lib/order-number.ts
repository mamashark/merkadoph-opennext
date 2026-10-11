/** Customer-facing order numbers (shop-reference.md D20): "MPH-1001". Safe for client and server. */
export const ORDER_PREFIX = "MPH-";

export function formatOrderNumber(n: number | string): string {
	return `${ORDER_PREFIX}${n}`;
}

/** "MPH-1001", "mph1001", "#1001" or "1001" → 1001 (null if it isn't an order number). */
export function parseOrderNumber(input: string): number | null {
	const m = input.trim().match(/^(?:#|mph-?)?(\d{1,12})$/i);
	return m ? Number(m[1]) : null;
}
