import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { adminAllCategories, adminGetShopSettings } from "@/lib/shop-admin";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
	await requireAdmin();
	const [categories, settings] = await Promise.all([adminAllCategories(), adminGetShopSettings()]);
	return (
		<>
			<PageHeader
				title="Add product"
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Shop", href: "/admin/shop" },
					{ label: "Products", href: "/admin/shop/products" },
					{ label: "Add product" },
				]}
			/>
			<ProductForm categories={categories} currency={settings.currency} />
		</>
	);
}
