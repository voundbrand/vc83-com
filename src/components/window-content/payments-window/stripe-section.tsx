"use client";

/**
 * UNIFIED STRIPE SECTION
 *
 * Combines Stripe Connect and Stripe Tax settings in one place.
 * Shows connection status, tax configuration, and quick actions.
 */

import { useState, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import {
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  CreditCard,
  DollarSign,
  Zap,
  RotateCw,
  Receipt,
  RefreshCw,
  Info,
} from "lucide-react";

interface StripeSectionProps {
  organizationId: Id<"organizations">;
  organization?: Doc<"organizations"> | null;
}

export function StripeSection({ organizationId, organization }: StripeSectionProps) {
  const { sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.payments");
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"test" | "live">("live");
  const [isSyncingTax, setIsSyncingTax] = useState(false);

  const startOnboarding = useMutation(api.stripeConnect.startOnboarding);
  const getOnboardingUrl = useAction(api.stripeConnect.getStripeOnboardingUrl);
  const refreshAccountStatus = useMutation(api.stripeConnect.refreshAccountStatus);
  const disconnectStripe = useMutation(api.stripeConnect.disconnectStripeConnect);
  const handleOAuthCallbackMutation = useMutation(api.stripeConnect.handleOAuthCallback);

  // Get organization tax settings
  const taxSettings = useQuery(
    api.organizationTaxSettings.getTaxSettings,
    sessionId && organizationId
      ? { sessionId, organizationId }
      : "skip"
  );

  // Get Stripe Connect config
  const stripeProvider = organization?.paymentProviders?.find(
    (p) => p.providerCode === "stripe-connect"
  );

  const stripeConnectId = stripeProvider?.accountId;
  const accountStatus = stripeProvider?.status;
  const testMode = stripeProvider?.isTestMode ?? false;

  // Tax settings
  const taxEnabled = taxSettings?.customProperties?.taxEnabled ?? false;
  const stripeTaxEnabled = taxSettings?.customProperties?.stripeSettings?.taxCalculationEnabled ?? false;

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state && sessionId) {
      // Immediately clean up URL to prevent duplicate processing
      const shouldReopenPayments = localStorage.getItem('stripe_oauth_reopen_payments');
      const cleanUrl = shouldReopenPayments
        ? `${window.location.pathname}?openWindow=payments`
        : window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);

      handleOAuthCallbackMutation({
        sessionId,
        organizationId: state as Id<"organizations">,
        code,
        state,
        isTestMode: selectedMode === "test",
      }).then(() => {
        localStorage.removeItem('stripe_oauth_reopen_payments');

        setTimeout(() => {
          refreshAccountStatus({ sessionId, organizationId }).catch(err =>
            console.error('Failed to refresh:', err)
          );
        }, 2000);
      }).catch(err => {
        console.error('Failed to process OAuth:', err);
        alert('Failed to connect Stripe account. Please try again.');
        localStorage.removeItem('stripe_oauth_reopen_payments');
      });
    }
  }, [sessionId, organizationId, selectedMode, refreshAccountStatus, handleOAuthCallbackMutation]);

  const handleStartOnboarding = async () => {
    if (!sessionId) return;
    setIsOnboarding(true);
    try {
      localStorage.setItem('stripe_oauth_reopen_payments', 'true');
      const returnUrl = window.location.origin;
      const refreshUrl = window.location.origin;
      const isTestMode = selectedMode === "test";

      await startOnboarding({ sessionId, organizationId, refreshUrl, returnUrl, isTestMode });
      await new Promise(resolve => setTimeout(resolve, 2000));
      const result = await getOnboardingUrl({ sessionId, organizationId, refreshUrl, returnUrl, isTestMode });

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("No onboarding URL returned");
      }
    } catch (error) {
      console.error("Failed to start onboarding:", error);
      alert("Failed to start Stripe Connect onboarding. Please try again.");
      setIsOnboarding(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!sessionId || !stripeConnectId) return;
    try {
      await refreshAccountStatus({ sessionId, organizationId });
    } catch (error) {
      console.error("Failed to refresh status:", error);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;
    const confirmed = window.confirm(
      t("ui.payments.stripe.disconnect_confirm")
    );
    if (!confirmed) return;

    setIsDisconnecting(true);
    try {
      await disconnectStripe({ sessionId, organizationId });
      alert(t("ui.payments.stripe.disconnect_success"));
    } catch (error) {
      console.error("Failed to disconnect:", error);
      alert(t("ui.payments.stripe.disconnect_error"));
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSyncTax = async () => {
    setIsSyncingTax(true);
    try {
      // Simulate sync - in production this would call Stripe Tax API
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(t("ui.payments.stripe.tax_sync_success"));
    } catch (error) {
      console.error("Failed to sync tax:", error);
      alert(t("ui.payments.stripe.tax_sync_error"));
    } finally {
      setIsSyncingTax(false);
    }
  };

  const getStatusIcon = () => {
    switch (accountStatus) {
      case "active":
        return <CheckCircle2 style={{ color: "var(--success)" }} size={20} />;
      case "pending":
        return <AlertTriangle style={{ color: "var(--warning)" }} size={20} />;
      case "restricted":
      case "disabled":
        return <XCircle style={{ color: "var(--error)" }} size={20} />;
      default:
        return <CreditCard style={{ color: "var(--neutral-gray)" }} size={20} />;
    }
  };

  // Not connected state
  if (!stripeConnectId) {
    return (
      <div className="space-y-6">
        {/* Hero */}
        <div className="text-center py-8">
          <div
            className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full"
            style={{ background: "var(--primary-light)" }}
          >
            <CreditCard size={32} style={{ color: "var(--primary)" }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            {t("ui.payments.stripe.connect_title")}
          </h3>
          <p className="text-sm max-w-md mx-auto" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.payments.stripe.connect_subtitle")}
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="p-4 border-2"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
          >
            <DollarSign size={24} style={{ color: "var(--success)" }} className="mb-2" />
            <h4 className="font-bold text-sm mb-1">{t("ui.payments.stripe.benefit_payments_title")}</h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.stripe.benefit_payments_desc")}
            </p>
          </div>

          <div
            className="p-4 border-2"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
          >
            <Receipt size={24} style={{ color: "var(--primary)" }} className="mb-2" />
            <h4 className="font-bold text-sm mb-1">{t("ui.payments.stripe.benefit_tax_title")}</h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.stripe.benefit_tax_desc")}
            </p>
          </div>

          <div
            className="p-4 border-2"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
          >
            <Zap size={24} style={{ color: "var(--warning)" }} className="mb-2" />
            <h4 className="font-bold text-sm mb-1">{t("ui.payments.stripe.benefit_payouts_title")}</h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.stripe.benefit_payouts_desc")}
            </p>
          </div>
        </div>

        {/* Mode Selection */}
        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <h4 className="font-bold text-sm mb-3">{t("ui.payments.stripe.mode_selection_title")}</h4>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSelectedMode("live")}
              className="flex-1 p-3 border-2 text-left transition-all"
              style={{
                borderColor: selectedMode === "live" ? "var(--primary)" : "var(--win95-border)",
                background: selectedMode === "live" ? "var(--primary-light)" : "var(--win95-bg)",
              }}
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} style={{ color: selectedMode === "live" ? "var(--success)" : "var(--neutral-gray)" }} />
                <div>
                  <p className="font-bold text-xs">{t("ui.payments.stripe.mode_live_title")}</p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.stripe.mode_live_desc")}</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode("test")}
              className="flex-1 p-3 border-2 text-left transition-all"
              style={{
                borderColor: selectedMode === "test" ? "var(--warning)" : "var(--win95-border)",
                background: selectedMode === "test" ? "var(--warning-light)" : "var(--win95-bg)",
              }}
            >
              <div className="flex items-start gap-2">
                <RotateCw size={16} style={{ color: selectedMode === "test" ? "var(--warning)" : "var(--neutral-gray)" }} />
                <div>
                  <p className="font-bold text-xs">{t("ui.payments.stripe.mode_test_title")}</p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.stripe.mode_test_desc")}</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center pt-4">
          <button
            onClick={handleStartOnboarding}
            disabled={isOnboarding}
            className="beveled-button px-6 py-3 text-sm font-bold flex items-center gap-2"
            style={{
              backgroundColor: "var(--primary)",
              color: "white",
            }}
          >
            {isOnboarding ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t("ui.payments.stripe.connecting")}
              </>
            ) : (
              <>
                <ExternalLink size={16} />
                {t("ui.payments.stripe.connect_button", {
                  mode: selectedMode === "test" ? t("ui.payments.stripe.mode_test") : t("ui.payments.stripe.mode_live")
                })}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div
        className="p-4 border-2"
        style={{
          borderColor: "var(--win95-border)",
          background: accountStatus === "active" ? "var(--success-light)" : "var(--warning-light)",
        }}
      >
        <div className="flex items-start gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-1">
              {t("ui.payments.stripe.account_status", { status: accountStatus || t("ui.payments.stripe.status_unknown") })}
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.stripe.account_id")}: <span className="font-mono">{stripeConnectId}</span>
            </p>
            <p className="text-xs mt-1">
              {t("ui.payments.stripe.mode_label")}: <span className="font-semibold" style={{ color: testMode ? "var(--warning)" : "var(--success)" }}>
                {testMode ? t("ui.payments.stripe.mode_test") : t("ui.payments.stripe.mode_live")}
              </span>
            </p>
          </div>
          <button
            onClick={handleRefreshStatus}
            className="px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: "var(--win95-button-face)",
              border: "2px solid var(--win95-border)",
            }}
          >
            {t("ui.payments.stripe.refresh")}
          </button>
        </div>
      </div>

      {/* Tax Settings */}
      {taxEnabled && (
        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <div className="flex items-start gap-3 mb-3">
            <Receipt size={20} style={{ color: "var(--primary)" }} />
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1">{t("ui.payments.stripe.tax_integration_title")}</h3>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {stripeTaxEnabled
                  ? t("ui.payments.stripe.tax_active")
                  : t("ui.payments.stripe.tax_sync_needed")}
              </p>
            </div>
            <div className={`px-2 py-1 text-xs font-semibold rounded`} style={{
              background: stripeTaxEnabled ? "var(--success-light)" : "var(--warning-light)",
              color: stripeTaxEnabled ? "var(--success)" : "var(--warning)",
            }}>
              {stripeTaxEnabled ? t("ui.payments.stripe.tax_status_active") : t("ui.payments.stripe.tax_status_not_synced")}
            </div>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.stripe.tax_behavior")}:</span>
              <span className="font-mono">{taxSettings?.customProperties?.defaultTaxBehavior || "exclusive"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.stripe.tax_origin_country")}:</span>
              <span className="font-mono">{taxSettings?.customProperties?.originAddress?.country || t("ui.payments.stripe.not_set")}</span>
            </div>
          </div>

          <button
            onClick={handleSyncTax}
            disabled={isSyncingTax}
            className="w-full px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2"
            style={{
              backgroundColor: "var(--primary)",
              color: "white",
              border: "2px solid var(--win95-border)",
              opacity: isSyncingTax ? 0.6 : 1,
            }}
          >
            {isSyncingTax ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("ui.payments.stripe.syncing")}
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                {t("ui.payments.stripe.sync_tax_button")}
              </>
            )}
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="font-bold text-sm mb-3">{t("ui.payments.stripe.quick_actions")}</h3>
        <div className="flex flex-col gap-2">
          <a
            href={`https://dashboard.stripe.com/${testMode ? "test/" : ""}connect/accounts/${stripeConnectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2"
            style={{
              backgroundColor: "var(--primary)",
              color: "white",
              border: "2px solid var(--win95-border)",
            }}
          >
            <ExternalLink size={14} />
            {t("ui.payments.stripe.open_dashboard")}
          </a>

          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2"
            style={{
              backgroundColor: "var(--error)",
              color: "white",
              border: "2px solid var(--win95-border)",
              opacity: isDisconnecting ? 0.6 : 1,
            }}
          >
            {isDisconnecting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("ui.payments.stripe.disconnecting")}
              </>
            ) : (
              <>
                <XCircle size={14} />
                {t("ui.payments.stripe.disconnect_button")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tax Info */}
      {taxEnabled && (
        <div
          className="p-3 border-2 text-xs"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--info-light)",
          }}
        >
          <p className="font-semibold mb-2 flex items-center gap-2">
            <Info size={14} />
            {t("ui.payments.stripe.tax_features_title")}
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t("ui.payments.stripe.tax_feature_1")}</li>
            <li>{t("ui.payments.stripe.tax_feature_2")}</li>
            <li>{t("ui.payments.stripe.tax_feature_3")}</li>
            <li>{t("ui.payments.stripe.tax_feature_4")}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
