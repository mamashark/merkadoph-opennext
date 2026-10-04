import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { deleteProduct } from "../../../actions";
import { ProductForm } from "../../product-form";
import { requireAdmin } from "@/lib/auth";
import { adminAllCategories, adminGetProduct, adminGetShopSettings } from "@/lib/shop-admin";
import { contentState } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { DangerZone, saveNotices, UUID } from "@/components/admin/form-parts";
import { FlashMessage } from "@/components/ui/alert";
import { buttonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/shop/products/[id]/edit">) {
	await requireAdmin();
	const { id } = await params;
	const { notice } = await searchParams;
	if (!UUID.test(id)) notFound();

	const [product, categories, settings] = await Promise.all([adminGetProduct(id), adminAllCategories(), adminGetShopSettings()]);
	if (!product) notFound();

	return (
		<>
			<PageHeader
				title={product.title}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Shop", href: "/admin/shop" },
					{ label: "Products", href: "/admin/shop/products" },
					{ label: "Edit" },
				]}
				actions={
					contentState(product) === "published" && (
						<a href={`/product/${product.slug}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
							<ExternalLink className="h-4 w-4" aria-hidden /> View live
						</a>
					)
				}
			/>
			<div className="mb-6">
				<FlashMessage notice={typeof notice === "string" ? saveNotices[notice] : undefined} />
			</div>
			<ProductForm key={product.updated_at} product={product} categories={categories} currency={settings.currency} />
			<DangerZone
				title="Delete this product"
				description="Removes the product page. Past orders keep their own copy of the item details."
				confirm={`Delete “${product.title}”? This cannot be undone.`}
				action={deleteProduct}
				id={product.id}
			/>
		</>
	);
}
