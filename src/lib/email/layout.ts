import { SITE_URL } from "@/lib/env";

/**
 * Bilingual email layout (English section, then Swedish) — table-based HTML with inline styles,
 * which works in Gmail, Outlook and Apple Mail. Every dynamic value goes through `esc()`.
 */
export const esc = (s: unknown) =>
	String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const C = { ink: "#1c1917", muted: "#57534e", line: "#e7e5e4", brand: "#0f766e", bg: "#fbf7ef", card: "#ffffff" };

export function button(href: string, label: string): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0"><tr><td style="border-radius:10px;background:${C.brand}"><a href="${esc(href)}" style="display:inline-block;padding:12px 22px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${esc(label)}</a></td></tr></table>`;
}

export const h1 = (text: string) => `<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${C.ink}">${esc(text)}</h1>`;
export const p = (html: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${C.ink}">${html}</p>`;
export const small = (html: string) => `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${C.muted}">${html}</p>`;

/** Label/value rows (totals, delivery details). Values are pre-escaped HTML. */
export function rows(items: Array<[string, string, boolean?]>): string {
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;font-size:14px">${items
		.map(([label, value, strong]) => `<tr><td style="padding:4px 0;color:${C.muted}">${esc(label)}</td><td align="right" style="padding:4px 0;color:${C.ink};${strong ? "font-weight:700" : ""}">${value}</td></tr>`)
		.join("")}</table>`;
}

/** Product lines table. */
export function lines(items: Array<{ title: string; quantity: number; total: string }>): string {
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;font-size:14px;border-top:1px solid ${C.line}">${items
		.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid ${C.line};color:${C.ink}">${esc(i.title)} <span style="color:${C.muted}">× ${i.quantity}</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid ${C.line};color:${C.ink};white-space:nowrap">${esc(i.total)}</td></tr>`)
		.join("")}</table>`;
}

/**
 * Whole email: brand header, English section, Swedish section, footer.
 * `preheader` is the grey preview text shown in the inbox list.
 */
export function layout({ preheader, en, sv, footerNote }: { preheader: string; en: string; sv: string; footerNote?: string }): string {
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>Merkado PH</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="padding:0 4px 16px"><a href="${SITE_URL}" style="text-decoration:none"><img src="${SITE_URL}/android-chrome-192x192.png" width="40" height="40" alt="" style="vertical-align:middle;border-radius:8px"> <span style="vertical-align:middle;font-size:18px;font-weight:700;color:${C.ink}">Merkado PH</span></a></td></tr>
<tr><td style="background:${C.card};border-radius:16px;padding:28px 24px">
<div lang="en">${en}</div>
<div style="margin:28px 0 20px;border-top:1px solid ${C.line};padding-top:6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted}">På svenska</div>
<div lang="sv">${sv}</div>
</td></tr>
<tr><td style="padding:16px 8px;font-size:12px;line-height:1.5;color:${C.muted};text-align:center">${footerNote ? `${footerNote}<br>` : ""}Merkado PH · <a href="${SITE_URL}" style="color:${C.muted}">${esc(SITE_URL.replace(/^https?:\/\//, ""))}</a> · <a href="${SITE_URL}/privacy" style="color:${C.muted}">Privacy / Integritet</a></td></tr>
</table></td></tr></table></body></html>`;
}

/** Plain-text alternative (spam filters and accessibility like having one). */
export const textVersion = (en: string[], sv: string[]) => [...en, "", "— På svenska —", "", ...sv, "", `Merkado PH · ${SITE_URL}`].join("\n");
