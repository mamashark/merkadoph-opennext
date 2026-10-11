import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShippingMethodForm } from "../method-form";
import { adminGetShippingMethod } from "../data";
import { deleteShippingMethod } from "../actions";
import { requireAdmin } from "@/lib/auth";
import { adminGetShopSettings } from "@/lib/shop-admin";
import { param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { DangerZone } from "@/components/admin/form-parts";
import { FlashMessage } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Edit shipping method" };

export default async function EditShippingMethodPage({ params, searchParams }: PageProps<"/admin/shop/shipping/[id]">) {
	await requireAdmin();
	const [{ id }, query] = await Promise.all([params, searchParams]);
	const [method, settings] = await Promise.all([adminGetShippingMethod(id), adminGetShopSettings()]);
	if (!method) notFound();
	return (
		<>
			<PageHeader
				title={method.title}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Shop", href: "/admin/shop" },
					{ label: "Shipping", href: "/admin/shop/shipping" },
					{ label: "Edit" },
				]}
			/>
			<div className="mb-4 max-w-3xl">
				<FlashMessage error={param(query, "error")} />
			</div>
			<ShippingMethodForm key={method.id} method={method} currency={settings.currency} />
			<div className="max-w-3xl">
				<DangerZone
					title="Delete this method"
					description="Customers won't see it at checkout anymore. Existing orders keep their shipping details."
					confirm={`Delete “${method.title}”?`}
					action={deleteShippingMethod}
					id={method.id}
				/>
			</div>
		</>
	);
}
