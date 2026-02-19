"use client";

/**
 * CHECKOUT EMBED COMPONENT
 *
 * Reusable component for embedding ANY checkout template into ANY web template.
 * This allows web pages (event landings, product pages, etc.) to inject
 * a complete checkout experience without reimplementing the checkout UI.
 *
 * Usage in web templates:
 * <CheckoutEmbed
 *   checkoutInstanceId={page.customProperties.linkedCheckoutId}
 *   organizationId={organization._id}
 *   sessionId={sessionId}
 * />
 */

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Loader2, AlertCircle, ShoppingCart } from "lucide-react";
import { getCheckoutComponent } from "@/templates/checkout/registry";
import { getThemeByCode } from "@/templates/themes";
import type { CheckoutTemplateProps } from "@/templates/checkout/types";

export interface CheckoutEmbedProps {
  /** ID of the checkout instance to embed */
  checkoutInstanceId: Id<"objects">;

  /** Organization ID (required for queries) */
  organizationId: Id<"organizations">;

  /** Optional session ID for authenticated users */
  sessionId?: string;

  /** Optional CSS class name for styling */
  className?: string;

  /** Optional custom empty state */
  emptyState?: React.ReactNode;

  /** Optional custom loading state */
  loadingState?: React.ReactNode;

  /** Optional custom error state */
  errorState?: (error: string) => React.ReactNode;
}

/**
 * Checkout Embed Component
 *
 * This component handles:
 * - Loading the checkout instance and its products
 * - Resolving the template component from the registry
 * - Applying the theme from checkout configuration
 * - Rendering the complete checkout experience
 */
export function CheckoutEmbed({
  checkoutInstanceId,
  organizationId,
  sessionId,
  className = "",
  emptyState,
  loadingState,
  errorState,
}: CheckoutEmbedProps) {
  // Fetch checkout instance (use authenticated query if sessionId exists)
  const checkoutInstanceAuth = useQuery(
    api.checkoutOntology.getCheckoutInstanceById,
    checkoutInstanceId && sessionId
      ? {
          sessionId,
          instanceId: checkoutInstanceId,
        }
      : "skip"
  );

  // Use public query if no sessionId (public page)
  const checkoutInstancePublic = useQuery(
    api.checkoutOntology.getPublicCheckoutInstanceById,
    checkoutInstanceId && !sessionId
      ? {
          instanceId: checkoutInstanceId,
        }
      : "skip"
  );

  // Use whichever query returned data
  const checkoutInstance = sessionId ? checkoutInstanceAuth : checkoutInstancePublic;

  // Fetch products for this checkout
  const linkedProductsData = useQuery(
    api.checkoutOntology.getPublicCheckoutProducts,
    checkoutInstance?._id ? { checkoutInstanceId: checkoutInstance._id } : "skip"
  );

  // Loading state
  if (checkoutInstance === undefined || linkedProductsData === undefined) {
    if (loadingState) return <>{loadingState}</>;

    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-violet-600 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!checkoutInstance) {
    if (errorState) return <>{errorState("Checkout not found")}</>;

    return (
      <div className={`bg-red-50 border-2 border-red-200 rounded-lg p-6 ${className}`}>
        <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
        <h3 className="font-bold text-red-900 text-center mb-2">Checkout Not Found</h3>
        <p className="text-red-700 text-sm text-center">
          The checkout instance could not be loaded.
        </p>
      </div>
    );
  }

  // Extract configuration from checkout instance
  const config = checkoutInstance.customProperties as Record<string, unknown>;
  const templateCode = (config.templateCode as string) || "ticket-checkout";
  const themeCode = (config.themeCode as string) || "modern-gradient";

  // Load theme from theme code
  const theme = getThemeByCode(themeCode);

  // Transform products to CheckoutProduct format
  const linkedProducts = (linkedProductsData || [])
    .filter((product) => product !== null)
    .map((product) => ({
      _id: product._id,
      name: product.name,
      description: (product as { description?: string }).description || "",
      price: Number((product.customProperties as Record<string, unknown>)?.price || 0),
      currency: String((product.customProperties as Record<string, unknown>)?.currency || "eur"),
      subtype: product.subtype,
      customProperties: product.customProperties as Record<string, unknown>,
      eventName: (product as unknown as { eventName?: string }).eventName,
      eventSponsors: (product as unknown as { eventSponsors?: Array<{ name: string; level?: string }> }).eventSponsors || [],
    }));

  // Get template component from registry
  const CheckoutComponent = getCheckoutComponent(templateCode);

  // Template not found
  if (!CheckoutComponent) {
    if (errorState) return <>{errorState(`Template "${templateCode}" not found`)}</>;

    return (
      <div className={`bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 ${className}`}>
        <ShoppingCart size={32} className="text-yellow-600 mx-auto mb-3" />
        <h3 className="font-bold text-yellow-900 text-center mb-2">Template Not Found</h3>
        <p className="text-yellow-700 text-sm text-center">
          The checkout template &quot;{templateCode}&quot; could not be loaded.
        </p>
      </div>
    );
  }

  // No products linked
  if (linkedProducts.length === 0) {
    if (emptyState) return <>{emptyState}</>;

    return (
      <div className={`bg-gray-50 border-2 border-gray-200 rounded-lg p-6 ${className}`}>
        <ShoppingCart size={32} className="text-gray-400 mx-auto mb-3" />
        <h3 className="font-bold text-gray-700 text-center mb-2">No Products Available</h3>
        <p className="text-gray-600 text-sm text-center">
          This checkout doesn&apos;t have any products linked yet.
        </p>
      </div>
    );
  }

  // Build template props
  const templateProps: CheckoutTemplateProps = {
    organizationId,
    configuration: config,
    linkedProducts,
    theme: theme!,
    onCheckout: async (product, quantity) => {
      console.log("🛒 [CheckoutEmbed] Product selected:", { product, quantity });
      // This is handled by the template component itself
    },
  };

  // Inject CSS variables from theme
  const themeStyles = theme
    ? ({
        // Primary Colors
        "--color-primary": theme.colors.primary,
        "--color-primaryDark": theme.colors.primaryDark,
        "--color-primaryLight": theme.colors.primaryLight,

        // Secondary & Accent
        "--color-secondary": theme.colors.secondary,
        "--color-accent": theme.colors.accent,

        // Background & Surface
        "--color-background": theme.colors.background,
        "--color-surface": theme.colors.surface,

        // Text Colors
        "--color-text": theme.colors.text,
        "--color-textLight": theme.colors.textLight,

        // Border Colors
        "--color-border": theme.colors.border,

        // Button Colors
        "--color-buttonPrimary": theme.colors.buttonPrimary,
        "--color-buttonPrimaryText": theme.colors.buttonPrimaryText,

        // Typography
        "--font-family-heading": theme.typography.fontFamily.heading,
        "--font-family-body": theme.typography.fontFamily.body,
      } as React.CSSProperties)
    : {};

  return (
    <div className={`w-full max-w-full overflow-hidden ${className}`} style={themeStyles}>
      <CheckoutComponent {...templateProps} />
    </div>
  );
}
