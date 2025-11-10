"use client";

import { useState, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
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
  Info,
  FileText,
} from "lucide-react";
import { StripeInvoiceSection } from "./stripe-invoice-section";
import { usePostHog } from "posthog-js/react";

interface StripeConnectSectionProps {
  organizationId: Id<"organizations">;
  organization?: Doc<"organizations"> | null;
}

export function StripeConnectSection({ organizationId, organization }: StripeConnectSectionProps) {
  const { sessionId } = useAuth();
  const posthog = usePostHog();
  const notification = useNotification();
  const { t } = useNamespaceTranslations("ui.payments");
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"test" | "live">("live"); // Default to live mode
  const startOnboarding = useMutation(api.stripeConnect.startOnboarding);
  const getOnboardingUrl = useAction(api.stripeConnect.getStripeOnboardingUrl);
  const refreshAccountStatus = useMutation(api.stripeConnect.refreshAccountStatus);
  const refreshAccountStatusSync = useAction(api.stripeConnect.refreshAccountStatusSync);
  const disconnectStripe = useMutation(api.stripeConnect.disconnectStripeConnect);
  const handleOAuthCallbackMutation = useMutation(api.stripeConnect.handleOAuthCallback);

  // Get Stripe Connect config from payment providers
  const stripeProvider = organization?.paymentProviders?.find(
    (p) => p.providerCode === "stripe-connect"
  );

  const stripeConnectId = stripeProvider?.accountId;
  const accountStatus = stripeProvider?.status;
  const onboardingCompleted = stripeProvider?.metadata?.onboardingCompleted ?? false;
  const testMode = stripeProvider?.isTestMode ?? false; // Show actual mode

  // Get tax settings
  const taxSettings = useQuery(
    api.organizationTaxSettings.getTaxSettings,
    sessionId && organizationId
      ? { sessionId, organizationId }
      : "skip"
  );


  const taxEnabled = taxSettings?.customProperties?.taxEnabled ?? false;

  // Handle OAuth callback from Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code'); // OAuth authorization code
    const state = urlParams.get('state'); // Organization ID (CSRF protection)

    // Handle OAuth callback (detected by presence of code and state params)
    if (code && state && sessionId) {
      console.log('Processing Stripe OAuth callback...');

      // Complete OAuth connection
      handleOAuthCallbackMutation({
        sessionId,
        organizationId: state as Id<"organizations">,
        code,
        state,
        isTestMode: selectedMode === "test", // Use selected mode
      }).then(() => {
        console.log('OAuth callback processed successfully');

        // Track Stripe connection
        posthog?.capture("stripe_connected", {
          organization_id: state,
          is_test_mode: selectedMode === "test",
          connection_method: "oauth",
        });

        // Check if we should reopen the payments window
        const shouldReopenPayments = localStorage.getItem('stripe_oauth_reopen_payments');

        // Clean up URL parameters
        const cleanUrl = shouldReopenPayments
          ? `${window.location.pathname}?openWindow=payments`
          : window.location.pathname;

        window.history.replaceState({}, '', cleanUrl);

        // Clear the localStorage flag
        localStorage.removeItem('stripe_oauth_reopen_payments');

        // Refresh status after a delay to show the connected account
        setTimeout(() => {
          refreshAccountStatus({
            sessionId,
            organizationId,
          }).catch(err => console.error('Failed to refresh after OAuth:', err));
        }, 2000);
      }).catch(err => {
        console.error('Failed to process OAuth callback:', err);
        alert('Failed to connect Stripe account. Please try again.');
        localStorage.removeItem('stripe_oauth_reopen_payments');

        posthog?.capture("$exception", {
          error_type: "stripe_connection_failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          organization_id: state,
        });
      });

      return;
    }
  }, [sessionId, organizationId, selectedMode, refreshAccountStatus, handleOAuthCallbackMutation]);

  const handleStartOnboarding = async () => {
    if (!sessionId) return;

    setIsOnboarding(true);
    try {
      // Store flag to reopen payments window after OAuth completes
      localStorage.setItem('stripe_oauth_reopen_payments', 'true');

      // OAuth redirect URI - must be clean (no query params)
      const returnUrl = window.location.origin;
      const refreshUrl = window.location.origin;

      const isTestMode = selectedMode === "test";

      // Step 1: Create the Stripe account
      await startOnboarding({
        sessionId,
        organizationId,
        refreshUrl,
        returnUrl,
        isTestMode, // Pass organization's mode preference
      });

      // Step 2: Wait for account creation, then get the onboarding URL
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Get the onboarding URL and redirect
      const result = await getOnboardingUrl({
        sessionId,
        organizationId,
        refreshUrl,
        returnUrl,
        isTestMode, // Pass organization's mode preference
      });

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

    setIsRefreshing(true);
    try {
      const result = await refreshAccountStatusSync({
        sessionId,
        organizationId,
      });

      // Show success notification with tax status details
      if (result.taxStatus === 'active') {
        if (result.taxSyncResult?.settingsFound) {
          notification.success(
            'Settings Refreshed',
            `✅ Stripe Tax is active and synced. Tax calculations are enabled for checkout.`,
            true
          );
        } else {
          notification.info(
            'Tax Settings Not Found',
            `Stripe Tax is active but local settings not found. Please configure tax settings first.`,
            true
          );
        }
      } else {
        notification.info(
          'Settings Refreshed',
          `Stripe Tax is ${result.taxStatus || 'not configured'}. Enable Stripe Tax in your Stripe Dashboard to use automatic tax calculations.`,
          true
        );
      }
    } catch (error) {
      console.error("Failed to refresh status:", error);
      notification.error(
        'Refresh Failed',
        error instanceof Error ? error.message : 'Failed to refresh settings from Stripe',
        true
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;

    const confirmed = window.confirm(
      "Are you sure you want to disconnect your Stripe account? This will stop all payment processing for this organization."
    );

    if (!confirmed) return;

    setIsDisconnecting(true);
    try {
      await disconnectStripe({
        sessionId,
        organizationId,
      });

      // Track Stripe disconnection
      posthog?.capture("stripe_disconnected", {
        organization_id: organizationId,
        account_status: accountStatus,
        was_test_mode: testMode,
      });

      // Show success message
      alert("Stripe account disconnected successfully");
    } catch (error) {
      console.error("Failed to disconnect:", error);
      alert("Failed to disconnect Stripe account. Please try again.");

      posthog?.capture("$exception", {
        error_type: "stripe_disconnection_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        organization_id: organizationId,
      });
    } finally {
      setIsDisconnecting(false);
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

  const getStatusText = () => {
    switch (accountStatus) {
      case "active":
        return t("ui.payments.stripe_connect.status_text.active");
      case "pending":
        return t("ui.payments.stripe_connect.status_text.pending");
      case "restricted":
        return t("ui.payments.stripe_connect.status_text.restricted");
      case "disabled":
        return t("ui.payments.stripe_connect.status_text.disabled");
      default:
        return t("ui.payments.stripe_connect.status_text.not_connected");
    }
  };

  // Not connected state
  if (!stripeConnectId) {
    return (
      <div className="space-y-6">
        {/* Hero Section */}
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
            <h4 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
              {t("ui.payments.stripe.benefit_payments_title")}
            </h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.stripe.benefit_payments_desc")}
            </p>
          </div>

          <div
            className="p-4 border-2"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
          >
            <Zap size={24} style={{ color: "var(--warning)" }} className="mb-2" />
            <h4 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
              {t("ui.payments.stripe.benefit_payouts_title")}
            </h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.stripe.benefit_payouts_desc")}
            </p>
          </div>

          <div
            className="p-4 border-2"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
          >
            <CheckCircle2 size={24} style={{ color: "var(--primary)" }} className="mb-2" />
            <h4 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
              {t("ui.payments.stripe_connect.benefit_secure_title")}
            </h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.stripe_connect.benefit_secure_desc")}
            </p>
          </div>
        </div>

        {/* Mode Selection */}
        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <h4 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
            {t("ui.payments.stripe.mode_selection_title")}
          </h4>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedMode("live")}
              className="flex-1 p-3 border-2 text-left transition-all"
              style={{
                borderColor: selectedMode === "live" ? "var(--primary)" : "var(--win95-border)",
                background: selectedMode === "live" ? "var(--primary-light)" : "var(--win95-bg)",
                borderTopColor: selectedMode === "live" ? "var(--primary)" : "var(--win95-button-dark)",
                borderLeftColor: selectedMode === "live" ? "var(--primary)" : "var(--win95-button-dark)",
                borderBottomColor: selectedMode === "live" ? "var(--primary)" : "var(--win95-button-light)",
                borderRightColor: selectedMode === "live" ? "var(--primary)" : "var(--win95-button-light)",
              }}
            >
              <div className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  style={{ color: selectedMode === "live" ? "var(--success)" : "var(--neutral-gray)" }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-bold text-xs mb-1" style={{ color: "var(--win95-text)" }}>
                    {t("ui.payments.stripe.mode_live_title")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.payments.stripe.mode_live_desc")}
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedMode("test")}
              className="flex-1 p-3 border-2 text-left transition-all"
              style={{
                borderColor: selectedMode === "test" ? "var(--warning)" : "var(--win95-border)",
                background: selectedMode === "test" ? "var(--warning-light)" : "var(--win95-bg)",
                borderTopColor: selectedMode === "test" ? "var(--warning)" : "var(--win95-button-dark)",
                borderLeftColor: selectedMode === "test" ? "var(--warning)" : "var(--win95-button-dark)",
                borderBottomColor: selectedMode === "test" ? "var(--warning)" : "var(--win95-button-light)",
                borderRightColor: selectedMode === "test" ? "var(--warning)" : "var(--win95-button-light)",
              }}
            >
              <div className="flex items-start gap-2">
                <RotateCw
                  size={16}
                  style={{ color: selectedMode === "test" ? "var(--warning)" : "var(--neutral-gray)" }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-bold text-xs mb-1" style={{ color: "var(--win95-text)" }}>
                    {t("ui.payments.stripe.mode_test_title")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.payments.stripe.mode_test_desc")}
                  </p>
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
            className="px-6 py-3 text-sm font-bold flex items-center gap-2"
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

        {/* Note */}
        <div
          className="p-3 border-2 text-xs"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--info-light)",
            color: "var(--win95-text)",
          }}
        >
          <p className="font-semibold mb-1">{t("ui.payments.stripe_connect.note_title")}</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <strong>{t("ui.payments.stripe_connect.note_existing_title")}</strong> {t("ui.payments.stripe_connect.note_existing_desc")}
            </li>
            <li>
              <strong>{t("ui.payments.stripe_connect.note_new_title")}</strong> {t("ui.payments.stripe_connect.note_new_desc")}
            </li>
            <li>
              {t("ui.payments.stripe_connect.note_requirements")}
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="space-y-6">
      {/* Status Card */}
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
            <h3 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
              {t("ui.payments.stripe_connect.account_status_label")}: {accountStatus || t("ui.payments.stripe.status_unknown")}
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {getStatusText()}
            </p>
          </div>
          <button
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
            className="px-3 py-1 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
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
            {isRefreshing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {t("ui.payments.stripe.syncing")}
              </>
            ) : (
              <>
                <RotateCw className="w-3 h-3" />
                {t("ui.payments.stripe.refresh")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Account Details */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
          {t("ui.payments.stripe_connect.account_details_title")}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.stripe.account_id")}:</span>
            <span className="font-mono" style={{ color: "var(--win95-text)" }}>
              {stripeConnectId}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.stripe_connect.onboarding_status")}:</span>
            <span className="font-semibold" style={{ color: onboardingCompleted ? "var(--success)" : "var(--warning)" }}>
              {onboardingCompleted ? t("ui.payments.stripe_connect.onboarding_complete") : t("ui.payments.stripe_connect.onboarding_incomplete")}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.stripe.mode_label")}:</span>
            <span className="font-semibold" style={{ color: testMode ? "var(--warning)" : "var(--success)" }}>
              {testMode ? t("ui.payments.stripe.mode_test") : t("ui.payments.stripe.mode_live")}
            </span>
          </div>
        </div>
      </div>

      {/* Onboarding incomplete warning */}
      {!onboardingCompleted && (
        <div
          className="p-4 border-2 flex items-start gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--warning)",
            color: "var(--win95-text)",
          }}
        >
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">{t("ui.payments.stripe_connect.onboarding_incomplete_title")}</p>
            <p className="text-xs mt-1">
              {t("ui.payments.stripe_connect.onboarding_incomplete_desc")}
            </p>
            <button
              onClick={handleStartOnboarding}
              disabled={isOnboarding}
              className="mt-3 px-4 py-2 text-xs font-semibold flex items-center gap-2"
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
              {isOnboarding ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t("ui.payments.stripe_connect.loading")}
                </>
              ) : (
                <>
                  <ExternalLink size={14} />
                  {t("ui.payments.stripe_connect.complete_onboarding")}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
          {t("ui.payments.stripe.quick_actions")}
        </h3>
        <div className="flex flex-col gap-2">
          <a
            href={`https://dashboard.stripe.com/${testMode ? "test/" : ""}connect/accounts/${stripeConnectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2"
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
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
              opacity: isDisconnecting ? 0.6 : 1,
              cursor: isDisconnecting ? "not-allowed" : "pointer",
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

      {/* Tax Settings Section */}
      {stripeConnectId && (
        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Receipt size={20} style={{ color: "var(--primary)" }} />
            <h3 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
              {t("ui.payments.stripe_connect.tax_settings_title")}
            </h3>
          </div>

          {taxEnabled ? (
            <>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.stripe.tax_behavior")}:</span>
                  <span className="font-mono" style={{ color: "var(--win95-text)" }}>
                    {taxSettings?.customProperties?.defaultTaxBehavior || "exclusive"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.stripe_connect.tax_code")}:</span>
                  <span className="font-mono" style={{ color: "var(--win95-text)" }}>
                    {taxSettings?.customProperties?.defaultTaxCode || "txcd_10000000"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.stripe.tax_origin_country")}:</span>
                  <span className="font-mono" style={{ color: "var(--win95-text)" }}>
                    {taxSettings?.customProperties?.originAddress?.country || t("ui.payments.stripe.not_set")}
                  </span>
                </div>
              </div>

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
                <ul className="list-disc list-inside space-y-1" style={{ color: "var(--neutral-gray)" }}>
                  <li>{t("ui.payments.stripe.tax_feature_1")}</li>
                  <li>{t("ui.payments.stripe.tax_feature_2")}</li>
                  <li>{t("ui.payments.stripe.tax_feature_3")}</li>
                  <li>{t("ui.payments.stripe.tax_feature_4")}</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.payments.stripe_connect.tax_not_configured")}
              </p>
              <button
                onClick={() => {
                  // TODO: Open organization tax settings modal or navigate to settings
                  alert(t("ui.payments.stripe_connect.tax_config_coming_soon"));
                }}
                className="w-full px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2"
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
                <Receipt size={14} />
                {t("ui.payments.stripe_connect.setup_tax")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invoice Settings Section */}
      {stripeConnectId && (
        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText size={20} style={{ color: "var(--primary)" }} />
            <h3 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
              {t("ui.payments.stripe_connect.invoice_settings_title")}
            </h3>
          </div>

          <StripeInvoiceSection
            organizationId={organizationId}
            organization={organization}
          />
        </div>
      )}
    </div>
  );
}
