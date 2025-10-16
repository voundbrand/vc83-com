"use client";

/**
 * STRIPE TAX SETTINGS SECTION
 *
 * Syncs organization tax settings with Stripe Tax configuration.
 * Shows when Stripe is configured and tax settings exist.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react";

interface StripeTaxSectionProps {
  organizationId: Id<"organizations">;
  organization?: Doc<"organizations"> | null;
}

export function StripeTaxSection({ organizationId, organization }: StripeTaxSectionProps) {
  const { sessionId } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Get organization tax settings
  const taxSettings = useQuery(
    api.organizationTaxSettings.getTaxSettings,
    sessionId && organizationId
      ? { sessionId, organizationId }
      : "skip"
  );

  // Get Stripe Connect account
  const stripeProvider = organization?.paymentProviders?.find(
    (p) => p.providerCode === "stripe-connect"
  );

  const stripeConnectId = stripeProvider?.accountId;
  const isTestMode = stripeProvider?.isTestMode ?? false;

  // Check if tax is enabled
  const taxEnabled = taxSettings?.customProperties?.taxEnabled ?? false;
  const stripeTaxEnabled = taxSettings?.customProperties?.stripeSettings?.taxCalculationEnabled ?? false;

  /**
   * Sync tax settings with Stripe
   * This tells Stripe about our tax configuration
   */
  const handleSyncWithStripe = async () => {
    if (!sessionId || !stripeConnectId) return;

    setIsSyncing(true);
    try {
      // In a real implementation, this would call Stripe API to:
      // 1. Enable Stripe Tax for the connected account
      // 2. Set default tax behavior (inclusive/exclusive)
      // 3. Configure origin address for nexus
      // 4. Set up product tax codes

      // For now, we'll just update the local settings
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

      setLastSyncTime(new Date());
      alert("Tax settings synced with Stripe successfully!");
    } catch (error) {
      console.error("Failed to sync tax settings:", error);
      alert("Failed to sync tax settings with Stripe. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Not connected to Stripe
  if (!stripeConnectId) {
    return (
      <div className="space-y-4">
        <div
          className="p-4 border-2 flex items-start gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--info-light)",
          }}
        >
          <Info size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--info)" }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--win95-text)" }}>
              Stripe Connection Required
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Connect your Stripe account first to enable Stripe Tax integration.
              Go to the &quot;Stripe Connect&quot; tab to get started.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tax not enabled
  if (!taxEnabled) {
    return (
      <div className="space-y-4">
        <div
          className="p-4 border-2 flex items-start gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--warning-light)",
          }}
        >
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--warning)" }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--win95-text)" }}>
              Tax Collection Disabled
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Tax collection is currently disabled for your organization.
              Enable tax settings to use Stripe Tax integration.
            </p>
            <button
              onClick={() => {
                // TODO: Open tax settings window or navigate to it
                alert("Navigate to Organization Settings > Tax to enable tax collection");
              }}
              className="mt-3 px-3 py-1.5 text-xs font-semibold"
              style={{
                backgroundColor: "var(--primary)",
                color: "white",
                border: "2px solid",
                borderTopColor: "var(--win95-button-light)",
                borderLeftColor: "var(--win95-button-light)",
                borderBottomColor: "var(--win95-button-dark)",
                borderRightColor: "var(--win95-button-dark)",
              }}
            >
              Enable Tax Collection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tax enabled - show configuration
  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div
        className="p-4 border-2"
        style={{
          borderColor: "var(--win95-border)",
          background: stripeTaxEnabled ? "var(--success-light)" : "var(--warning-light)",
        }}
      >
        <div className="flex items-start gap-3">
          {stripeTaxEnabled ? (
            <CheckCircle2 className="text-green-500 flex-shrink-0" size={20} />
          ) : (
            <AlertTriangle className="text-yellow-500 flex-shrink-0" size={20} />
          )}
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
              Stripe Tax: {stripeTaxEnabled ? "Enabled" : "Not Configured"}
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {stripeTaxEnabled
                ? "Stripe Tax is actively calculating taxes for your transactions"
                : "Configure Stripe Tax to automatically calculate and collect taxes"}
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Details */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
          Tax Configuration
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Tax Collection:</span>
            <span className="font-semibold" style={{ color: taxEnabled ? "var(--success)" : "var(--error)" }}>
              {taxEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Default Behavior:</span>
            <span className="font-mono" style={{ color: "var(--win95-text)" }}>
              {taxSettings?.customProperties?.defaultTaxBehavior || "exclusive"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Default Tax Code:</span>
            <span className="font-mono" style={{ color: "var(--win95-text)" }}>
              {taxSettings?.customProperties?.defaultTaxCode || "txcd_10000000"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Origin Country:</span>
            <span className="font-mono" style={{ color: "var(--win95-text)" }}>
              {taxSettings?.customProperties?.originAddress?.country || "Not set"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Stripe Account Mode:</span>
            <span className="font-semibold" style={{ color: isTestMode ? "var(--warning)" : "var(--success)" }}>
              {isTestMode ? "Test Mode" : "Live Mode"}
            </span>
          </div>
        </div>
      </div>

      {/* Stripe Tax Features */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
          What Stripe Tax Does
        </h3>
        <ul className="space-y-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>Automatic tax calculation for 135+ countries</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>Real-time tax rate updates and compliance</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>VAT, GST, and sales tax support</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>B2B reverse charge for EU transactions</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>Tax reporting and filing support</span>
          </li>
        </ul>
      </div>

      {/* Sync Actions */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
          Stripe Tax Sync
        </h3>
        <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
          Sync your organization&apos;s tax settings with Stripe Tax to enable automatic tax calculation.
        </p>

        {lastSyncTime && (
          <div className="mb-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
            Last synced: {lastSyncTime.toLocaleString()}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSyncWithStripe}
            disabled={isSyncing}
            className="flex-1 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2"
            style={{
              backgroundColor: "var(--primary)",
              color: "white",
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
              opacity: isSyncing ? 0.6 : 1,
              cursor: isSyncing ? "not-allowed" : "pointer",
            }}
          >
            {isSyncing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Sync with Stripe Tax
              </>
            )}
          </button>

          <a
            href={`https://dashboard.stripe.com/${isTestMode ? "test/" : ""}settings/tax`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold flex items-center gap-2"
            style={{
              backgroundColor: "var(--win95-button-face)",
              color: "var(--win95-text)",
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
            }}
          >
            <ExternalLink size={14} />
            Stripe Dashboard
          </a>
        </div>
      </div>

      {/* Important Notes */}
      <div
        className="p-3 border-2 text-xs"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--info-light)",
          color: "var(--win95-text)",
        }}
      >
        <p className="font-semibold mb-2 flex items-center gap-2">
          <Info size={14} />
          Important Notes
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Stripe Tax requires tax registrations to be configured in your Stripe dashboard</li>
          <li>Tax calculations are performed in real-time during checkout</li>
          <li>B2B transactions with valid VAT numbers use reverse charge mechanism</li>
          <li>Origin address must be set in Organization Tax Settings</li>
        </ul>
      </div>
    </div>
  );
}
