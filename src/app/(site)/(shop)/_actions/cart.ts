"use server";

import { assertShopOpen } from "@/lib/shop-gate";

import * as cart from "@/server/shop/cart";
import * as wishlist from "@/server/shop/wishlist";

/**
 * Website transport for the cart and wishlist services (shop-reference.md §13.1). Called from
 * client islands with plain arguments; the services validate every value and resolve the owner
 * from the session / guest cookie — never from these arguments.
 */
export async function getCartSummaryAction() {
	assertShopOpen();
	return cart.getCartSummary();
}
export async function getCartAction() {
	assertShopOpen();
	return cart.getCart();
}
export async function addToCartAction(productId: string, quantity = 1) {
	assertShopOpen();
	return cart.addItem({ productId, quantity });
}
export async function setCartQuantityAction(productId: string, quantity: number) {
	assertShopOpen();
	return cart.setQuantity({ productId, quantity });
}
export async function removeFromCartAction(productId: string) {
	assertShopOpen();
	return cart.removeItem({ productId });
}
export async function clearCartAction() {
	assertShopOpen();
	return cart.clearCart();
}

export async function getWishlistIdsAction() {
	assertShopOpen();
	return wishlist.getWishlistIds();
}
export async function toggleWishlistAction(productId: string) {
	assertShopOpen();
	return wishlist.toggleWishlist({ productId });
}
export async function moveWishlistToCartAction(productId: string) {
	assertShopOpen();
	return wishlist.moveToCart({ productId });
}
