import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FolderTree, Package, Power, PowerOff, Rss, ShoppingCart, Tags } from "lucide-react";
import { regenerateFeed, saveShopSettings } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { adminGetShopSettings, adminShopCounts } from "@/lib/shop-admin";
import { latestOp, listOps } from "@/lib/ops";
import { CURRENCIES } from "@/lib/pricing";
import { PRODUCT_FEED_PATH } from "@/lib/product-feed";
import { SITE_URL } from "@/lib/env";
import { pageParam, param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/admin/page-header";
import { ShopStatusAlert } from "@/components/admin/shop-status-alert";
import { getShopReadiness } from "@/lib/shop-status";
import { Field, FormCard } from "@/components/admin/form-parts";
import { OpsLogTable } from "@/components/admin/ops-log-table";
import { Alert, FlashMessage } from "@/components/ui/alert";
import { CopyButton } from "@/components/ui/copy-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass, cardClass, cn, inputClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Shop" };

const PER_PAGE = 10;

export default async function ShopAdminPage({ searchParams }: PageProps<"/admin/shop">) {
	await requireAdmin();
	const params = await searchParams;
	const values = { q: param(params, "q").trim(), source: param(params, "source"), status: param(params, "status") };
	const page = pageParam(params);

	let setupError = "";
	const [settings, counts, feedLogs, lastFeed, readiness] = await Promise.all([
		adminGetShopSettings(),
		adminShopCounts().catch((e: Error) => ((setupError = e.message), { products: 0, pendingOrders: 0 })),
		listOps({ kind: "product_feed", ...values, page, perPage: PER_PAGE }).catch(() => ({ rows: [], total: 0 })),
		latestOp("product_feed", { status: "success" }).catch(() => null),
		getShopReadiness(),
	]);
	// The switch can be turned on only with a working payment method (also enforced on save).
	const canEnable = readiness.usable.length > 0;
	const feedUrl = `${SITE_URL}${PRODUCT_FEED_PATH}`;

	const links = [
		{ href: "/admin/shop/products", label: "Products", hint: `${counts.products} total`, icon: Package },
		{ href: "/admin/shop/categories", label: "Categories", hint: "Group products", icon: FolderTree },
		{ href: "/admin/shop/tags", label: "Tags", hint: "Label products", icon: Tags },
		{ href: "/admin/shop/orders?status=pending", label: "Orders", hint: `${counts.pendingOrders} pending`, icon: ShoppingCart },
	];

	return (
		<>
			<PageHeader
				title="Shop"
				description="Turn the shop on or off, set shop options and manage the product feed."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Shop" }]}
				actions={
					settings.enabled && (
						<a href="/shop" target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
							<ExternalLink className="h-4 w-4" aria-hidden /> View shop
						</a>
					)
				}
			/>

			<div className="space-y-6">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />
				<ShopStatusAlert status={readiness} />
				{setupError && (
					<Alert tone="error">
						The shop tables aren&apos;t reachable yet ({setupError}). Run <code>supabase/migrations/20261006000000_shop.sql</code> in the Supabase SQL editor.
					</Alert>
				)}

				<ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
					{links.map(({ href, label, hint, icon: Icon }) => (
						<li key={label}>
							<Link href={href} className={`${cardClass} flex items-center gap-3 p-4 transition hover:border-slate-300 dark:hover:border-slate-700`}>
								<span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
									<Icon className="h-5 w-5" aria-hidden />
								</span>
								<span>
									<span className="block font-semibold text-slate-900 dark:text-white">{label}</span>
									<span className="block text-xs text-slate-600 dark:text-slate-400">{hint}</span>
								</span>
							</Link>
						</li>
					))}
				</ul>

				<form action={saveShopSettings} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
					<div className="space-y-6">
						<section className={cn(cardClass, "flex items-start gap-4 p-5", settings.enabled ? "border-teal-200 dark:border-teal-900/60" : "border-amber-200 dark:border-amber-900/60")}>
							<span
								className={cn(
									"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
									settings.enabled ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
								)}
							>
								{settings.enabled ? <Power className="h-5 w-5" aria-hidden /> : <PowerOff className="h-5 w-5" aria-hidden />}
							</span>
							<div className="flex-1">
								<label className="flex items-center justify-between gap-4">
									<span>
										<span className="block font-semibold text-slate-900 dark:text-white">Shop is {settings.enabled ? "ON" : "OFF"}</span>
										<span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">
											When off, /shop, category and product pages, the cart, checkout, the Shop link and the product feed are all hidden. Products stay saved.
											{!canEnable && !settings.enabled && (
												<span className="mt-1 block font-medium text-amber-800 dark:text-amber-300">
													Locked until a payment method is set up —{" "}
													<Link href="/admin/shop/payments" className="underline underline-offset-2">
														go to Payments
													</Link>
													.
												</span>
											)}
										</span>
									</span>
									<input
										type="checkbox"
										name="enabled"
										defaultChecked={settings.enabled}
										disabled={!canEnable && !settings.enabled}
										aria-label="Shop on or off"
										className="peer sr-only"
									/>
									<span
										aria-hidden
										className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-teal-600 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600 peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 dark:bg-slate-700"
									/>
								</label>
							</div>
						</section>

						<FormCard title="Storefront">
							<div className="grid gap-4 sm:grid-cols-2">
								<Field id="title" label="Shop heading">
									<input id="title" name="title" maxLength={80} defaultValue={settings.title} className={inputClass} />
								</Field>
								<Field id="currency" label="Currency">
									<select id="currency" name="currency" defaultValue={settings.currency} className={inputClass}>
										{CURRENCIES.map((c) => (
											<option key={c} value={c}>
												{c}
											</option>
										))}
									</select>
								</Field>
							</div>
							<Field id="description" label="Shop description" hint="Intro on /shop and its meta description (up to 300 characters).">
								<textarea id="description" name="description" rows={2} maxLength={300} defaultValue={settings.description} className={inputClass} />
							</Field>
							<Field id="checkout_note" label="Checkout note" hint="Shown at checkout, e.g. how payment and delivery work.">
								<textarea
									id="checkout_note"
									name="checkout_note"
									rows={3}
									maxLength={1000}
									defaultValue={settings.checkout_note}
									placeholder="After you place your order we'll email you to confirm payment (Swish or bank transfer) and delivery."
									className={inputClass}
								/>
							</Field>
						</FormCard>
					</div>

					<div className="space-y-6">
						<FormCard title="Product feed defaults">
							<Field id="brand" label="Default brand" hint="Used when a product has no brand.">
								<input id="brand" name="brand" maxLength={80} defaultValue={settings.brand} className={inputClass} />
							</Field>
							<Field id="google_product_category" label="Google product category" hint="Optional, e.g. “Home & Garden > Kitchen & Dining”.">
								<input id="google_product_category" name="google_product_category" maxLength={200} defaultValue={settings.google_product_category} className={inputClass} />
							</Field>
						</FormCard>
						<SubmitButton pendingLabel="Saving…" className="w-full">
							Save shop settings
						</SubmitButton>
					</div>
				</form>

				<section className={`${cardClass} p-5`} aria-labelledby="feed-title">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex min-w-0 items-start gap-3">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
								<Rss className="h-5 w-5" aria-hidden />
							</span>
							<div className="min-w-0">
								<h2 id="feed-title" className="font-semibold text-slate-900 dark:text-white">
									Product feed
								</h2>
								<p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
									Google Merchant Center format (RSS 2.0) — also accepted by Meta/Facebook catalogs. It updates automatically when products change; regenerate to force a fresh copy.
								</p>
								<p className="mt-2 flex items-center gap-2">
									<code className="truncate rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200">{feedUrl}</code>
									<CopyButton value={feedUrl} label="Copy feed URL" />
								</p>
								<p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
									Last regenerated: {lastFeed ? formatDate(lastFeed.created_at, { dateStyle: "medium", timeStyle: "short" }) : "never"}
									{lastFeed?.message ? ` · ${lastFeed.message}` : ""}
									{!settings.enabled && " · The feed returns 404 while the shop is off."}
								</p>
							</div>
						</div>
						<div className="flex shrink-0 gap-2">
							{settings.enabled && (
								<a href={PRODUCT_FEED_PATH} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
									<ExternalLink className="h-4 w-4" aria-hidden /> Open
								</a>
							)}
							<form action={regenerateFeed}>
								<SubmitButton variant="accent" pendingLabel="Regenerating…">
									<Rss className="h-4 w-4" aria-hidden /> Regenerate feed
								</SubmitButton>
							</form>
						</div>
					</div>
				</section>

				<OpsLogTable title="Feed regeneration log" basePath="/admin/shop" rows={feedLogs.rows} total={feedLogs.total} page={page} perPage={PER_PAGE} values={values} scopeLabel="Feed" />
			</div>
		</>
	);
}
