"use client";

import { ShoppingCart } from "lucide-react";
import { useShoppingCart } from "@/contexts/shopping-cart-context";

/**
 * PLATFORM SHOPPING CART BUTTON
 *
 * Taskbar button for l4yercak3 PLATFORM services cart.
 * Shows organizations their cart for platform services (AI subscriptions, token packs, etc.).
 *
 * IMPORTANT: This is NOT for org customer carts.
 * Organizations selling to their customers use separate checkout systems.
 */
interface ShoppingCartButtonProps {
  onOpenCart: () => void;
}

export function ShoppingCartButton({ onOpenCart }: ShoppingCartButtonProps) {
  const { itemCount } = useShoppingCart();

  if (itemCount === 0) {
    return null; // Hide when cart is empty
  }

  return (
    <button
      onClick={onOpenCart}
      className="retro-button-small px-3 py-1 flex items-center gap-2 relative hover:bg-gray-200 transition-colors"
      title={`Shopping Cart (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`}
    >
      <ShoppingCart className="w-3 h-3" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </button>
  );
}
