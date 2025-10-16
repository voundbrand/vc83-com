"use client";

/**
 * STEP 1: PRODUCT SELECTION
 *
 * Multi-product selection with individual quantity controls per ticket.
 * Shows line item display with order summary and tax calculation.
 */

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { CheckoutProduct } from "@/templates/checkout/types";
import { Id } from "../../../../convex/_generated/dataModel";
import { calculateCheckoutTax } from "@/lib/tax-calculator";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import styles from "../styles/multi-step.module.css";

interface ProductSelectionStepProps {
  organizationId: Id<"organizations">;
  linkedProducts: CheckoutProduct[];
  initialSelection?: Array<{
    productId: Id<"objects">;
    quantity: number;
    price: number;
  }>;
  onComplete: (data: {
    selectedProducts: Array<{
      productId: Id<"objects">;
      quantity: number;
      price: number;
    }>;
    totalPrice: number;
    taxCalculation?: {
      subtotal: number;
      taxAmount: number;
      total: number;
      taxRate: number;
      isTaxable: boolean;
      taxBehavior: "exclusive" | "inclusive" | "automatic";
    };
  }) => void;
}

export function ProductSelectionStep({
  organizationId,
  linkedProducts,
  initialSelection,
  onComplete,
}: ProductSelectionStepProps) {
  // Fetch organization tax settings
  const taxSettings = useQuery(api.organizationTaxSettings.getPublicTaxSettings, {
    organizationId,
  });

  // Track quantities for each product (productId -> quantity)
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    initialSelection?.forEach((item) => {
      initial[item.productId] = item.quantity;
    });
    return initial;
  });

  /**
   * Format price for display
   * Uses the currency from the first product (assumes all products use same currency)
   */
  const formatPrice = (amount: number) => {
    const currency = linkedProducts[0]?.currency || "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  /**
   * Update quantity for a specific product
   */
  const updateQuantity = (productId: string, newQuantity: number) => {
    setQuantities((prev) => {
      if (newQuantity <= 0) {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      }
      return { ...prev, [productId]: newQuantity };
    });
  };

  /**
   * Calculate line items and totals
   */
  const lineItems = linkedProducts
    .filter((product) => quantities[product._id] > 0)
    .map((product) => {
      const quantity = quantities[product._id];
      const originalPrice = product.customProperties?.originalPrice as number | undefined;
      const savings = originalPrice ? (originalPrice - product.price) * quantity : 0;

      return {
        product,
        quantity,
        subtotal: product.price * quantity,
        originalPrice: originalPrice ? originalPrice * quantity : undefined,
        savings,
      };
    });

  const totalQuantity = lineItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalSavings = lineItems.reduce((sum, item) => sum + item.savings, 0);

  // Calculate tax using organization settings
  const getTaxRate = () => {
    if (!taxSettings?.taxEnabled) return 0;

    // Try to find active rate for origin address
    const activeRate = taxSettings.customRates?.find(
      (rate) => rate.active &&
        rate.jurisdiction === `${taxSettings.originAddress.country}-${taxSettings.originAddress.state || ""}`
    );

    if (activeRate) {
      return activeRate.rate * 100; // Convert decimal to percentage
    }

    // Fallback to default rates by country/state
    if (taxSettings.originAddress.country === "US") {
      const stateRates: Record<string, number> = {
        "CA": 8.5,
        "NY": 8.875,
        "TX": 8.25,
        "FL": 6.0,
      };
      return stateRates[taxSettings.originAddress.state || ""] || 0;
    }

    return 0;
  };

  const taxRate = getTaxRate();
  const defaultTaxBehavior = taxSettings?.defaultTaxBehavior || "exclusive";

  const taxCalculation = calculateCheckoutTax(
    lineItems.map((item) => ({ product: item.product, quantity: item.quantity })),
    taxRate,
    defaultTaxBehavior
  );

  const { subtotal, taxAmount, total } = taxCalculation;

  const hasSelection = lineItems.length > 0;

  /**
   * Handle continue
   */
  const handleContinue = () => {
    if (!hasSelection) return;

    onComplete({
      selectedProducts: lineItems.map((item) => ({
        productId: item.product._id as Id<"objects">,
        quantity: item.quantity,
        price: item.product.price,
      })),
      totalPrice: total,
      // Include tax calculation for payment processing
      taxCalculation: {
        subtotal,
        taxAmount,
        total,
        taxRate,
        isTaxable: taxCalculation.isTaxable,
        taxBehavior: taxCalculation.taxBehavior,
      },
    });
  };

  /**
   * Get features list from product
   */
  const getFeatures = (): string[] => {
    // You can customize this based on your product data structure
    return [
      "Access to all sessions",
      "Networking events",
      "Meals included",
      "Swag bag",
      "Recording access",
    ];
  };

  return (
    <div className={styles.stepContainer}>
      {/* Header */}
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Get Your Ticket</h2>
        <p className={styles.stepSubtitle}>
          {totalSavings > 0 ? "Early bird pricing ends soon!" : "Select your ticket type"}
        </p>
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: "0.875rem",
          fontWeight: "600",
          color: "var(--color-text, #fff)",
          marginBottom: "var(--spacing-md, 1rem)",
        }}
      >
        Select Ticket Type
      </h3>

      {/* Product Cards with Individual Quantity Controls */}
      <div className={styles.productGrid}>
        {linkedProducts.map((product) => {
          const quantity = quantities[product._id] || 0;
          const originalPrice = product.customProperties?.originalPrice as number | undefined;
          const hasQuantity = quantity > 0;

          return (
            <div
              key={product._id}
              className={`${styles.productCard} ${
                hasQuantity ? styles.productCardSelected : ""
              }`}
            >
              {/* Product Content */}
              <div className={styles.productCardContent}>
                {/* Header with name and pricing */}
                <div className={styles.productCardHeader}>
                  <div className={styles.productInfo}>
                    <h3 className={styles.productName}>{product.name}</h3>
                    <p className={styles.productDescription}>{product.description}</p>
                  </div>
                  <div className={styles.productPricing}>
                    <span className={styles.productPrice}>
                      {formatPrice(product.price)}
                    </span>
                    {originalPrice && (
                      <span className={styles.productOriginalPrice}>
                        {formatPrice(originalPrice)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls - Always Visible */}
                <div className={styles.quantitySection} style={{ marginTop: "var(--spacing-md, 1rem)" }}>
                  <span className={styles.quantityLabel}>Quantity</span>
                  <div className={styles.quantityControls}>
                    <button
                      type="button"
                      className={styles.quantityButton}
                      onClick={() => updateQuantity(product._id, quantity - 1)}
                      disabled={quantity <= 0}
                    >
                      -
                    </button>
                    <span className={styles.quantityValue}>{quantity}</span>
                    <button
                      type="button"
                      className={styles.quantityButton}
                      onClick={() => updateQuantity(product._id, quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Line Items - Only show when products selected */}
      {hasSelection && (
        <>
          <h3
            style={{
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "var(--color-text, #fff)",
              marginTop: "var(--spacing-xl, 2rem)",
              marginBottom: "var(--spacing-md, 1rem)",
            }}
          >
            Order Summary
          </h3>

          {/* Line Items Display */}
          <div className={styles.lineItemsContainer}>
            {lineItems.map((item) => (
              <div key={item.product._id} className={styles.lineItem}>
                <div className={styles.lineItemInfo}>
                  <span className={styles.lineItemName}>{item.product.name}</span>
                  <span className={styles.lineItemQuantity}>× {item.quantity}</span>
                </div>
                <div className={styles.lineItemPricing}>
                  {item.originalPrice && (
                    <span className={styles.lineItemOriginalPrice}>
                      {formatPrice(item.originalPrice)}
                    </span>
                  )}
                  <span className={styles.lineItemPrice}>{formatPrice(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Features List */}
          <h3
            style={{
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "var(--color-text, #fff)",
              marginTop: "var(--spacing-xl, 2rem)",
              marginBottom: "var(--spacing-md, 1rem)",
            }}
          >
            What&apos;s Included
          </h3>
          <ul className={styles.featuresList}>
            {getFeatures().map((feature, idx) => (
              <li key={idx} className={styles.featureItem}>
                <Check size={16} />
                {feature}
              </li>
            ))}
          </ul>

          {/* Pricing Summary with Tax Breakdown */}
          <div className={styles.pricingSummary}>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Subtotal ({totalQuantity} {totalQuantity === 1 ? "ticket" : "tickets"})</span>
              <span className={styles.priceValue}>{formatPrice(subtotal)}</span>
            </div>
            {totalSavings > 0 && (
              <div className={styles.priceRow}>
                <span className={styles.priceLabel}>Early Bird Savings</span>
                <span className={styles.savingsValue}>-{formatPrice(totalSavings)}</span>
              </div>
            )}
            {/* Tax Line */}
            {taxCalculation.isTaxable && taxAmount > 0 && (
              <div className={styles.priceRow}>
                <span className={styles.priceLabel}>
                  Tax ({taxRate}%)
                  <span style={{ fontSize: "0.7rem", marginLeft: "0.25rem", opacity: 0.7 }}>
                    {taxCalculation.taxBehavior === "inclusive" ? "💶 included" : "💵 added"}
                  </span>
                </span>
                <span className={styles.priceValue}>{formatPrice(taxAmount)}</span>
              </div>
            )}
            <div className={`${styles.priceRow} ${styles.totalRow}`}>
              <span className={styles.totalLabel}>Total</span>
              <span className={styles.totalValue}>{formatPrice(total)}</span>
            </div>
          </div>
        </>
      )}

      {/* Continue Button */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={!hasSelection}
        className={styles.primaryButton}
        style={{ marginTop: "var(--spacing-xl, 2rem)" }}
      >
        <ShoppingCart size={20} />
        Proceed to Checkout
      </button>

      {/* Footer Text */}
      <p
        style={{
          textAlign: "center",
          fontSize: "0.75rem",
          color: "#666",
          marginTop: "var(--spacing-md, 1rem)",
        }}
      >
        Secure checkout powered by Stripe
      </p>
    </div>
  );
}
