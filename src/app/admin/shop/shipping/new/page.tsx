import type { Metadata } from "next";
import { ShippingMethodForm } from "../method-form";
import { requireAdmin } from "@/lib/auth";
import { adminGetShopSettings } from "@/lib/shop-admin";
import { param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { FlashMessage } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Add shipping method" };

export default async function NewShippingMethodPage({ searchParams }: PageProps<"/admin/shop/shipping/new">) {
	await requireAdmin();
	const [settings, params] = await Promise.all([adminGetShopSettings(), searchParams]);
	return (
		<>
			<PageHeader
				title="Add shipping method"
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Shop", href: "/admin/shop" },
					{ label: "Shipping", href: "/admin/shop/shipping" },
					{ label: "Add" },
				]}
			/>
			<div className="mb-4 max-w-3xl">
				<FlashMessage error={param(params, "error")} />
			</div>
			<ShippingMethodForm currency={settings.currency} />
		</>
	);
}
