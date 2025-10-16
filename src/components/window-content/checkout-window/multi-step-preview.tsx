/**
 * MULTI-STEP CHECKOUT PREVIEW
 *
 * Shows live preview of each step in the multi-step checkout flow.
 * Allows navigation between steps to see what customers will experience.
 */

"use client";

import { useState } from "react";
import { ChevronRight, Eye } from "lucide-react";
import { MultiStepCheckout } from "@/components/checkout/multi-step-checkout";
import type { CheckoutProduct } from "@/templates/checkout/types";
import type { Theme } from "@/templates/types";
import type { Id } from "../../../../convex/_generated/dataModel";

interface MultiStepPreviewProps {
  linkedProducts: CheckoutProduct[];
  organizationId: Id<"organizations">;
  paymentProviders: string[];
  theme?: Theme;
}

export function MultiStepPreview({
  linkedProducts,
  organizationId,
  paymentProviders,
  theme,
}: MultiStepPreviewProps) {
  const [previewMode, setPreviewMode] = useState<"live" | "static">("static");

  // No products linked yet
  if (linkedProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <Eye size={48} className="mb-4 text-gray-300" />
        <p className="text-sm font-bold mb-2">No Products Linked</p>
        <p className="text-xs">
          Link products from the configuration panel to preview the checkout flow.
        </p>
      </div>
    );
  }

  // No payment providers configured
  if (paymentProviders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <Eye size={48} className="mb-4 text-gray-300" />
        <p className="text-sm font-bold mb-2">No Payment Providers</p>
        <p className="text-xs">
          Configure payment providers in your organization settings to preview checkout.
        </p>
      </div>
    );
  }

  // Inject CSS variables from theme for checkout component
  const themeStyles = theme
    ? ({
        // Primary Colors
        "--color-primary": theme.colors.primary,
        "--color-primaryDark": theme.colors.primaryDark,
        "--color-primaryLight": theme.colors.primaryLight,
        "--color-primary-bg": `${theme.colors.primary}10`, // 10% opacity

        // Secondary & Accent
        "--color-secondary": theme.colors.secondary,
        "--color-accent": theme.colors.accent,

        // Background & Surface
        "--color-background": theme.colors.background,
        "--color-surface": theme.colors.surface,
        "--color-surfaceHover": theme.colors.surfaceHover,

        // Text Colors
        "--color-text": theme.colors.text,
        "--color-textLight": theme.colors.textLight,
        "--color-textDark": theme.colors.textDark,

        // Border Colors
        "--color-border": theme.colors.border,
        "--color-borderHover": theme.colors.borderHover,

        // Button Colors
        "--color-buttonPrimary": theme.colors.buttonPrimary,
        "--color-buttonPrimaryText": theme.colors.buttonPrimaryText,
        "--color-buttonPrimaryHover": theme.colors.buttonPrimaryHover,

        // Status Colors
        "--color-success": theme.colors.success,
        "--color-success-bg": `${theme.colors.success}10`,
        "--color-warning": theme.colors.warning,
        "--color-error": theme.colors.error,
        "--color-info": theme.colors.info,
        "--color-info-bg": `${theme.colors.info}10`,
        "--color-info-border": theme.colors.info,
        "--color-info-text": theme.colors.info,

        // Typography
        "--font-family-heading": theme.typography.fontFamily.heading,
        "--font-family-body": theme.typography.fontFamily.body,
        "--border-radius": theme.borderRadius.md,

        // Layout
        "--spacing-xs": theme.spacing.xs,
        "--spacing-sm": theme.spacing.sm,
        "--spacing-md": theme.spacing.md,
        "--spacing-lg": theme.spacing.lg,
        "--spacing-xl": theme.spacing.xl,
        "--spacing-2xl": theme.spacing["2xl"],
      } as React.CSSProperties)
    : {};

  return (
    <div className="h-full flex flex-col">
      {/* Preview Controls */}
      <div
        className="px-4 py-3 border-b-2 flex items-center justify-between"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        <div className="flex items-center gap-3">
          <Eye size={16} style={{ color: "var(--win95-text)" }} />
          <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
            Multi-Step Checkout Preview
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 text-xs font-bold border-2 transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: previewMode === "static" ? "var(--win95-bg-light)" : "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
            onClick={() => setPreviewMode("static")}
          >
            Static View
          </button>
          <button
            className="px-3 py-1 text-xs font-bold border-2 transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: previewMode === "live" ? "var(--win95-bg-light)" : "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
            onClick={() => setPreviewMode("live")}
          >
            Interactive
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-4" style={{ background: "var(--win95-bg)" }}>
        <div
          className="checkout-preview-container"
          style={{
            ...themeStyles,
            background: theme?.colors.background || "#ffffff",
            borderRadius: theme?.borderRadius.lg || "0.5rem",
            border: `2px solid ${theme?.colors.border || "#D1D5DB"}`,
            minHeight: "600px",
          }}
        >
          {previewMode === "live" ? (
            <LiveCheckoutPreview
              organizationId={organizationId}
              linkedProducts={linkedProducts}
              paymentProviders={paymentProviders}
            />
          ) : (
            <StaticStepPreview linkedProducts={linkedProducts} theme={theme} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Live checkout preview with auto-selected products
 * This wrapper auto-selects the first product so the checkout flow can proceed
 */
function LiveCheckoutPreview({
  organizationId,
  linkedProducts,
  paymentProviders,
}: {
  organizationId: Id<"organizations">;
  linkedProducts: CheckoutProduct[];
  paymentProviders: string[];
}) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Auto-select first product for preview (quantity 1)
  const initialSelectedProducts = linkedProducts.slice(0, 1).map((product) => {
    const customProps = product.customProperties as Record<string, unknown> | undefined;
    const priceInCents = (customProps?.priceInCents as number | undefined) || 0;

    return {
      productId: product._id as Id<"objects">,
      quantity: 1,
      price: priceInCents,
    };
  });

  const totalPrice = initialSelectedProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <MultiStepCheckout
      organizationId={organizationId}
      linkedProducts={linkedProducts}
      paymentProviders={paymentProviders}
      onComplete={(result) => {
        console.log("[Preview] Checkout completed:", result);
        alert("Preview mode: Checkout flow completed!");
      }}
      // Pre-populate with selected products to trigger form flow
      initialStepData={{
        selectedProducts: initialSelectedProducts,
        totalPrice,
      }}
    />
  );
}

/**
 * Static preview showing all steps at once (non-interactive)
 */
function StaticStepPreview({
  linkedProducts,
  theme,
}: {
  linkedProducts: CheckoutProduct[];
  theme?: Theme;
}) {
  // Check if any product has a form linked
  const hasProductsWithForms = linkedProducts.some((p) => p.customProperties?.formId);

  // Format price helper
  const formatPrice = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const steps = [
    {
      title: "Step 1: Product Selection",
      description: "Customer selects products and quantities",
      preview: (
        <div className="p-6 border-2 rounded" style={{ borderColor: theme?.colors.border }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: theme?.colors.textDark }}>
            Select Products
          </h3>
          <div className="space-y-3">
            {linkedProducts.slice(0, 3).map((product) => (
              <div
                key={product._id}
                className="flex items-center justify-between p-3 border rounded"
                style={{
                  borderColor: theme?.colors.border,
                  background: theme?.colors.surface,
                }}
              >
                <div>
                  <p className="font-bold text-sm" style={{ color: theme?.colors.textDark }}>
                    {product.name}
                  </p>
                  <p className="text-xs" style={{ color: theme?.colors.textLight }}>
                    {formatPrice(product.price, product.currency)}
                    {product.customProperties?.formId && (
                      <span className="ml-2 text-xs font-bold" style={{ color: theme?.colors.primary }}>
                        📋 Form Required
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="w-8 h-8 border rounded"
                    style={{
                      borderColor: theme?.colors.border,
                      background: theme?.colors.surface,
                    }}
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold">1</span>
                  <button
                    className="w-8 h-8 border rounded"
                    style={{
                      borderColor: theme?.colors.border,
                      background: theme?.colors.surface,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    // Conditionally include Customer Info OR Registration Form step
    ...(hasProductsWithForms
      ? [
          {
            title: "Step 2: Registration Forms",
            description: "Complete required forms for selected products (one per ticket, includes contact info)",
            preview: (
              <div className="p-6 border-2 rounded" style={{ borderColor: theme?.colors.border }}>
                <h3 className="text-lg font-bold mb-4" style={{ color: theme?.colors.textDark }}>
                  Registration Information
                </h3>
                <div
                  className="p-4 border-2 rounded-lg mb-4"
                  style={{
                    borderColor: theme?.colors.primary,
                    background: `${theme?.colors.primary}10`,
                  }}
                >
                  <p className="text-sm font-bold mb-2" style={{ color: theme?.colors.textDark }}>
                    📋 Multi-Ticket Form Flow
                  </p>
                  <p className="text-xs mb-2" style={{ color: theme?.colors.textLight }}>
                    For products requiring registration, you&apos;ll fill out a form for each ticket purchased.
                  </p>
                  <p className="text-xs font-bold" style={{ color: theme?.colors.primary }}>
                    Example: 3 tickets = 3 forms (with &quot;Copy from Previous&quot; option)
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: theme?.colors.textDark }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-2 border rounded"
                      style={{
                        borderColor: theme?.colors.border,
                        background: theme?.colors.surface,
                      }}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: theme?.colors.textDark }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="w-full px-4 py-2 border rounded"
                      style={{
                        borderColor: theme?.colors.border,
                        background: theme?.colors.surface,
                      }}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: theme?.colors.textDark }}>
                      Dietary Restrictions
                    </label>
                    <textarea
                      placeholder="None"
                      className="w-full px-4 py-2 border rounded"
                      rows={3}
                      style={{
                        borderColor: theme?.colors.border,
                        background: theme?.colors.surface,
                      }}
                      disabled
                    />
                  </div>
                  <p className="text-xs text-center" style={{ color: theme?.colors.textLight }}>
                    ... additional form fields based on product requirements ...
                  </p>
                </div>
                <div
                  className="mt-4 p-3 border-2 rounded"
                  style={{
                    borderColor: theme?.colors.info,
                    background: `${theme?.colors.info}10`,
                  }}
                >
                  <p className="text-xs font-bold mb-1" style={{ color: theme?.colors.textDark }}>
                    ℹ️ Static Preview - Example Only
                  </p>
                  <p className="text-xs" style={{ color: theme?.colors.textLight }}>
                    This shows example form fields. Switch to <strong>Interactive</strong> mode to see the actual form configured for your products.
                  </p>
                </div>
              </div>
            ),
          },
        ]
      : [
          {
            title: "Step 2: Customer Information",
            description: "Customer provides contact details",
            preview: (
              <div className="p-6 border-2 rounded" style={{ borderColor: theme?.colors.border }}>
                <h3 className="text-lg font-bold mb-4" style={{ color: theme?.colors.textDark }}>
                  Your Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: theme?.colors.textDark }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-2 border rounded"
                      style={{
                        borderColor: theme?.colors.border,
                        background: theme?.colors.surface,
                      }}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: theme?.colors.textDark }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="w-full px-4 py-2 border rounded"
                      style={{
                        borderColor: theme?.colors.border,
                        background: theme?.colors.surface,
                      }}
                      disabled
                    />
                  </div>
                </div>
              </div>
            ),
          },
        ]),
    {
      title: `Step 3: Payment`,
      description: "Secure payment processing",
      preview: (
        <div className="p-6 border-2 rounded" style={{ borderColor: theme?.colors.border }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: theme?.colors.textDark }}>
            Payment Information
          </h3>
          <div className="space-y-4">
            <div
              className="p-4 border-2 rounded"
              style={{
                borderColor: theme?.colors.primary,
                background: `${theme?.colors.primary}10`,
              }}
            >
              <p className="font-bold text-sm mb-1" style={{ color: theme?.colors.textDark }}>
                💳 Credit/Debit Card
              </p>
              <p className="text-xs" style={{ color: theme?.colors.textLight }}>
                Pay securely with Visa, Mastercard, or American Express
              </p>
            </div>
            <div className="text-center py-4">
              <p className="text-xs" style={{ color: theme?.colors.textLight }}>
                Payment form will be displayed here
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: `Step 4: Confirmation`,
      description: "Order confirmation and receipt",
      preview: (
        <div className="p-6 border-2 rounded" style={{ borderColor: theme?.colors.border }}>
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: `${theme?.colors.success}20` }}
            >
              <span className="text-3xl">✓</span>
            </div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: theme?.colors.success }}>
              Payment Successful!
            </h3>
            <p className="text-sm" style={{ color: theme?.colors.textLight }}>
              Your order has been confirmed
            </p>
          </div>
          <div className="p-4 border rounded" style={{ borderColor: theme?.colors.border }}>
            <p className="text-sm font-bold mb-2" style={{ color: theme?.colors.textDark }}>
              Order Summary
            </p>
            <p className="text-xs" style={{ color: theme?.colors.textLight }}>
              Receipt details will be displayed here
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold mb-2" style={{ color: theme?.colors.textDark }}>
          Checkout Flow Preview
        </h2>
        <p className="text-sm" style={{ color: theme?.colors.textLight }}>
          This shows all steps customers will go through. Switch to Interactive mode to test the actual flow.
        </p>
      </div>
      <div className="space-y-6 max-w-3xl mx-auto">
        {steps.map((step, index) => (
          <div key={index} className="relative">
            <div className="flex items-start gap-4 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                style={{ background: theme?.colors.primary }}
              >
                {index + 1}
              </div>
              <div>
                <h4 className="font-bold text-sm" style={{ color: theme?.colors.textDark }}>
                  {step.title}
                </h4>
                <p className="text-xs" style={{ color: theme?.colors.textLight }}>
                  {step.description}
                </p>
              </div>
            </div>
            {step.preview}
            {index < steps.length - 1 && (
              <div className="flex justify-center my-4">
                <ChevronRight size={20} style={{ color: theme?.colors.textLight }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
