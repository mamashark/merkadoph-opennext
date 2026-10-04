import { notFound } from "next/navigation";
import { getShopSettings } from "@/lib/shop";

/**
 * The shop on/off switch (Admin → Shop). When the shop is off, every page in this group
 * — /shop, /shop/[category], /product/[slug], /cart, /checkout — responds with 404.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
	const settings = await getShopSettings();
	if (!settings.enabled) notFound();
	return children;
}
