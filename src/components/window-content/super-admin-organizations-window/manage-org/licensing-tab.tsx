"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  Key,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle,
  Shield,
  Database,
  Users,
  Zap,
  Crown,
  Settings,
  CreditCard,
  Trash2,
} from "lucide-react";
import { ManualSubscriptionGrant } from "./components/manual-subscription-grant";
import { TokenPackIssuance } from "./components/token-pack-issuance";
import { CreditGrantIssuance } from "./components/credit-grant-issuance";
import { ManualGrantsHistory } from "./components/manual-grants-history";
import { LicenseOverview } from "../../../licensing/license-overview";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const apiAny: any = require("../../../../../convex/_generated/api").api;

const LEGACY_PRICING_MANUAL_REVEAL_FEATURE_KEY = "storeLegacyPricingManualReveal";
const LEGACY_COMPATIBILITY_TIERS = new Set([
  "pro",
  "agency",
  "scale",
  "enterprise",
  "starter",
  "professional",
  "community",
]);

interface LicensingTabProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

export function LicensingTab({ organizationId, sessionId }: LicensingTabProps) {
  const { t } = useNamespaceTranslations("ui.super_admin.manage_org.licensing");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const fullKey = `ui.super_admin.manage_org.licensing.${key}`;
    const translated = t(fullKey, params);
    return translated === fullKey ? fallback : translated;
  };
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isUpdatingLegacyPricing, setIsUpdatingLegacyPricing] = useState(false);
  const [legacyPricingStatusMessage, setLegacyPricingStatusMessage] = useState<string | null>(null);
  const unsafeUseQuery = useQuery as unknown as (
    queryRef: unknown,
    args: unknown
  ) => unknown;

  // Fetch organization data
  const organization = unsafeUseQuery(
    apiAny.organizations.getById,
    organizationId && sessionId ? { organizationId, sessionId } : "skip"
  ) as any;

  // Fetch app availabilities
  const appAvailabilities = unsafeUseQuery(
    apiAny.appAvailability.getOrgAvailabilities,
    organizationId ? { organizationId } : "skip"
  ) as any[] | undefined;

  // Fetch all apps
  const allApps = unsafeUseQuery(
    apiAny.appAvailability.listAllApps,
    sessionId ? { sessionId } : "skip"
  ) as any[] | undefined;

  // Fetch AI subscription
  const aiSubscription = unsafeUseQuery(
    apiAny.ai.billing.getSubscriptionStatus,
    organizationId ? { organizationId } : "skip"
  ) as any;
  const license = unsafeUseQuery(
    apiAny.licensing.helpers.getLicense,
    organizationId ? { organizationId } : "skip"
  ) as { planTier?: string; features?: Record<string, unknown> } | undefined;

  // Local state for quota overrides
  const [quotaOverrides, setQuotaOverrides] = useState({
    maxUsers: 0,
    maxStorage: 0, // in GB
    maxAIRequests: 0, // per month
    customLimits: {} as Record<string, number>,
  });

  // Stripe subscription management state
  const [clearCustomerId, setClearCustomerId] = useState(false);
  const [resetPlanToFree, setResetPlanToFree] = useState(false);
  const [isClearingSubscription, setIsClearingSubscription] = useState(false);
  const [clearSubscriptionStatus, setClearSubscriptionStatus] = useState<string | null>(null);

  // Mutations
  const setAppAvailability = useMutation(apiAny.appAvailability.setAppAvailability);
  const clearStripeSubscription = useMutation(apiAny.organizations.clearStripeSubscription);
  const toggleFeature = useMutation(apiAny.licensing.helpers.toggleFeature);

  // Initialize quota overrides when org loads
  useState(() => {
    if (organization) {
      // TODO: Load from organization settings when implemented
      setQuotaOverrides({
        maxUsers: 0, // 0 = unlimited
        maxStorage: 0, // 0 = unlimited
        maxAIRequests: 0, // 0 = unlimited
        customLimits: {},
      });
    }
  });

  const handleSaveQuotas = async () => {
    if (!sessionId || !organizationId) return;

    setIsSaving(true);
    setSaveStatus(null);

    try {
      // TODO: Implement quota saving mutation
      // await updateOrganizationQuotas({
      //   sessionId,
      //   organizationId,
      //   quotas: quotaOverrides,
      // });

      setSaveStatus(" Quota limits saved successfully");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Failed to save quotas:", error);
      setSaveStatus(" Failed to save quota limits");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearStripeSubscription = async () => {
    if (!sessionId || !organizationId) return;

    // Confirm action
    const confirmMessage = `Are you sure you want to clear Stripe subscription data?\n\n${
      clearCustomerId ? "• Customer ID will also be cleared\n" : ""
    }${resetPlanToFree ? "• Plan will be reset to FREE\n" : ""}\n\nThis should only be done if the subscription was already deleted in Stripe.`;

    if (!confirm(confirmMessage)) return;

    setIsClearingSubscription(true);
    setClearSubscriptionStatus(null);

    try {
      const result = await clearStripeSubscription({
        sessionId,
        organizationId,
        clearCustomerId,
        resetPlan: resetPlanToFree,
      });

      setClearSubscriptionStatus(` ${result.message}`);
      // Reset checkboxes
      setClearCustomerId(false);
      setResetPlanToFree(false);
      setTimeout(() => setClearSubscriptionStatus(null), 5000);
    } catch (error) {
      console.error("Failed to clear subscription:", error);
      setClearSubscriptionStatus(` Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsClearingSubscription(false);
    }
  };

  const handleToggleApp = async (appId: Id<"apps">, currentlyAvailable: boolean) => {
    if (!sessionId) return;

    try {
      await setAppAvailability({
        sessionId,
        organizationId,
        appId,
        isAvailable: !currentlyAvailable,
      });
    } catch (error) {
      console.error("Failed to toggle app:", error);
      alert(
        `${tx("alerts.update_app_availability_failed", "Failed to update app availability:")} ${
          error instanceof Error ? error.message : ""
        }`
      );
    }
  };

  const currentPlanTier = typeof license?.planTier === "string"
    ? license.planTier.toLowerCase()
    : typeof organization?.plan === "string"
      ? organization.plan.toLowerCase()
      : "free";
  const hasLegacyPlanAccess =
    Boolean(organization?.stripeSubscriptionId) || LEGACY_COMPATIBILITY_TIERS.has(currentPlanTier);
  const manualRevealEnabled = Boolean(
    ((license as { features?: Record<string, unknown> } | undefined)?.features ?? {})[
      LEGACY_PRICING_MANUAL_REVEAL_FEATURE_KEY
    ]
  );
  const legacyPricingStatus = hasLegacyPlanAccess
    ? "compatibility"
    : manualRevealEnabled
      ? "revealed"
      : "hidden";

  const handleToggleLegacyPricing = async () => {
    if (!sessionId || !organizationId) {
      return;
    }
    setIsUpdatingLegacyPricing(true);
    setLegacyPricingStatusMessage(null);
    try {
      await toggleFeature({
        sessionId,
        organizationId,
        featureKey: LEGACY_PRICING_MANUAL_REVEAL_FEATURE_KEY,
        enabled: !manualRevealEnabled,
      });
      setLegacyPricingStatusMessage(
        !manualRevealEnabled
          ? "Manual reveal override enabled."
          : "Manual reveal override disabled."
      );
    } catch (error) {
      console.error("Failed to update legacy pricing override:", error);
      setLegacyPricingStatusMessage(
        `Failed to update override: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsUpdatingLegacyPricing(false);
    }
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
      </div>
    );
  }

  // Check which apps are enabled for this org
  const enabledAppIds = new Set(
    appAvailabilities?.filter(a => a.isAvailable).map(a => a.appId) || []
  );

  return (
    <div className="space-y-6">
      {/* License Overview - NEW Phase 1 Component */}
      <LicenseOverview
        organizationId={organizationId}
        sessionId={sessionId}
        editable={true}
      />

      <div
        className="border p-4"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg-elevated)",
        }}
      >
        <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <Settings size={14} />
          Legacy Pricing Visibility
        </h4>
        <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
          Authoritative control for Store legacy pricing visibility. Quick actions in the org list use this same flag.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs" style={{ color: "var(--window-document-text)" }}>Effective status:</span>
          <span
            className="inline-flex items-center px-2 py-1 text-xs font-bold border"
            style={{
              background:
                legacyPricingStatus === "compatibility"
                  ? "var(--success)"
                  : legacyPricingStatus === "revealed"
                    ? "var(--warning)"
                    : "var(--neutral-gray)",
              color: "white",
              borderColor:
                legacyPricingStatus === "compatibility"
                  ? "var(--success)"
                  : legacyPricingStatus === "revealed"
                    ? "var(--warning)"
                    : "var(--neutral-gray)",
            }}
          >
            {legacyPricingStatus === "compatibility"
              ? "Compatibility"
              : legacyPricingStatus === "revealed"
                ? "Revealed"
                : "Hidden"}
          </span>
          <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {hasLegacyPlanAccess
              ? "Compatibility is automatic for legacy-access organizations."
              : "Status follows manual reveal override."}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleLegacyPricing}
            disabled={isUpdatingLegacyPricing}
            className="beveled-button px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          >
            {isUpdatingLegacyPricing ? <Loader2 size={12} className="animate-spin" /> : <Settings size={12} />}
            {manualRevealEnabled ? "Disable manual reveal override" : "Enable manual reveal override"}
          </button>
          <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Override flag: {manualRevealEnabled ? "enabled" : "disabled"}
          </span>
        </div>

        {legacyPricingStatusMessage ? (
          <p className="text-xs mt-2" style={{ color: "var(--window-document-text)" }}>
            {legacyPricingStatusMessage}
          </p>
        ) : null}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            <Key size={16} />
            {tx("header.title", "Licensing & Quotas Management")}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {tx(
              "header.subtitle",
              "Override licensing limits and control app access for this organization"
            )}
          </p>
        </div>
        <span
          className="inline-flex items-center px-2 py-1 text-xs font-bold"
          style={{
            backgroundColor: "var(--error)",
            color: "white",
            border: "1px solid var(--error)",
          }}
        >
          <Crown size={10} className="mr-1" />
          {tx("header.super_admin_override", "SUPER ADMIN OVERRIDE")}
        </span>
      </div>

      {/* AI Subscription Info */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg-elevated)",
        }}
      >
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <Zap size={14} />
          {tx("subscription.title", "AI Subscription Status")}
        </h4>
        {aiSubscription && aiSubscription.hasSubscription && aiSubscription.tier && aiSubscription.status ? (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span style={{ color: "var(--neutral-gray)" }}>{tx("subscription.tier_label", "Tier:")}</span>
              <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                {aiSubscription.tier === "standard" && "Standard (€49/month)"}
                {aiSubscription.tier === "privacy-enhanced" && "Privacy-Enhanced (€49/month)"}
                {aiSubscription.tier === "private-llm" && `Private LLM (€${aiSubscription.privateLLMTier === "starter" ? "2,500" : aiSubscription.privateLLMTier === "professional" ? "5,000" : "12,000"}/month)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--neutral-gray)" }}>{tx("subscription.status_label", "Status:")}</span>
              <span
                className="font-bold px-2 py-0.5"
                style={{
                  background: aiSubscription.status === "active" ? "var(--success)" : "var(--error)",
                  color: "white",
                }}
              >
                {aiSubscription.status.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--neutral-gray)" }}>
                {tx("subscription.included_tokens_label", "Included Tokens (monthly):")}
              </span>
              <span className="font-mono" style={{ color: "var(--window-document-text)" }}>
                {aiSubscription.includedTokensRemaining.toLocaleString()} / {aiSubscription.includedTokensTotal.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <AlertCircle size={16} style={{ color: "var(--warning)" }} />
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "subscription.none_message",
                "No active AI subscription. Organization is using BYOK (Bring Your Own Key) mode."
              )}
            </p>
          </div>
        )}
      </div>

      {/* NEW: Manual Subscription Grant */}
      <ManualSubscriptionGrant
        organizationId={organizationId}
        sessionId={sessionId}
      />

      {/* NEW: Token Pack Issuance */}
      <TokenPackIssuance
        organizationId={organizationId}
        sessionId={sessionId}
      />

      {/* Credit Grant Issuance */}
      <CreditGrantIssuance
        organizationId={organizationId}
        sessionId={sessionId}
      />

      {/* NEW: Manual Grants History */}
      <ManualGrantsHistory
        organizationId={organizationId}
        sessionId={sessionId}
      />

      {/* Stripe Subscription Management */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: "var(--error)",
          background: "rgba(239, 68, 68, 0.05)",
        }}
      >
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <CreditCard size={14} />
          {tx("stripe.title", "Stripe Subscription Management")}
          <span
            className="ml-2 px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: "var(--error)", color: "white" }}
          >
            {tx("stripe.danger_zone", "DANGER ZONE")}
          </span>
        </h4>

        {/* Current Stripe Data Display */}
        <div className="space-y-2 text-xs mb-4 p-3 border" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}>
          <div className="flex justify-between">
            <span style={{ color: "var(--neutral-gray)" }}>
              {tx("stripe.customer_id_label", "Stripe Customer ID:")}
            </span>
            <span className="font-mono" style={{ color: organization.stripeCustomerId ? "var(--window-document-text)" : "var(--neutral-gray)" }}>
              {organization.stripeCustomerId || tx("stripe.not_set", "Not set")}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--neutral-gray)" }}>
              {tx("stripe.subscription_id_label", "Stripe Subscription ID:")}
            </span>
            <span className="font-mono" style={{ color: organization.stripeSubscriptionId ? "var(--success)" : "var(--neutral-gray)" }}>
              {organization.stripeSubscriptionId || tx("stripe.no_active_subscription", "No active subscription")}
            </span>
          </div>
          <div className="px-4 py-2" style={{
            backgroundColor: '#FFF9E5',
            color: '#7C6400',
            border: '2px solid #FFEB99',
            borderRadius: '4px'
          }}>
            <p className="text-xs font-semibold mb-1">
              {tx("stripe.plan_tier_notice_title", "Plan tier managed in License Overview below")}
            </p>
            <p className="text-xs">
              {tx(
                "stripe.plan_tier_notice_body",
                "Use the License Overview section to view and change the organization's plan tier."
              )}
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 mb-4 p-2" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--error)" }} />
          <p className="text-xs" style={{ color: "var(--window-document-text)" }}>
            <strong>{tx("stripe.warning_label", "Warning:")}</strong>{" "}
            {tx(
              "stripe.warning_body",
              "Only clear subscription data if you've already deleted the subscription in the Stripe Dashboard. This operation syncs Convex with Stripe's state."
            )}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={clearCustomerId}
              onChange={(e) => setClearCustomerId(e.target.checked)}
              className="w-4 h-4"
            />
            <span style={{ color: "var(--window-document-text)" }}>
              {tx("stripe.option_clear_customer_id", "Also clear Customer ID (use if recreating customer)")}
            </span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={resetPlanToFree}
              onChange={(e) => setResetPlanToFree(e.target.checked)}
              className="w-4 h-4"
            />
            <span style={{ color: "var(--window-document-text)" }}>
              {tx("stripe.option_reset_plan", "Reset plan to FREE")}
            </span>
          </label>
        </div>

        {/* Status Message */}
        {clearSubscriptionStatus && (
          <div
            className="mb-4 p-2 text-xs flex items-center gap-2"
            style={{
              background: clearSubscriptionStatus.startsWith("") ? "var(--success)" : "var(--error)",
              color: "white",
            }}
          >
            {clearSubscriptionStatus.startsWith("") ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {clearSubscriptionStatus}
          </div>
        )}

        {/* Clear Button */}
        <button
          onClick={handleClearStripeSubscription}
          disabled={isClearingSubscription || !organization.stripeSubscriptionId}
          className="beveled-button px-4 py-2 text-xs font-bold flex items-center gap-2"
          style={{
            background: organization.stripeSubscriptionId ? "var(--error)" : "var(--neutral-gray)",
            color: "white",
            opacity: isClearingSubscription || !organization.stripeSubscriptionId ? 0.5 : 1,
            cursor: organization.stripeSubscriptionId ? "pointer" : "not-allowed",
          }}
        >
          {isClearingSubscription ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {tx("stripe.clearing", "Clearing...")}
            </>
          ) : (
            <>
              <Trash2 size={14} />
              {tx("stripe.clear_subscription_button", "Clear Subscription Data")}
            </>
          )}
        </button>

        {!organization.stripeSubscriptionId && (
          <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
            {tx("stripe.no_subscription_to_clear", "No subscription ID to clear.")}
          </p>
        )}
      </div>

      {/* Quota Overrides */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg-elevated)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            <Settings size={14} />
            {tx("quota.title", "Quota & Limits Override")}
          </h4>
          <button
            onClick={handleSaveQuotas}
            disabled={isSaving}
            className="beveled-button px-3 py-1.5 text-xs font-bold flex items-center gap-1"
            style={{
              background: "var(--success)",
              color: "white",
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                {tx("quota.saving", "Saving...")}
              </>
            ) : (
              <>
                <Save size={12} />
                {tx("quota.save_button", "Save Quotas")}
              </>
            )}
          </button>
        </div>

        {saveStatus && (
          <div
            className="mb-4 p-2 text-xs flex items-center gap-2"
            style={{
              background: saveStatus.startsWith("") ? "var(--success)" : "var(--error)",
              color: "white",
            }}
          >
            {saveStatus.startsWith("") ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {saveStatus}
          </div>
        )}

        <div className="space-y-4">
          {/* Max Users */}
          <div>
            <label className="block text-xs font-bold mb-1.5 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              <Users size={12} />
              {tx("quota.max_users_label", "Maximum Users")}
            </label>
            <input
              type="number"
              min="0"
              value={quotaOverrides.maxUsers}
              onChange={(e) =>
                setQuotaOverrides({ ...quotaOverrides, maxUsers: parseInt(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
              placeholder={tx("quota.unlimited_placeholder", "0 = Unlimited")}
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {tx("quota.max_users_hint_prefix", "Set to 0 for unlimited users. Current active users:")}{" "}
              {organization.members?.length || 0}
            </p>
          </div>

          {/* Max Storage */}
          <div>
            <label className="block text-xs font-bold mb-1.5 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              <Database size={12} />
              {tx("quota.max_storage_label", "Maximum Storage (GB)")}
            </label>
            <input
              type="number"
              min="0"
              value={quotaOverrides.maxStorage}
              onChange={(e) =>
                setQuotaOverrides({ ...quotaOverrides, maxStorage: parseInt(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
              placeholder={tx("quota.unlimited_placeholder", "0 = Unlimited")}
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {tx("quota.max_storage_hint", "Set to 0 for unlimited storage. Used for media library files.")}
            </p>
          </div>

          {/* Max AI Requests */}
          <div>
            <label className="block text-xs font-bold mb-1.5 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              <Zap size={12} />
              {tx("quota.max_ai_requests_label", "Maximum AI Requests (per month)")}
            </label>
            <input
              type="number"
              min="0"
              value={quotaOverrides.maxAIRequests}
              onChange={(e) =>
                setQuotaOverrides({ ...quotaOverrides, maxAIRequests: parseInt(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
              placeholder={tx("quota.unlimited_placeholder", "0 = Unlimited")}
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "quota.max_ai_requests_hint",
                "Set to 0 for unlimited AI requests. Only applies if using Platform Key mode."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* App Access Control */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg-elevated)",
        }}
      >
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <Shield size={14} />
          {tx("app_access.title", "App Access Control")}
        </h4>
        <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
          {tx(
            "app_access.subtitle",
            "Control which apps this organization can access. Green = enabled, Red = disabled."
          )}
        </p>

        {!allApps ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allApps.map((app) => {
              const isEnabled = enabledAppIds.has(app._id);
              return (
                <button
                  key={app._id}
                  onClick={() => handleToggleApp(app._id, isEnabled)}
                  className="flex items-center justify-between p-3 border-2 text-left transition-colors hover:opacity-80"
                  style={{
                    borderColor: isEnabled ? "var(--success)" : "var(--error)",
                    background: isEnabled ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{app.icon}</span>
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        {app.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {app.code}
                      </p>
                    </div>
                  </div>
                  <span
                    className="px-2 py-1 text-xs font-bold"
                    style={{
                      background: isEnabled ? "var(--success)" : "var(--error)",
                      color: "white",
                    }}
                  >
                    {isEnabled
                      ? tx("app_access.enabled", "ENABLED")
                      : tx("app_access.disabled", "DISABLED")}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Deprecated Plans Notice */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: "var(--warning)",
          background: "rgba(251, 191, 36, 0.1)",
        }}
      >
        <div className="flex items-start gap-2">
          <AlertCircle size={16} style={{ color: "var(--warning)" }} />
          <div>
            <h4 className="text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
              {tx("deprecated.title", "Deprecated: Legacy Plan System")}
            </h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "deprecated.description",
                "The old plan system (free, pro, personal, business, enterprise) has been deprecated. Licensing is now controlled through:"
              )}
            </p>
            <ul className="text-xs mt-2 space-y-1 ml-4" style={{ color: "var(--neutral-gray)" }}>
              <li>
                • <strong>{tx("deprecated.item_ai_subscriptions_label", "AI Subscriptions")}</strong>{" "}
                {tx("deprecated.item_ai_subscriptions_text", "- Pay-per-tier AI access")}
              </li>
              <li>
                • <strong>{tx("deprecated.item_app_availability_label", "App Availability")}</strong>{" "}
                {tx("deprecated.item_app_availability_text", "- Granular app access control")}
              </li>
              <li>
                • <strong>{tx("deprecated.item_quota_overrides_label", "Quota Overrides")}</strong>{" "}
                {tx(
                  "deprecated.item_quota_overrides_text",
                  "- Manual limits for users, storage, API requests"
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
