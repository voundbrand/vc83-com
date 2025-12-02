"use client";

import { useState } from "react";
import { useShoppingCart, CartItem } from "@/contexts/shopping-cart-context";
import { Trash2, Plus, Minus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

/**
 * PLATFORM CHECKOUT WINDOW
 *
 * Checkout for l4yercak3 PLATFORM services sold to organizations.
 *
 * IMPORTANT: This is NOT for org-to-customer sales (events, products, tickets).
 * Organizations have separate checkout flows for selling to their customers.
 *
 * Platform services:
 * - AI subscriptions
 * - Token packs
 * - Platform add-ons
 */
export function PlatformCartWindow() {
  const {
    items,
    total,
    removeItem,
    updateQuantity,
    clearCart,
  } = useShoppingCart();
  const { user } = useAuth();
  const { t } = useNamespaceTranslations("ui.cart");
  const [isProcessing, setIsProcessing] = useState(false);

  const createCheckout = useAction(api.stripe.aiCheckout.createAICheckoutSession);

  // Format price
  const formatPrice = (cents: number, currency: string) => {
    const symbol = currency === "eur" ? "€" : "$";
    return `${symbol}${(cents / 100).toFixed(2)}`;
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (!user?.defaultOrgId) {
      alert(t("ui.cart.error.no_organization"));
      return;
    }

    setIsProcessing(true);
    try {
      // Group items by type and process accordingly
      const aiSubscriptions = items.filter(item => item.type === "ai-subscription");

      if (aiSubscriptions.length > 0) {
        // Process AI subscription checkout
        const subscription = aiSubscriptions[0]; // Take first subscription
        const tier = subscription.metadata?.tier as "standard" | "privacy-enhanced";

        const result = await createCheckout({
          organizationId: user.defaultOrgId,
          organizationName: user.currentOrganization?.name || user.email,
          email: user.email,
          tier,
          successUrl: `${window.location.origin}?checkout=success`,
          cancelUrl: `${window.location.origin}?checkout=cancel`,
          isB2B: true, // Always enable B2B - Stripe will show business/personal toggle in their UI
        });

        // Redirect to Stripe Checkout
        window.location.href = result.checkoutUrl;
      }

      // TODO: Handle other platform services (token packs, add-ons, etc.)
      // NOTE: This does NOT handle org-to-customer sales (events, products, tickets)
    } catch (error) {
      console.error("Checkout error:", error);
      alert(t("ui.cart.error.checkout_failed"));
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="p-8 text-center" style={{ background: 'var(--win95-bg)' }}>
        <div className="text-6xl mb-4">🛒</div>
        <h3 className="font-pixel text-lg mb-2" style={{ color: 'var(--win95-text)' }}>
          {t("ui.cart.empty.title")}
        </h3>
        <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
          {t("ui.cart.empty.subtitle")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.map((item) => (
          <CartItemCard
            key={item.id}
            item={item}
            onRemove={removeItem}
            onUpdateQuantity={updateQuantity}
            formatPrice={formatPrice}
          />
        ))}
      </div>

      {/* Cart Footer */}
      <div className="border-t-2 p-4 space-y-3" style={{ borderColor: 'var(--win95-border)' }}>
        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-pixel text-sm" style={{ color: 'var(--win95-text)' }}>
            {t("ui.cart.label.total")}
          </span>
          <span className="font-pixel text-lg" style={{ color: 'var(--win95-highlight)' }}>
            {formatPrice(total, items[0]?.currency || "eur")}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={clearCart}
            className="retro-button flex-1 text-sm py-2"
            disabled={isProcessing}
          >
            {t("ui.cart.button.clear_cart")}
          </button>
          <button
            onClick={handleCheckout}
            className="retro-button-primary flex-1 text-sm py-2"
            disabled={isProcessing}
          >
            {isProcessing ? t("ui.cart.button.processing") : t("ui.cart.button.checkout")}
          </button>
        </div>

        {/* Tax Notice */}
        <p className="text-xs text-center" style={{ color: 'var(--neutral-gray)' }}>
          {t("ui.cart.label.tax_notice")}
        </p>
      </div>
    </div>
  );
}

/**
 * CART ITEM CARD
 *
 * Individual cart item with quantity controls.
 */
interface CartItemCardProps {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  formatPrice: (cents: number, currency: string) => string;
}

function CartItemCard({
  item,
  onRemove,
  onUpdateQuantity,
  formatPrice,
}: CartItemCardProps) {
  const { t } = useNamespaceTranslations("ui.cart");

  return (
    <div className="p-3 space-y-2 border-2" style={{
      background: 'var(--win95-bg-light)',
      borderColor: 'var(--win95-border)'
    }}>
      {/* Item Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <h4 className="font-pixel text-sm" style={{ color: 'var(--win95-highlight)' }}>
            {item.name}
          </h4>
          {item.description && (
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              {item.description}
            </p>
          )}
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="retro-button-small p-1"
          title={t("ui.cart.item.remove")}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Item Footer: Quantity & Price */}
      <div className="flex justify-between items-center">
        {/* Quantity Controls */}
        {item.type !== "ai-subscription" && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
              className="retro-button-small p-1"
              disabled={item.quantity <= 1}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs px-2 font-pixel" style={{ color: 'var(--win95-text)' }}>
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              className="retro-button-small p-1"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Price */}
        <span className="font-pixel text-sm" style={{ color: 'var(--win95-text)' }}>
          {formatPrice(item.price * item.quantity, item.currency)}
        </span>
      </div>
    </div>
  );
}
