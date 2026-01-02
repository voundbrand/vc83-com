"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Loader2, CreditCard, ToggleLeft, ToggleRight, Check } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Available payment providers definition
 *
 * This is the single source of truth for payment providers.
 * Similar to BUILT_IN_INTEGRATIONS in the integrations window.
 */
const PAYMENT_PROVIDERS = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Credit & debit cards, Apple Pay, Google Pay",
    icon: "fab fa-stripe",
    iconColor: "#635bff",
    configTab: "stripe" as const,
    accessCheck: { type: "feature" as const, key: "stripeConnectEnabled" },
  },
  {
    id: "invoice",
    name: "Invoice",
    description: "B2B invoicing with payment terms",
    icon: "fas fa-file-invoice",
    iconColor: "#10b981",
    configTab: "invoicing" as const,
    accessCheck: { type: "feature" as const, key: "invoicePaymentEnabled" },
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "PayPal payments and checkout",
    icon: "fab fa-paypal",
    iconColor: "#003087",
    configTab: null, // Coming soon
    status: "coming_soon" as const,
    accessCheck: { type: "feature" as const, key: "paypalEnabled" },
  },
  {
    id: "apple-pay",
    name: "Apple Pay",
    description: "Fast checkout for Apple devices",
    icon: "fab fa-apple-pay",
    iconColor: "#000000",
    configTab: null,
    status: "coming_soon" as const,
    accessCheck: { type: "feature" as const, key: "applePayEnabled" },
  },
  {
    id: "google-pay",
    name: "Google Pay",
    description: "Quick payments with Google",
    icon: "fab fa-google-pay",
    iconColor: "#4285f4",
    configTab: null,
    status: "coming_soon" as const,
    accessCheck: { type: "feature" as const, key: "googlePayEnabled" },
  },
  {
    id: "klarna",
    name: "Klarna",
    description: "Buy now, pay later",
    icon: "fas fa-clock",
    iconColor: "#ffb3c7",
    configTab: null,
    status: "coming_soon" as const,
    accessCheck: { type: "feature" as const, key: "klarnaEnabled" },
  },
  {
    id: "bank-transfer",
    name: "Bank Transfer",
    description: "Direct bank payments (SEPA, ACH)",
    icon: "fas fa-university",
    iconColor: "#1e3a5f",
    configTab: null,
    status: "coming_soon" as const,
    accessCheck: { type: "feature" as const, key: "bankTransferEnabled" },
  },
  {
    id: "crypto",
    name: "Cryptocurrency",
    description: "Bitcoin, Ethereum, and more",
    icon: "fab fa-bitcoin",
    iconColor: "#f7931a",
    configTab: null,
    status: "coming_soon" as const,
    accessCheck: { type: "feature" as const, key: "cryptoEnabled" },
  },
];

interface ProvidersTabProps {
  onSelectProvider: (tabId: "stripe" | "invoicing") => void;
}

/**
 * Providers Tab
 *
 * Grid view of all available payment providers.
 * Shows connection status and allows clicking to configure.
 * Allows enabling/disabling providers for checkouts (source of truth).
 */
export function ProvidersTab({ onSelectProvider }: ProvidersTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const organizationId = currentOrg?.id;
  const [togglingProvider, setTogglingProvider] = useState<string | null>(null);

  // Get organization data to check Stripe status
  const organization = useQuery(
    api.organizations.getById,
    organizationId && sessionId
      ? { organizationId: organizationId as Id<"organizations">, sessionId }
      : "skip"
  );

  // Query payment provider configs from objects table (single source of truth!)
  const availableProviders = useQuery(
    api.paymentProviders.helpers.getAvailableProviders,
    organizationId
      ? { organizationId: organizationId as Id<"organizations"> }
      : "skip"
  );

  // Get payment settings (enabled providers for checkouts)
  const paymentSettings = useQuery(
    api.organizationPaymentSettings.getPaymentSettings,
    organizationId && sessionId
      ? { organizationId: organizationId as Id<"organizations">, sessionId }
      : "skip"
  );

  // Check if invoice payment is available
  const invoiceAvailability = useQuery(
    api.paymentProviders.invoiceAvailability.checkInvoicePaymentAvailability,
    sessionId && currentOrg
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  // Mutation to toggle provider
  const toggleProvider = useMutation(api.organizationPaymentSettings.togglePaymentProvider);

  // Loading state
  if (!organization) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  // Check if a provider is enabled for checkouts
  const isProviderEnabled = (providerId: string): boolean => {
    return paymentSettings?.enabledPaymentProviders?.includes(providerId) ?? false;
  };

  // Handle toggle
  const handleToggle = async (providerId: string, currentlyEnabled: boolean) => {
    if (!sessionId || !organizationId) return;

    setTogglingProvider(providerId);
    try {
      await toggleProvider({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        providerCode: providerId,
        enabled: !currentlyEnabled,
      });
    } catch (error) {
      console.error("Failed to toggle provider:", error);
    } finally {
      setTogglingProvider(null);
    }
  };

  // Determine provider status
  const getProviderStatus = (providerId: string): "connected" | "available" | "coming_soon" | "needs_setup" => {
    const provider = PAYMENT_PROVIDERS.find(p => p.id === providerId);

    // Check if it's a coming_soon provider
    if (provider?.status === "coming_soon") {
      return "coming_soon";
    }

    switch (providerId) {
      case "stripe":
        // Check if Stripe Connect is connected via objects table (single source of truth!)
        const stripeProvider = availableProviders?.find(
          (p) => p.providerCode === "stripe-connect"
        );
        if (stripeProvider) {
          // Show as connected if active, or needs_setup if disabled/pending/restricted
          return stripeProvider.status === "active" ? "connected" : "needs_setup";
        }
        return "available";

      case "invoice":
        // Check if invoice payment is available
        if (invoiceAvailability?.available) {
          return "connected";
        }
        // If not available but there's a reason, it needs setup
        if (invoiceAvailability && !invoiceAvailability.available) {
          return "needs_setup";
        }
        return "available";

      default:
        return "available";
    }
  };

  const handleProviderClick = (provider: typeof PAYMENT_PROVIDERS[0]) => {
    if (provider.status === "coming_soon" || !provider.configTab) {
      return; // Do nothing for coming soon providers
    }

    onSelectProvider(provider.configTab);
  };

  // Count connected providers
  const connectedCount = PAYMENT_PROVIDERS.filter(
    p => getProviderStatus(p.id) === "connected"
  ).length;

  // Count enabled providers
  const enabledCount = paymentSettings?.enabledPaymentProviders?.length ?? 0;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard size={20} style={{ color: "var(--win95-highlight)" }} />
          <h2 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            Payment Providers
          </h2>
        </div>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Connect and enable payment providers for your checkouts.
          {connectedCount > 0 && (
            <span className="ml-2 font-bold" style={{ color: "var(--success)" }}>
              {connectedCount} connected
            </span>
          )}
          {enabledCount > 0 && (
            <span className="ml-2 font-bold" style={{ color: "var(--win95-highlight)" }}>
              {enabledCount} enabled for checkouts
            </span>
          )}
        </p>
      </div>

      {/* Provider Grid with Toggle Controls */}
      <div className="space-y-2">
        {PAYMENT_PROVIDERS.map((provider) => {
          const status = getProviderStatus(provider.id);
          const isConnected = status === "connected";
          const isEnabled = isProviderEnabled(provider.id);
          const isComingSoon = status === "coming_soon";
          const isToggling = togglingProvider === provider.id;

          // Determine if the tile should be clickable
          const isClickable = !isComingSoon && provider.configTab;

          return (
            <div
              key={provider.id}
              onClick={() => isClickable && onSelectProvider(provider.configTab!)}
              className={`flex items-center gap-3 p-3 rounded border-2 transition-all ${isClickable ? "cursor-pointer hover:border-[var(--win95-highlight)]" : ""}`}
              style={{
                borderColor: isEnabled ? "var(--success)" : isConnected ? "var(--win95-border)" : "var(--win95-border)",
                background: isEnabled ? "rgba(16, 185, 129, 0.05)" : "var(--win95-bg-light)",
                opacity: isComingSoon ? 0.5 : 1,
              }}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 flex items-center justify-center rounded flex-shrink-0"
                style={{ background: `${provider.iconColor}15` }}
              >
                <i
                  className={provider.icon}
                  style={{ fontSize: "20px", color: provider.iconColor }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                    {provider.name}
                  </span>
                  {isConnected && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                      style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
                    >
                      <Check size={10} /> Connected
                    </span>
                  )}
                  {status === "needs_setup" && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}
                    >
                      Setup Required
                    </span>
                  )}
                  {isComingSoon && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "var(--win95-border)", color: "var(--neutral-gray)" }}
                    >
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-[11px] truncate" style={{ color: "var(--neutral-gray)" }}>
                  {provider.description}
                </p>
              </div>

              {/* Toggle for Checkout (only for connected providers) */}
              {isConnected && !isComingSoon && (
                <div
                  className="flex items-center gap-2 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()} // Prevent tile click when clicking toggle
                >
                  <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                    {isEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    onClick={() => handleToggle(provider.id, isEnabled)}
                    disabled={isToggling}
                    className="transition-colors"
                    title={isEnabled ? "Disable for checkouts" : "Enable for checkouts"}
                  >
                    {isToggling ? (
                      <Loader2 size={24} className="animate-spin" style={{ color: "var(--neutral-gray)" }} />
                    ) : isEnabled ? (
                      <ToggleRight size={24} style={{ color: "var(--success)" }} />
                    ) : (
                      <ToggleLeft size={24} style={{ color: "var(--neutral-gray)" }} />
                    )}
                  </button>
                </div>
              )}

              {/* Status indicator for non-connected providers */}
              {!isConnected && !isComingSoon && provider.configTab && (
                <span
                  className="text-[10px] px-2 py-1 rounded font-semibold"
                  style={{
                    background: "rgba(99, 91, 255, 0.1)",
                    color: "var(--win95-highlight)",
                  }}
                >
                  {status === "needs_setup" ? "Setup →" : "Connect →"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div
        className="mt-4 p-3 rounded border-2"
        style={{
          borderColor: "var(--win95-highlight)",
          background: "rgba(99, 91, 255, 0.05)",
        }}
      >
        <h3 className="text-xs font-bold mb-1" style={{ color: "var(--win95-highlight)" }}>
          How This Works
        </h3>
        <ul className="text-[11px] space-y-1" style={{ color: "var(--neutral-gray)" }}>
          <li><strong>1. Connect</strong> - Set up payment providers (Stripe account, invoice settings)</li>
          <li><strong>2. Enable</strong> - Toggle which providers to offer in your checkouts</li>
          <li><strong>3. Checkout</strong> - Customers see only enabled providers (can override per checkout)</li>
        </ul>
      </div>

      {/* Enabled Providers Summary */}
      {enabledCount > 0 && (
        <div
          className="mt-3 p-3 rounded border-2"
          style={{
            borderColor: "var(--success)",
            background: "rgba(16, 185, 129, 0.05)",
          }}
        >
          <h3 className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: "var(--success)" }}>
            <Check size={14} /> Active in Checkouts
          </h3>
          <p className="text-[11px]" style={{ color: "var(--win95-text)" }}>
            {paymentSettings?.enabledPaymentProviders?.map((p: string) => {
              const provider = PAYMENT_PROVIDERS.find(pp => pp.id === p);
              return provider?.name || p;
            }).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
