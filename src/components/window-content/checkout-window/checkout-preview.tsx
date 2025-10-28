/**
 * CHECKOUT PREVIEW COMPONENT
 *
 * Renders live preview of checkout template with current configuration.
 * Similar to the template preview in Web Publishing but for checkouts.
 */

"use client";

import { ShoppingCart } from "lucide-react";
import { getCheckoutComponent } from "@/templates/checkout/registry";
import { MultiStepPreview } from "./multi-step-preview";
import type { CheckoutProduct, CheckoutTemplateProps } from "@/templates/checkout/types";
import type { Theme } from "@/templates/types";
import type { Id } from "../../../../convex/_generated/dataModel";

interface CheckoutPreviewProps {
  templateCode: string;
  configuration: Record<string, unknown>;
  linkedProducts: CheckoutProduct[];
  organizationId: Id<"organizations">;
  theme?: Theme;
  paymentProviders?: string[];
  forceB2B?: boolean;
}

/**
 * Default theme if none provided
 */
const defaultTheme: Theme = {
  code: "retro-purple",
  name: "Retro Purple",
  colors: {
    primary: "#6B46C1",
    secondary: "#9F7AEA",
    accent: "#F59E0B",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    text: "#2A2A2A",
    textLight: "#6B7280",
    textDark: "#111827",
    border: "#D1D5DB",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
  typography: {
    fontFamily: {
      heading: "Press Start 2P, monospace",
      body: "system-ui, -apple-system, sans-serif",
      mono: "monospace",
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      h1: "2.5rem",
      h2: "2rem",
      h3: "1.75rem",
      h4: "1.5rem",
      h5: "1.25rem",
      h6: "1rem",
      body: "1rem",
      small: "0.875rem",
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
    "4xl": "6rem",
  },
  borderRadius: {
    none: "0",
    sm: "0.125rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },
  shadows: {
    none: "none",
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  layout: {
    maxWidth: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    breakpoints: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
  },
};

export function CheckoutPreview({
  templateCode,
  configuration,
  linkedProducts,
  organizationId,
  theme = defaultTheme,
  paymentProviders = [],
  forceB2B = false,
}: CheckoutPreviewProps) {
  // Check if this is the ticket-checkout template (uses multi-step)
  const isMultiStep = templateCode === "ticket-checkout";

  // If multi-step, show the multi-step preview component
  if (isMultiStep) {
    return (
      <MultiStepPreview
        linkedProducts={linkedProducts}
        organizationId={organizationId}
        paymentProviders={paymentProviders}
        theme={theme}
        forceB2B={forceB2B}
      />
    );
  }

  // Get template component from registry
  const CheckoutComponent = getCheckoutComponent(templateCode);

  // No template found
  if (!CheckoutComponent) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <ShoppingCart size={48} className="mb-4 text-gray-300" />
        <p className="text-sm font-bold mb-2">Template Not Found</p>
        <p className="text-xs">
          The checkout template &quot;{templateCode}&quot; could not be loaded.
        </p>
      </div>
    );
  }

  // No products linked yet
  if (linkedProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <ShoppingCart size={48} className="mb-4 text-gray-300" />
        <p className="text-sm font-bold mb-2">No Products Linked</p>
        <p className="text-xs">
          Link products from the configuration panel to see them in the checkout preview.
        </p>
      </div>
    );
  }

  // Render the checkout template
  const templateProps: CheckoutTemplateProps = {
    organizationId,
    configuration,
    linkedProducts,
    theme,
    onCheckout: async (product, quantity) => {
      console.log("[Preview] Checkout clicked:", { product, quantity });
      // In preview mode, we don't actually process checkout
      alert(`Preview mode: Would checkout ${quantity}x ${product.name}`);
    },
  };

  // Inject CSS variables from theme for checkout component
  const themeStyles = {
    // Colors
    "--color-primary": theme.colors.primary,
    "--color-secondary": theme.colors.secondary,
    "--color-accent": theme.colors.accent,
    "--color-background": theme.colors.background,
    "--color-surface": theme.colors.surface,
    "--color-text": theme.colors.text,
    "--color-textLight": theme.colors.textLight,
    "--color-textDark": theme.colors.textDark,
    "--color-border": theme.colors.border,
    "--color-success": theme.colors.success,
    "--color-warning": theme.colors.warning,
    "--color-error": theme.colors.error,
    "--color-info": theme.colors.info,

    // Typography
    "--font-size-xs": theme.typography.fontSize.xs,
    "--font-size-sm": theme.typography.fontSize.sm,
    "--font-size-base": theme.typography.fontSize.base,
    "--font-size-lg": theme.typography.fontSize.lg,
    "--font-size-xl": theme.typography.fontSize.xl,
    "--font-size-2xl": theme.typography.fontSize["2xl"],
    "--font-size-h3": theme.typography.fontSize.h3,
    "--font-weight-medium": theme.typography.fontWeight.medium,
    "--font-weight-semibold": theme.typography.fontWeight.semibold,
    "--font-weight-bold": theme.typography.fontWeight.bold,
    "--line-height-tight": theme.typography.lineHeight.tight,
    "--line-height-relaxed": theme.typography.lineHeight.relaxed,

    // Spacing
    "--spacing-xs": theme.spacing.xs,
    "--spacing-sm": theme.spacing.sm,
    "--spacing-md": theme.spacing.md,
    "--spacing-lg": theme.spacing.lg,
    "--spacing-xl": theme.spacing.xl,

    // Border radius
    "--border-radius-md": theme.borderRadius.md,
    "--border-radius-lg": theme.borderRadius.lg,

    // Shadows
    "--shadow-md": theme.shadows.md,

    // Scale & transform for preview
    transform: "scale(0.75)",
    transformOrigin: "top left",
    width: "133%", // Compensate for 75% scale
  } as React.CSSProperties;

  return (
    <div className="checkout-preview-wrapper" style={themeStyles}>
      <CheckoutComponent {...templateProps} />
    </div>
  );
}
