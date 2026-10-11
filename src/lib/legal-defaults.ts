import type { LegalPageId, SeoSettings } from "@/lib/site-settings";

/**
 * Starter texts shown until an admin saves their own version in Admin → SEO → Legal pages.
 * They describe what this site actually does (forms, reCAPTCHA, Cloudflare, Supabase, Stripe/PayPal),
 * but they are templates, not legal advice: review them before launch.
 * Placeholders: {{business}}, {{legal_name}}, {{email}}, {{phone}}, {{address}}.
 */
const TEMPLATES: Record<LegalPageId, string> = {
	privacy: `This policy explains how {{legal_name}} ("we") handles personal data when you use this website, contact us or place an order. We follow the EU General Data Protection Regulation (GDPR).

## Who is responsible

{{legal_name}}, {{address}}. Contact: {{email}}{{phone}}.

## What we collect and why

| When | Data | Why (legal basis) | Kept for |
|---|---|---|---|
| Contact form / quote request | Name, email, phone (optional), your message | To answer you (legitimate interest / steps before a contract) | Up to 24 months |
| Orders | Name, email, phone, delivery address, order details | To deliver and invoice your order (contract), bookkeeping (legal obligation) | 7 years (Swedish Accounting Act) |
| Payments | Handled by Stripe or PayPal; we never see your card details | To take payment (contract) | As required by the payment provider |
| Security | IP address, browser type, time of request | To protect the site against spam and abuse (legitimate interest) | Up to 180 days |

## Who we share data with

We only use service providers that need the data to run the site, under data processing agreements:

- **Cloudflare** — hosting and security of the website.
- **Supabase** — database for messages and orders.
- **Google reCAPTCHA** — spam protection on forms. Google receives technical data about your visit ([Google privacy policy](https://policies.google.com/privacy)).
- **Stripe / PayPal** — card and PayPal payments, if you choose them.

Some providers may process data outside the EU/EEA; when they do, it is protected by the EU Standard Contractual Clauses or the EU–US Data Privacy Framework. We never sell your data.

## Your rights

You can ask for a copy of your data, have it corrected or deleted, object to or restrict processing, and receive it in a portable format. Email {{email}}. If you think we handle your data incorrectly you can complain to the Swedish Authority for Privacy Protection (IMY), [imy.se](https://www.imy.se).

## Cookies

See our [cookie policy](/cookies).`,

	terms: `These terms apply when you use this website and when you order products or services from {{legal_name}}.

## About us

{{legal_name}}, {{address}}. Contact: {{email}}{{phone}}.

## Quotes and services

Quotes for roofing, renovation and construction work are free and without obligation. A job is agreed only when we have both confirmed a written quote. For consumers, the Swedish Consumer Services Act (Konsumenttjänstlagen) applies.

## Orders from the shop

- Prices are shown in Swedish kronor (SEK) including VAT.
- An order is binding when we confirm it by email.
- If a product turns out to be unavailable, we will contact you and refund anything you have paid.

## Right of withdrawal

As a consumer you have 14 days to withdraw from a purchase made online (the Swedish Distance Contracts Act). This does not apply to perishable food, or to goods that were sealed for health or hygiene reasons and unsealed after delivery. Contact {{email}} to use your right of withdrawal.

## Complaints

Contact us first at {{email}}. You can also turn to the Swedish National Board for Consumer Disputes (ARN), [arn.se](https://www.arn.se), or the EU online dispute platform.

## Using the website

The content on this site belongs to {{business}}. Don't copy it without permission. We aim to keep information correct but can't guarantee it is always complete or up to date.

## Changes

We may update these terms. The version published here applies.`,

	cookies: `This page explains the cookies and similar technologies used on this website.

## Necessary (always on)

| Name | Provider | Purpose | Duration |
|---|---|---|---|
| Shopping cart (local storage) | This site | Remembers the items in your cart | Until you clear it |
| \`sb-…-auth-token\` | This site (Supabase) | Keeps staff signed in to the admin area only | Session / 7 days |
| reCAPTCHA cookies (\`_GRECAPTCHA\`) | Google | Spam protection, set only when you use a form | Up to 6 months |

These are needed for the site to work, so they don't require consent.

## Statistics

We use **Cloudflare Web Analytics**, which counts visits without cookies and without tracking you across sites.

## Marketing

We don't use advertising or tracking cookies. If that changes, we will ask for your consent first.

## Questions

Contact {{email}}. Read more in our [privacy policy](/privacy).`,
};

/** Fills a legal text's placeholders from the SEO business details. */
export function fillLegal(text: string, s: SeoSettings): string {
	const address = [s.street, [s.postal_code, s.city].filter(Boolean).join(" "), s.country === "SE" || !s.country ? "Sweden" : s.country].filter(Boolean).join(", ");
	return text
		.replaceAll("{{business}}", s.business_name)
		.replaceAll("{{legal_name}}", s.legal_name || s.business_name)
		.replaceAll("{{email}}", s.email || "us through the contact form on our homepage")
		.replaceAll("{{phone}}", s.phone ? `, ${s.phone}` : "")
		.replaceAll("{{address}}", address);
}

export const legalTemplate = (id: LegalPageId) => TEMPLATES[id];
