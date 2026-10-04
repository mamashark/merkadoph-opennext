import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteCategory } from "../../actions";
import { CategoryForm } from "../category-form";
import { requireAdmin } from "@/lib/auth";
import { adminAllCategories, adminGetCategory } from "@/lib/shop-admin";
import { PageHeader } from "@/components/admin/page-header";
import { DangerZone, UUID } from "@/components/admin/form-parts";
import { FlashMessage } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Edit category" };

export default async function EditCategoryPage({ params, searchParams }: PageProps<"/admin/shop/categories/[id]">) {
	await requireAdmin();
	const { id } = await params;
	const { notice } = await searchParams;
	if (!UUID.test(id)) notFound();
	const [category, all] = await Promise.all([adminGetCategory(id), adminAllCategories()]);
	if (!category) notFound();

	return (
		<>
			<PageHeader
				title={category.name}
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Shop", href: "/admin/shop" },
					{ label: "Categories", href: "/admin/shop/categories" },
					{ label: "Edit" },
				]}
			/>
			<div className="max-w-xl space-y-4">
				<FlashMessage notice={notice === "saved" ? "Category saved." : undefined} />
				<CategoryForm key={category.updated_at} category={category} categories={all} />
				<DangerZone
					title="Delete this category"
					description="Products stay; they're just removed from this category. Sub-categories move to the top level."
					confirm={`Delete the category “${category.name}”?`}
					action={deleteCategory}
					id={category.id}
				/>
			</div>
		</>
	);
}
