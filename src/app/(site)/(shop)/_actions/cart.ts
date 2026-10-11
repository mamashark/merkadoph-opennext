"use server";

import * as cart from "@/server/shop/cart";
import * as wishlist from "@/server/shop/wishlist";

/**
 * Website transport for the cart and wishlist services (shop-reference.md §13.1). Called from
 * client islands with plain arguments; the services validate every value and resolve the owner
 * from the session / guest cookie — never from these arguments.
 */
export async function getCartSummaryAction() {
	return cart.getCartSummary();
}
export async function getCartAction() {
	return cart.getCart();
}
export async function addToCartAction(productId: string, quantity = 1) {
	return cart.addItem({ productId, quantity });
}
export async function setCartQuantityAction(productId: string, quantity: number) {
	return cart.setQuantity({ productId, quantity });
}
export async function removeFromCartAction(productId: string) {
	return cart.removeItem({ productId });
}
export async function clearCartAction() {
	return cart.clearCart();
}

export async function getWishlistIdsAction() {
	return wishlist.getWishlistIds();
}
export async function toggleWishlistAction(productId: string) {
	return wishlist.toggleWishlist({ productId });
}
export async function moveWishlistToCartAction(productId: string) {
	return wishlist.moveToCart({ productId });
}
