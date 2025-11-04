"use client";

/**
 * CHECKOUT PAGE CLIENT COMPONENT
 *
 * Public checkout page that loads a checkout instance and renders it
 * with the appropriate template and theme - uses the template registry!
 */

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Loader2, AlertCircle, Home, ShoppingCart } from "lucide-react";
import { getCheckoutComponent } from "@/templates/checkout/registry";
import { getThemeByCode } from "@/templates/themes";
import type { CheckoutTemplateProps } from "@/templates/checkout/types";
import Link from "next/link";

type CheckoutPageClientProps = {
  orgSlug: string;
  slug: string; // checkout instance publicSlug
};

export function CheckoutPageClient({ orgSlug, slug }: CheckoutPageClientProps) {
  // Fetch checkout instance by org slug and publicSlug
  const checkoutInstance = useQuery(
    api.checkoutOntology.getPublicCheckoutInstance,
    { orgSlug, publicSlug: slug }
  );

  // Fetch linked products for this checkout
  const linkedProductsData = useQuery(
    api.checkoutOntology.getPublicCheckoutProducts,
    checkoutInstance?._id ? { checkoutInstanceId: checkoutInstance._id } : "skip"
  );

  // Debug logging
  console.log("🔍 [CheckoutPageClient] Params:", { orgSlug, slug });
  console.log("🔍 [CheckoutPageClient] Checkout:", checkoutInstance);
  console.log("🔍 [CheckoutPageClient] Products:", linkedProductsData);

  // Loading state
  if (checkoutInstance === undefined || linkedProductsData === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!checkoutInstance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout Not Found</h1>
          <p className="text-gray-600 mb-4">
            The checkout page you&apos;re looking for doesn&apos;t exist or has been unpublished.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Looking for:</strong>
            </p>
            <ul className="text-xs text-gray-600 space-y-1 font-mono">
              <li>• Organization: {orgSlug}</li>
              <li>• Checkout Slug: {slug}</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              Check the browser console for detailed logs about available checkouts.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Home size={16} />
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Extract configuration from checkout instance
  const config = checkoutInstance.customProperties as Record<string, unknown>;
  const templateCode = (config.templateCode as string) || "ticket-checkout";
  const themeCode = (config.themeCode as string) || "modern-gradient";
  const settings = (config.settings as Record<string, unknown>) || {};

  // Load theme from theme code
  const theme = getThemeByCode(themeCode);

  // Transform products to CheckoutProduct format with event data
  const linkedProducts = (linkedProductsData || [])
    .filter((product) => product !== null)
    .map((product) => ({
      _id: product._id,
      name: product.name,
      description: product.description || "",
      price: Number((product.customProperties as Record<string, unknown>)?.price || 0), // ✅ Price is in cents in 'price' field
      currency: String((product.customProperties as Record<string, unknown>)?.currency || settings.currency || "eur"),
      subtype: product.subtype, // ✅ Include subtype ("ticket" | "physical" | "digital")
      customProperties: product.customProperties as Record<string, unknown>,
      // 🎯 Include event data and sponsors from backend
      eventName: (product as unknown as { eventName?: string }).eventName,
      eventSponsors: (product as unknown as { eventSponsors?: Array<{ name: string; level?: string }> }).eventSponsors || [],
    }));

  // Get template component from registry
  const CheckoutComponent = getCheckoutComponent(templateCode);

  console.log("🔍 [CheckoutPageClient] Template:", templateCode);
  console.log("🔍 [CheckoutPageClient] Theme:", themeCode);
  console.log("🔍 [CheckoutPageClient] Products:", linkedProducts.length);

  // Template not found
  if (!CheckoutComponent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <ShoppingCart size={64} className="text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Template Not Found</h1>
          <p className="text-gray-600 mb-6">
            The checkout template &quot;{templateCode}&quot; could not be loaded.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Home size={16} />
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // No products linked
  if (linkedProducts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle size={64} className="text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Products Available</h1>
          <p className="text-gray-600 mb-6">
            This checkout doesn&apos;t have any products linked yet.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Home size={16} />
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Build template props
  const templateProps: CheckoutTemplateProps = {
    organizationId: checkoutInstance.organizationId as Id<"organizations">,
    configuration: config,
    linkedProducts,
    theme: theme!, // We know theme exists because getThemeByCode returns default
    onCheckout: async (product, quantity) => {
      console.log("🛒 [Live Checkout] Product selected:", { product, quantity });
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
        "--color-primary-bg": `${theme.colors.primary}10`,

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

        // Layout
        "--spacing-xs": theme.spacing.xs,
        "--spacing-sm": theme.spacing.sm,
        "--spacing-md": theme.spacing.md,
        "--spacing-lg": theme.spacing.lg,
        "--spacing-xl": theme.spacing.xl,
        "--spacing-2xl": theme.spacing["2xl"],

        // Border radius
        "--border-radius": theme.borderRadius.md,
      } as React.CSSProperties)
    : {};

  return (
    <div
      className="min-h-screen"
      style={{
        ...themeStyles,
        background: theme?.colors.background || "#ffffff",
      }}
    >
      {/* Header */}
      <header
        className="border-b backdrop-blur sticky top-0 z-50"
        style={{
          background: `${theme?.colors.background || "#ffffff"}cc`,
          borderColor: theme?.colors.border || "#D1D5DB",
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <h1
            className="text-xl font-bold"
            style={{ color: theme?.colors.textDark || "#111827" }}
          >
            {String(settings.title || checkoutInstance.name)}
          </h1>
          {typeof settings.description === "string" && settings.description && (
            <p
              className="text-sm mt-1"
              style={{ color: theme?.colors.textLight || "#6B7280" }}
            >
              {settings.description}
            </p>
          )}
        </div>
      </header>

      {/* Main Content - Render Template */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <CheckoutComponent {...templateProps} />
        </div>
      </main>

      {/* Footer */}
      <footer
        className="border-t backdrop-blur mt-12"
        style={{
          background: `${theme?.colors.background || "#ffffff"}cc`,
          borderColor: theme?.colors.border || "#D1D5DB",
        }}
      >
        <div
          className="container mx-auto px-4 py-6 text-center text-sm"
          style={{ color: theme?.colors.textLight || "#6B7280" }}
        >
          <p className="mb-2">🔒 Secured by Stripe | Your payment info is encrypted</p>
          <p>
            Powered by{" "}
            <span
              className="font-semibold"
              style={{ color: theme?.colors.primary || "#6B46C1" }}
            >
              L4YERCAK3
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
