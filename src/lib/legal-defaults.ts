import type { LegalPageId, SeoSettings } from "@/lib/site-settings";

/**
 * The legal texts shown on /privacy, /terms and /cookies until an admin saves their own version in
 * Admin → SEO → Legal pages. Rewritten 2026-11-20 for the site as it is now: a content site with a contact form,
 * no shop (local/guidelines.md section 5). They describe what the code actually does (contact form → Supabase,
 * reCAPTCHA loaded only when a form is used, logs kept 180 days, messages 24 months, no analytics or marketing cookies).
 * Not legal advice: Kay reviews them before launch. If the site changes (analytics, newsletter, a shop), update these.
 * Placeholders still supported: {{business}}, {{legal_name}}, {{email}}, {{phone}}, {{address}}.
 */
const TEMPLATES: Record<LegalPageId, string> = {
	privacy: `*Last updated: 20 November 2026*

This policy explains how Merkado PH handles personal data when you visit merkadoph.se, send us a message, ask for a quote or booking, or appear in photos from our events. We follow the EU General Data Protection Regulation (GDPR).

## Who is responsible

**Merkado PH** (org. no. 559467-0811), Sweden, is the data controller for this website.
Contact: [hello@merkadoph.se](mailto:hello@merkadoph.se)

## What we collect and why

| When | What | Why (legal basis) | How long |
|---|---|---|---|
| You use the contact form (questions, quotes for Merkado Byggnadsavdelning or Merkado PH Digital, Tahooo Corner bookings) | Name, email, phone (optional), topic and your message | To answer you and, if you ask, prepare a quote or booking (legitimate interest; steps before an agreement) | Deleted automatically after 24 months |
| You email us, or we reply by email | Your email address and what you write | To answer and follow up | As long as we need it for your matter |
| A quote or booking becomes an agreement | Contact details and what was agreed | To carry out the agreement (contract) and keep the accounts (legal obligation) | Accounting records for 7 years (Swedish Bookkeeping Act) |
| The contact form detects spam or too many attempts | Your email address, IP address, browser type and the time | To protect the form against spam and abuse (legitimate interest) | Deleted automatically after 180 days |
| You visit the website | IP address and technical data about your browser, handled by our hosting provider | To deliver the website and keep it secure (legitimate interest) | We don't store it ourselves |
| You open a preview link we sent you | A preview cookie (see the [cookie policy](/cookies)) | To show you the site before it is public (legitimate interest) | 30 days |

We don't sell your data, we don't use it for advertising, and we don't build profiles of visitors.

## Photos from our events

Our Blogs, Events and Community Impact pages show photos from markets, celebrations and community events, and people can be recognised in them. We share them to tell the story of our community (legitimate interest). If you are in a photo and want it removed or cropped, email [hello@merkadoph.se](mailto:hello@merkadoph.se) and we will take care of it.

## Who handles data for us

We use these service providers. They only process data on our behalf and under data processing agreements:

- **Cloudflare**: hosts and protects the website.
- **Supabase**: our database and file storage. Messages from the contact form are stored here.
- **Microsoft 365**: our email (hello@merkadoph.se).
- **Google reCAPTCHA**: checks that contact form messages come from a person, not a bot. It loads only when you start using a form, and Google receives technical data about your visit. Read [Google's privacy policy](https://policies.google.com/privacy).

Some of these providers can process data outside the EU/EEA. When they do, the transfer is protected by the EU Standard Contractual Clauses or the EU–US Data Privacy Framework.

## Links to other sites

We link to other websites, for example PH Asian Market (phasianmarket.se), event organisers and partners. They have their own privacy policies; this one only covers merkadoph.se.

## Your rights

You can ask us for a copy of your data, and ask us to correct it, delete it, limit how we use it, or give it to you in a portable format. You can also object to how we use it. Email [hello@merkadoph.se](mailto:hello@merkadoph.se) and we will answer within one month.

If you think we handle your data incorrectly, you can complain to the Swedish Authority for Privacy Protection (IMY): [imy.se](https://www.imy.se).

## Changes

If we change how we handle personal data, we update this page and the date at the top.`,

	terms: `*Last updated: 20 November 2026*

These terms apply when you use merkadoph.se. By using the website you accept them.

## About us

The website is run by **Merkado PH** (org. no. 559467-0811), Sweden. Contact: [hello@merkadoph.se](mailto:hello@merkadoph.se)

## What this website is

Merkado PH shares Filipino culture and community in Sweden: stories, events, community projects and notices. Through the website you can also contact our businesses: **Merkado Byggnadsavdelning** (construction and roofing), **Merkado PH Digital** (branding, marketing, websites and consulting) and **Tahooo Corner** (taho for your event).

The website is not a shop, and you can't buy or pay for anything on it. Filipino and Asian groceries are sold by **PH Asian Market** ([phasianmarket.se](https://phasianmarket.se)), a separate webshop with its own terms.

## Quotes and bookings

- Asking for a quote or booking through the contact form is free and doesn't commit you to anything.
- An agreement exists only when we have both confirmed it in writing, for example by accepting a written quote or booking confirmation by email.
- That written quote or confirmation states the price, what is included, the dates and the terms for changes and cancellations. Where it differs from these general terms, it applies.
- If you are a consumer, Swedish consumer law applies, including the Consumer Services Act (Konsumenttjänstlagen) for construction and other services. Nothing in these terms limits your rights under that law.

## Events and offers

- We publish information about events organised by us and by others in good faith. Dates, times, places and prices can change, so check with the organiser before you go. Events organised by others, and their tickets, are the organiser's responsibility.
- Offers from partners are given by those partners, on their terms, and are valid only for the period stated.

## Content and copyright

Texts, photos, logos and design on this website belong to Merkado PH or to the people who made them. You are welcome to link to our pages and share them on social media. Don't copy or reuse our content for other purposes without our written permission.

If you are in one of our photos and want it removed, see the [privacy policy](/privacy).

## Using the website

Please don't misuse the website or the contact form, for example by sending spam, trying to break its security, or collecting data from it automatically.

## Accuracy and links

We work to keep the information here correct and up to date, but we can't guarantee that it always is. We link to other websites for your convenience and are not responsible for their content.

## Liability

We are not liable for indirect losses caused by using the website, or by not being able to use it. This doesn't limit any liability that can't be limited under Swedish law, or your rights as a consumer.

## Disputes

Contact us first at [hello@merkadoph.se](mailto:hello@merkadoph.se) and we will try to solve it together. As a consumer you can also turn to the Swedish National Board for Consumer Disputes (ARN), [arn.se](https://www.arn.se). Swedish law applies, and disputes are settled by a Swedish court.

## Changes

We may update these terms. The version published on this page applies, with the date at the top.`,

	cookies: `*Last updated: 20 November 2026*

Cookies are small files a website stores in your browser. This page lists the cookies and similar technologies used on merkadoph.se.

**In short:** we only use what the website needs to work and stay secure. We don't use advertising, tracking or statistics cookies, so we don't ask for your consent with a cookie banner.

## Cookies and similar technologies we use

| Name | Set by | What it does | How long |
|---|---|---|---|
| \`_GRECAPTCHA\` and related Google data | Google reCAPTCHA | Checks that a contact form message comes from a person, not a bot. Only when you start using a form | Up to 6 months |
| \`mph_stage\` | merkadoph.se | Lets people we invited view the website before it is public. Only after opening a preview link | 30 days |
| \`__cf_bm\` (if set) | Cloudflare | Our hosting provider may set it to tell people from bots and keep the website secure | 30 minutes |
| \`sb-…-auth-token\` and \`admin-sidebar-collapsed\` | merkadoph.se | Keep our staff signed in to the admin area and remember its layout. Never set for visitors | While signed in / 1 year |

## Statistics and marketing

We don't use Google Analytics, Facebook pixels or any other statistics or advertising tools on this website. If we add one in the future, we will update this page and, where the law requires it, ask for your consent first.

## Links and shared content

Links to YouTube, Facebook and other sites take you to those sites, which use their own cookies under their own policies. Opening a link is your choice; nothing from those sites loads on our pages.

## Managing cookies

You can see and delete cookies in your browser's settings, and block them for this website. The website works without cookies, except that the contact form needs reCAPTCHA to send your message. If it is blocked, email us at [hello@merkadoph.se](mailto:hello@merkadoph.se) instead.

## Questions

Email [hello@merkadoph.se](mailto:hello@merkadoph.se). How we handle personal data is explained in our [privacy policy](/privacy).`,
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
