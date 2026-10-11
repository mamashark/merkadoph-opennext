import { SITE_URL } from "@/lib/env";
import { formatMoney, type Currency } from "@/lib/pricing";
import { formatOrderNumber } from "@/lib/order-number";
import { button, esc, h1, layout, lines, p, rows, small, textVersion } from "./layout";

/**
 * Order emails (shop-reference.md §8, A9). Customer emails: English section + Swedish section.
 * The admin alert is English only. Swedish copy should be proofread by a native speaker.
 */

export type OrderEmailData = {
	id: string;
	order_number: number;
	access_token: string;
	customer_name: string;
	email: string;
	currency: string;
	items: Array<{ title: string; quantity: number; line_total: number }>;
	subtotal: number;
	shipping_total: number;
	tax_total: number;
	total: number;
	payment_method: string;
	payment_status: string;
	shipping_method: { title: string; type: string; pickup_address?: string | null } | null;
	shipping_address: { first_name?: string | null; last_name?: string | null; company?: string | null; care_of?: string | null; line1?: string | null; line2?: string | null; postal_code?: string | null; city?: string | null } | null;
	carrier?: string | null;
	tracking_number?: string | null;
	tracking_url?: string | null;
	notes?: string | null;
};

export type BuiltEmail = { subject: string; html: string; text: string };

const money = (o: OrderEmailData, n: number) => formatMoney(n, o.currency as Currency);
const orderLink = (o: OrderEmailData) => `${SITE_URL}/checkout/complete?${new URLSearchParams({ order: o.id, t: o.access_token })}`;
const firstName = (o: OrderEmailData) => (o.shipping_address?.first_name || o.customer_name.split(" ")[0] || "").trim();

function addressLines(o: OrderEmailData): string[] {
	const a = o.shipping_address;
	if (!a) return [];
	return [[a.first_name, a.last_name].filter(Boolean).join(" "), a.company, a.care_of ? `c/o ${a.care_of}` : "", a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" ")].filter((x): x is string => !!x);
}

type Lang = "en" | "sv";
const L = {
	en: { subtotal: "Subtotal", shipping: "Shipping", vat: "of which VAT", total: "Total", delivery: "Delivery", address: "Delivery address", pickup: "Pickup at", view: "View your order", free: "Free" },
	sv: { subtotal: "Delsumma", shipping: "Frakt", vat: "varav moms", total: "Totalt", delivery: "Leverans", address: "Leveransadress", pickup: "Hämtas på", view: "Visa din beställning", free: "Gratis" },
};

/** Items + totals + delivery block in one language. */
function summary(o: OrderEmailData, lang: Lang): string {
	const t = L[lang];
	const pickup = o.shipping_method?.type === "pickup";
	return [
		lines(o.items.map((i) => ({ title: i.title, quantity: i.quantity, total: money(o, i.line_total) }))),
		rows([
			[t.subtotal, esc(money(o, o.subtotal))],
			[t.shipping, esc(o.shipping_total > 0 ? money(o, o.shipping_total) : t.free)],
			[t.total, esc(money(o, o.total)), true],
			...(o.tax_total > 0 ? ([[t.vat, esc(money(o, o.tax_total))]] as Array<[string, string]>) : []),
		]),
		o.shipping_method ? small(`<strong>${esc(t.delivery)}:</strong> ${esc(o.shipping_method.title)}`) : "",
		pickup && o.shipping_method?.pickup_address
			? small(`<strong>${esc(t.pickup)}:</strong> ${esc(o.shipping_method.pickup_address)}`)
			: addressLines(o).length
				? small(`<strong>${esc(t.address)}:</strong><br>${addressLines(o).map(esc).join("<br>")}`)
				: "",
	].join("");
}

function textSummary(o: OrderEmailData, lang: Lang): string[] {
	const t = L[lang];
	return [
		...o.items.map((i) => `- ${i.title} × ${i.quantity}: ${money(o, i.line_total)}`),
		`${t.subtotal}: ${money(o, o.subtotal)}`,
		`${t.shipping}: ${o.shipping_total > 0 ? money(o, o.shipping_total) : t.free}`,
		`${t.total}: ${money(o, o.total)}`,
		...(o.tax_total > 0 ? [`${t.vat}: ${money(o, o.tax_total)}`] : []),
		...(o.shipping_method ? [`${t.delivery}: ${o.shipping_method.title}`] : []),
	];
}

/** Order received (pay later) or payment confirmed. */
export function orderConfirmationEmail(o: OrderEmailData): BuiltEmail {
	const n = formatOrderNumber(o.order_number);
	const paid = o.payment_status === "paid";
	const name = firstName(o);
	const en = [
		h1(paid ? `Salamat! Your payment is confirmed` : `Salamat! We've received your order`),
		p(`${name ? `Hi ${esc(name)}, t` : "T"}hank you for ordering from Merkado PH. Your order number is <strong>${n}</strong>.`),
		p(paid ? `We've received your payment of <strong>${esc(money(o, o.total))}</strong>. We'll let you know when your order is on its way.` : `You chose to pay later — we'll contact you about payment and delivery. No payment has been taken yet.`),
		summary(o, "en"),
		button(orderLink(o), L.en.view),
	].join("");
	const sv = [
		h1(paid ? `Tack! Din betalning är bekräftad` : `Tack! Vi har tagit emot din beställning`),
		p(`${name ? `Hej ${esc(name)}, t` : "T"}ack för din beställning hos Merkado PH. Ditt ordernummer är <strong>${n}</strong>.`),
		p(paid ? `Vi har tagit emot din betalning på <strong>${esc(money(o, o.total))}</strong>. Vi hör av oss när din beställning är på väg.` : `Du valde att betala senare – vi kontaktar dig om betalning och leverans. Ingen betalning har dragits ännu.`),
		summary(o, "sv"),
		button(orderLink(o), L.sv.view),
	].join("");
	return {
		subject: paid ? `Order ${n} confirmed / Beställning ${n} bekräftad` : `Order ${n} received / Beställning ${n} mottagen`,
		html: layout({ preheader: `Order ${n} — ${money(o, o.total)}`, en, sv, footerNote: "Questions? Just reply to this email. · Frågor? Svara bara på det här mejlet." }),
		text: textVersion(
			[paid ? "Your payment is confirmed." : "We've received your order.", `Order: ${n}`, ...textSummary(o, "en"), `View your order: ${orderLink(o)}`],
			[paid ? "Din betalning är bekräftad." : "Vi har tagit emot din beställning.", `Beställning: ${n}`, ...textSummary(o, "sv"), `Visa din beställning: ${orderLink(o)}`],
		),
	};
}

export function orderShippedEmail(o: OrderEmailData): BuiltEmail {
	const n = formatOrderNumber(o.order_number);
	const pickup = o.shipping_method?.type === "pickup";
	const track = o.tracking_url && /^https:\/\//.test(o.tracking_url) ? o.tracking_url : null;
	const trackLine = (lang: Lang) =>
		o.tracking_number ? small(`${lang === "en" ? "Tracking number" : "Spårningsnummer"}${o.carrier ? ` (${esc(o.carrier)})` : ""}: <strong>${esc(o.tracking_number)}</strong>`) : "";
	const en = [
		h1(pickup ? "Your order is ready for pickup" : "Your order is on its way"),
		p(pickup ? `Order <strong>${n}</strong> is ready to collect at ${esc(o.shipping_method?.pickup_address ?? "our store")}.` : `Good news — order <strong>${n}</strong> has been sent.`),
		trackLine("en"),
		track ? button(track, "Track your parcel") : button(orderLink(o), L.en.view),
	].join("");
	const sv = [
		h1(pickup ? "Din beställning kan hämtas" : "Din beställning är på väg"),
		p(pickup ? `Beställning <strong>${n}</strong> kan hämtas på ${esc(o.shipping_method?.pickup_address ?? "vår butik")}.` : `Goda nyheter – beställning <strong>${n}</strong> har skickats.`),
		trackLine("sv"),
		track ? button(track, "Spåra ditt paket") : button(orderLink(o), L.sv.view),
	].join("");
	return {
		subject: pickup ? `Order ${n} is ready for pickup / kan hämtas` : `Order ${n} is on its way / är på väg`,
		html: layout({ preheader: pickup ? `Ready for pickup — ${n}` : `On its way — ${n}`, en, sv }),
		text: textVersion(
			[pickup ? "Your order is ready for pickup." : "Your order is on its way.", `Order: ${n}`, ...(o.tracking_number ? [`Tracking: ${o.tracking_number}`] : []), ...(track ? [track] : [])],
			[pickup ? "Din beställning kan hämtas." : "Din beställning är på väg.", `Beställning: ${n}`, ...(o.tracking_number ? [`Spårning: ${o.tracking_number}`] : [])],
		),
	};
}

export function orderCancelledEmail(o: OrderEmailData): BuiltEmail {
	const n = formatOrderNumber(o.order_number);
	const paid = o.payment_status === "paid" || o.payment_status === "refunded";
	const en = [
		h1("Your order has been cancelled"),
		p(`Order <strong>${n}</strong> has been cancelled.`),
		p(paid ? "If you've already paid, the amount will be refunded to the same payment method. It can take a few working days to show up." : "No payment was taken."),
		small("If this wasn't what you expected, just reply to this email."),
	].join("");
	const sv = [
		h1("Din beställning har avbrutits"),
		p(`Beställning <strong>${n}</strong> har avbrutits.`),
		p(paid ? "Om du redan har betalat återbetalas beloppet till samma betalningssätt. Det kan ta några bankdagar innan det syns." : "Ingen betalning har dragits."),
		small("Var detta inte vad du väntade dig? Svara bara på det här mejlet."),
	].join("");
	return {
		subject: `Order ${n} cancelled / Beställning ${n} avbruten`,
		html: layout({ preheader: `Order ${n} cancelled`, en, sv }),
		text: textVersion([`Order ${n} has been cancelled.`, paid ? "If you've paid, the amount will be refunded." : "No payment was taken."], [`Beställning ${n} har avbrutits.`, paid ? "Om du har betalat återbetalas beloppet." : "Ingen betalning har dragits."]),
	};
}

/** Internal alert to the shop (English only). */
export function newOrderAlertEmail(o: OrderEmailData): BuiltEmail {
	const n = formatOrderNumber(o.order_number);
	const status = o.payment_status === "paid" ? "PAID" : o.payment_method === "manual" ? "Pay later — arrange payment" : o.payment_status.toUpperCase();
	const adminUrl = `${SITE_URL}/admin/shop/orders/${o.id}`;
	const html = layout({
		preheader: `${n} · ${money(o, o.total)} · ${status}`,
		en: [h1(`New order ${n}`), p(`<strong>${esc(o.customer_name)}</strong> &lt;${esc(o.email)}&gt; · ${esc(status)}`), summary(o, "en"), o.notes ? small(`<strong>Note from customer:</strong> ${esc(o.notes)}`) : "", button(adminUrl, "Open in admin")].join(""),
		sv: small("Intern avisering – endast på engelska."),
	});
	return {
		subject: `New order ${n} — ${money(o, o.total)} (${status})`,
		html,
		text: [`New order ${n}`, `${o.customer_name} <${o.email}> — ${status}`, ...textSummary(o, "en"), `Admin: ${adminUrl}`].join("\n"),
	};
}
