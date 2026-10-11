import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Route } from "lucide-react";
import { saveSeoSettings } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { getSeoSettings, type SeoField } from "@/lib/site-settings";
import { param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { FormCard } from "@/components/admin/form-parts";
import { MediaField } from "@/components/media/media-field";
import { FlashMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { cardClass, hintClass, inputClass, labelClass } from "@/lib/ui";

export const metadata: Metadata = { title: "SEO settings" };

type FieldDef = { name: SeoField; label: string; hint?: string; type?: string; placeholder?: string; rows?: number; autoComplete?: string };

function Fields({ fields, values }: { fields: FieldDef[]; values: Record<string, string> }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{fields.map((f) => (
				<div key={f.name} className={f.rows ? "sm:col-span-2" : undefined}>
					<label htmlFor={f.name} className={labelClass}>
						{f.label}
					</label>
					{f.rows ? (
						<textarea id={f.name} name={f.name} rows={f.rows} defaultValue={values[f.name]} placeholder={f.placeholder} className={inputClass} aria-describedby={f.hint ? `${f.name}-hint` : undefined} />
					) : (
						<input
							id={f.name}
							name={f.name}
							type={f.type ?? "text"}
							defaultValue={values[f.name]}
							placeholder={f.placeholder}
							autoComplete={f.autoComplete ?? "off"}
							className={inputClass}
							aria-describedby={f.hint ? `${f.name}-hint` : undefined}
						/>
					)}
					{f.hint && (
						<p id={`${f.name}-hint`} className={hintClass}>
							{f.hint}
						</p>
					)}
				</div>
			))}
		</div>
	);
}

export default async function SeoSettingsPage({ searchParams }: PageProps<"/admin/seo">) {
	await requireAdmin();
	const params = await searchParams;
	const s = await getSeoSettings();

	return (
		<>
			<PageHeader
				title="Site & search"
				description="Business details and defaults used for Google, social sharing and the site footer."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "SEO" }]}
			/>
			<div className="max-w-4xl space-y-6">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />

				<div className="grid gap-4 sm:grid-cols-2">
					{[
						{ href: "/admin/seo/redirects", icon: Route, title: "Redirects", text: "Send old links to new pages (301). Slug changes add these automatically." },
						{ href: "/admin/seo/legal", icon: FileText, title: "Legal pages", text: "Privacy policy, terms and cookie policy." },
					].map(({ href, icon: Icon, title, text }) => (
						<Link key={href} href={href} className={`${cardClass} flex items-start gap-3 p-4 transition hover:border-slate-300 dark:hover:border-slate-700`}>
							<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
								<Icon className="h-5 w-5" aria-hidden />
							</span>
							<span className="min-w-0 flex-1">
								<span className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
									{title} <ArrowRight className="h-4 w-4" aria-hidden />
								</span>
								<span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">{text}</span>
							</span>
						</Link>
					))}
				</div>

				<form action={saveSeoSettings} className="space-y-6">
					<FormCard title="Defaults">
						<Fields
							values={s}
							fields={[
								{
									name: "site_description",
									label: "Default meta description",
									rows: 2,
									hint: "Used by pages without their own description (homepage, lists). 120–160 characters.",
								},
							]}
						/>
						<div>
							<p className={labelClass}>Default share image</p>
							<MediaField name="default_og_image" defaultValue={s.default_og_image} label="Share image" />
							<p className={hintClass}>Shown when a page without its own image is shared on Facebook, Messenger, LinkedIn… Best size: 1200 × 630.</p>
						</div>
						<Fields values={s} fields={[{ name: "default_og_alt", label: "Share image description (alt text)" }]} />
					</FormCard>

					<FormCard title="Business information">
						<p className="text-sm text-slate-600 dark:text-slate-400">
							Shown in the footer and in Google&apos;s business data. Keep it exactly the same as your Google Business Profile.
						</p>
						<Fields
							values={s}
							fields={[
								{ name: "business_name", label: "Business name", autoComplete: "organization" },
								{ name: "legal_name", label: "Registered company name", hint: "E.g. Merkado PH AB. Optional." },
								{ name: "phone", label: "Phone", type: "tel", placeholder: "+46 70 123 45 67", autoComplete: "tel" },
								{ name: "email", label: "Email", type: "email", autoComplete: "email" },
								{ name: "street", label: "Street address", autoComplete: "street-address" },
								{ name: "postal_code", label: "Postal code", placeholder: "123 45", autoComplete: "postal-code" },
								{ name: "city", label: "City", autoComplete: "address-level2" },
								{ name: "region", label: "Region (län)", placeholder: "Stockholms län", autoComplete: "address-level1" },
								{ name: "country", label: "Country code", placeholder: "SE" },
								{ name: "price_range", label: "Price range", placeholder: "$$", hint: "Optional, e.g. $$ or 500–50 000 SEK." },
								{ name: "latitude", label: "Latitude", placeholder: "59.3293", hint: "Right-click your location in Google Maps to copy coordinates." },
								{ name: "longitude", label: "Longitude", placeholder: "18.0686" },
								{ name: "area_served", label: "Areas served", rows: 1, placeholder: "Stockholm, Uppsala, Sweden", hint: "Comma-separated." },
								{
									name: "opening_hours",
									label: "Opening hours",
									rows: 3,
									placeholder: "Mo-Fr 08:00-17:00\nSa 10:00-14:00",
									hint: "One line per range: day codes Mo Tu We Th Fr Sa Su, then hours. Leave out closed days.",
								},
							]}
						/>
					</FormCard>

					<FormCard title="Social profiles">
						<Fields
							values={s}
							fields={[
								{ name: "facebook", label: "Facebook", type: "url", placeholder: "https://www.facebook.com/…" },
								{ name: "instagram", label: "Instagram", type: "url", placeholder: "https://www.instagram.com/…" },
								{ name: "tiktok", label: "TikTok", type: "url", placeholder: "https://www.tiktok.com/@…" },
								{ name: "youtube", label: "YouTube", type: "url", placeholder: "https://www.youtube.com/@…" },
								{ name: "linkedin", label: "LinkedIn", type: "url", placeholder: "https://www.linkedin.com/company/…" },
							]}
						/>
					</FormCard>

					<FormCard title="Search engines & analytics">
						<Fields
							values={s}
							fields={[
								{
									name: "google_verification",
									label: "Google Search Console code",
									hint: "Search Console → Add property → HTML tag: paste only the content=\"…\" value. (A DNS record in Cloudflare works too and needs nothing here.)",
								},
								{ name: "bing_verification", label: "Bing Webmaster code", hint: "Bing Webmaster Tools → HTML meta tag: the content value only." },
								{
									name: "cf_analytics_token",
									label: "Cloudflare Web Analytics token",
									hint: "Cloudflare → Analytics & Logs → Web Analytics → Add site → copy the token from the snippet. Cookie-free, no consent banner needed.",
								},
							]}
						/>
					</FormCard>

					<div className="flex justify-end">
						<SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
					</div>
				</form>
			</div>
		</>
	);
}
