"use client";

import { useState } from "react";
import { useShoppingCart, CartItem } from "@/contexts/shopping-cart-context";
import { Trash2, Plus, Minus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { Id } from "../../../convex/_generated/dataModel";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createAICheckout = useAction(api.stripe.aiCheckout.createAICheckoutSession) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createPlatformCheckout = useAction(api.stripe.platformCheckout.createPlatformCheckoutSession) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createTokenPackCheckout = useAction((api.stripe.platformCheckout as any).createTokenPackCheckoutSession) as any;

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
      const platformPlans = items.filter(item => item.type === "platform-plan");
      const tokenPacks = items.filter(item => item.type === "token-pack");

      const baseUrls = {
        successUrl: `${window.location.origin}?checkout=success`,
        cancelUrl: `${window.location.origin}?checkout=cancel`,
      };

      const commonParams = {
        organizationId: user.defaultOrgId as Id<"organizations">,
        organizationName: user.currentOrganization?.name || user.email,
        email: user.email,
        isB2B: true,
      };

      // Process platform tier subscriptions first (Starter, Professional, Agency, Enterprise)
      if (platformPlans.length > 0) {
        const plan = platformPlans[0];
        const tier = plan.metadata?.tier as "starter" | "professional" | "agency" | "enterprise";
        const billingPeriod = (plan.metadata?.billingPeriod || "annual") as "monthly" | "annual";

        if (!tier) {
          alert("Invalid plan selected. Please try again.");
          return;
        }

        const result = await createPlatformCheckout({
          ...commonParams,
          tier,
          billingPeriod,
          ...baseUrls,
        });

        window.location.href = result.checkoutUrl;
        return;
      }

      // Process AI subscription checkout
      if (aiSubscriptions.length > 0) {
        const subscription = aiSubscriptions[0];
        const tier = subscription.metadata?.tier as "standard" | "privacy-enhanced";

        const result = await createAICheckout({
          ...commonParams,
          tier,
          ...baseUrls,
        });

        window.location.href = result.checkoutUrl;
        return;
      }

      // Process token pack purchases
      if (tokenPacks.length > 0) {
        const pack = tokenPacks[0];
        const tier = pack.metadata?.tier as "starter" | "standard" | "professional" | "enterprise";
        // Extract token count from description (e.g., "1,000,000 AI tokens" -> 1000000)
        const tokensMatch = pack.description?.match(/[\d,]+/);
        const tokens = tokensMatch ? parseInt(tokensMatch[0].replace(/,/g, ""), 10) : 0;

        if (!tier) {
          alert("Invalid token pack selected. Please try again.");
          return;
        }

        const result = await createTokenPackCheckout({
          ...commonParams,
          tier,
          packName: pack.name,
          tokens,
          ...baseUrls,
        });

        window.location.href = result.checkoutUrl;
        return;
      }

      // No processable items found
      alert("No items in cart to checkout. Please add items first.");
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
