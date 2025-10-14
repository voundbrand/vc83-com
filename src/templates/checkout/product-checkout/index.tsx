/**
 * PRODUCT CHECKOUT TEMPLATE
 *
 * Specialized checkout template for physical/digital products.
 * Handles variants, shipping, and product-specific features.
 */

import React from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { Theme } from "@/templates/types";
import { CheckoutCore, useCheckout } from "../core/checkout-core";
import { CheckoutItem, CheckoutCallbacks } from "../core/types";
import { PriceDisplay } from "../components/PriceDisplay";
import { QuantitySelector } from "../components/QuantitySelector";
import { CheckoutSummary } from "../components/CheckoutSummary";

export interface ProductCheckoutProps {
  // Product information
  products: CheckoutItem[];

  // Configuration
  organizationId: Id<"organizations">;
  theme: Theme;
  callbacks?: CheckoutCallbacks;

  // Optional features
  showImages?: boolean;
  showRecommended?: boolean;
  allowMultipleProducts?: boolean;
  shippingRequired?: boolean;
}

/**
 * Product checkout content component.
 */
function ProductCheckoutContent({
  showImages = true,
  showRecommended = false,
}: Pick<ProductCheckoutProps, "showImages" | "showRecommended">) {
  const {
    items,
    selectedItem,
    selectedItemIndex,
    quantities,
    priceCalculation,
    theme,
    isProcessing,
    handleItemSelect,
    handleQuantityChange,
    handleCheckout,
  } = useCheckout();

  const containerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: showImages ? "2fr 1fr" : "1fr 400px",
    gap: theme.spacing.xl,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.body,
  };

  const productImageStyle: React.CSSProperties = {
    width: "100%",
    maxHeight: "500px",
    objectFit: "contain",
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
  };

  const productInfoStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.lg,
  };

  const sidebarStyle: React.CSSProperties = {
    position: "sticky",
    top: theme.spacing.xl,
    height: "fit-content",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    color: theme.colors.background,
    border: "none",
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    cursor: isProcessing ? "not-allowed" : "pointer",
    opacity: isProcessing ? 0.6 : 1,
    marginTop: theme.spacing.lg,
  };

  if (!selectedItem) return null;

  return (
    <div style={containerStyle}>
      {/* Main Content - Product Details */}
      <div>
        {showImages && selectedItem.imageUrl && (
          <img
            src={selectedItem.imageUrl}
            alt={selectedItem.name}
            style={productImageStyle}
          />
        )}

        <div style={productInfoStyle}>
          {/* Product Selection (if multiple) */}
          {items.length > 1 && (
            <div>
              <h3 style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                marginBottom: theme.spacing.sm,
              }}>
                Select Product
              </h3>

              <div style={{
                display: "flex",
                gap: theme.spacing.sm,
                flexWrap: "wrap",
              }}>
                {items.map((product, index) => (
                  <button
                    key={product.id}
                    onClick={() => handleItemSelect(index)}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      backgroundColor: index === selectedItemIndex
                        ? theme.colors.primary
                        : theme.colors.surface,
                      color: index === selectedItemIndex
                        ? theme.colors.background
                        : theme.colors.text,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.md,
                      cursor: "pointer",
                      fontSize: theme.typography.fontSize.sm,
                    }}
                  >
                    {product.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product Title & Price */}
          <div>
            <h1 style={{
              fontSize: theme.typography.fontSize.h1,
              fontWeight: theme.typography.fontWeight.bold,
              marginBottom: theme.spacing.sm,
            }}>
              {selectedItem.name}
            </h1>

            <PriceDisplay
              price={selectedItem.price}
              originalPrice={selectedItem.originalPrice}
              currency={selectedItem.currency}
              theme={theme}
              size="large"
            />
          </div>

          {/* Product Description */}
          {selectedItem.description && (
            <div style={{
              fontSize: theme.typography.fontSize.base,
              lineHeight: theme.typography.lineHeight.relaxed,
              color: theme.colors.textLight,
            }}>
              {selectedItem.description}
            </div>
          )}

          {/* Product Features */}
          {selectedItem.features && selectedItem.features.length > 0 && (
            <div>
              <h3 style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                marginBottom: theme.spacing.sm,
              }}>
                Features
              </h3>

              <ul style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.xs,
              }}>
                {selectedItem.features.map((feature, i) => (
                  <li key={i} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: theme.spacing.sm,
                    fontSize: theme.typography.fontSize.base,
                  }}>
                    <span style={{ color: theme.colors.success }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quantity Selector */}
          <div>
            <QuantitySelector
              quantity={quantities[selectedItemIndex]}
              onChange={(qty) => handleQuantityChange(selectedItemIndex, qty)}
              theme={theme}
              label="Quantity"
            />
          </div>
        </div>
      </div>

      {/* Sidebar - Order Summary */}
      <div style={sidebarStyle}>
        {priceCalculation && (
          <>
            <CheckoutSummary
              calculation={priceCalculation}
              theme={theme}
            />

            <button
              style={buttonStyle}
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Add to Cart"}
            </button>
          </>
        )}

        {/* Trust Signals */}
        <div style={{
          marginTop: theme.spacing.lg,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textLight,
        }}>
          <p style={{ marginBottom: theme.spacing.sm }}>
            ✓ Free shipping on orders over $50
          </p>
          <p style={{ marginBottom: theme.spacing.sm }}>
            ✓ 30-day money-back guarantee
          </p>
          <p style={{ marginBottom: theme.spacing.sm }}>
            ✓ Secure checkout
          </p>
          <p>
            ✓ Ships within 2-3 business days
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Main product checkout template component.
 */
export function ProductCheckoutTemplate(props: ProductCheckoutProps) {
  const {
    products,
    organizationId,
    theme,
    callbacks,
    showImages = true,
    allowMultipleProducts = false,
    ...contentProps
  } = props;

  return (
    <CheckoutCore
      items={products}
      organizationId={organizationId}
      theme={theme}
      callbacks={callbacks}
      config={{
        showImages,
        showDescriptions: true,
        showFeatures: true,
        allowQuantity: true,
        maxQuantity: 99,
        minQuantity: 1,
        layout: "two-column",
      }}
    >
      <ProductCheckoutContent showImages={showImages} {...contentProps} />
    </CheckoutCore>
  );
}
