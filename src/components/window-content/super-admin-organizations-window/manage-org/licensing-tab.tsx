"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
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
import { ManualGrantsHistory } from "./components/manual-grants-history";
import { LicenseOverview } from "../../../licensing/license-overview";

interface LicensingTabProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

export function LicensingTab({ organizationId, sessionId }: LicensingTabProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Fetch organization data
  const organization = useQuery(
    api.organizations.getById,
    organizationId && sessionId ? { organizationId, sessionId } : "skip"
  );

  // Fetch app availabilities
  const appAvailabilities = useQuery(
    api.appAvailability.getOrgAvailabilities,
    organizationId ? { organizationId } : "skip"
  );

  // Fetch all apps
  const allApps = useQuery(
    api.appAvailability.listAllApps,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch AI subscription
  const aiSubscription = useQuery(
    api.ai.billing.getSubscriptionStatus,
    organizationId ? { organizationId } : "skip"
  );

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
  const setAppAvailability = useMutation(api.appAvailability.setAppAvailability);
  const clearStripeSubscription = useMutation(api.organizations.clearStripeSubscription);

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
      alert("Failed to update app availability: " + (error instanceof Error ? error.message : ""));
    }
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
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

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <Key size={16} />
            Licensing & Quotas Management
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Override licensing limits and control app access for this organization
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
          SUPER ADMIN OVERRIDE
        </span>
      </div>

      {/* AI Subscription Info */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <Zap size={14} />
          AI Subscription Status
        </h4>
        {aiSubscription && aiSubscription.hasSubscription && aiSubscription.tier && aiSubscription.status ? (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span style={{ color: "var(--neutral-gray)" }}>Tier:</span>
              <span className="font-bold" style={{ color: "var(--win95-text)" }}>
                {aiSubscription.tier === "standard" && "Standard (€49/month)"}
                {aiSubscription.tier === "privacy-enhanced" && "Privacy-Enhanced (€49/month)"}
                {aiSubscription.tier === "private-llm" && `Private LLM (€${aiSubscription.privateLLMTier === "starter" ? "2,500" : aiSubscription.privateLLMTier === "professional" ? "5,000" : "12,000"}/month)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--neutral-gray)" }}>Status:</span>
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
              <span style={{ color: "var(--neutral-gray)" }}>Included Tokens (monthly):</span>
              <span className="font-mono" style={{ color: "var(--win95-text)" }}>
                {aiSubscription.includedTokensRemaining.toLocaleString()} / {aiSubscription.includedTokensTotal.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <AlertCircle size={16} style={{ color: "var(--warning)" }} />
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              No active AI subscription. Organization is using BYOK (Bring Your Own Key) mode.
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
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <CreditCard size={14} />
          Stripe Subscription Management
          <span
            className="ml-2 px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: "var(--error)", color: "white" }}
          >
            DANGER ZONE
          </span>
        </h4>

        {/* Current Stripe Data Display */}
        <div className="space-y-2 text-xs mb-4 p-3 border" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
          <div className="flex justify-between">
            <span style={{ color: "var(--neutral-gray)" }}>Stripe Customer ID:</span>
            <span className="font-mono" style={{ color: organization.stripeCustomerId ? "var(--win95-text)" : "var(--neutral-gray)" }}>
              {organization.stripeCustomerId || "Not set"}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--neutral-gray)" }}>Stripe Subscription ID:</span>
            <span className="font-mono" style={{ color: organization.stripeSubscriptionId ? "var(--success)" : "var(--neutral-gray)" }}>
              {organization.stripeSubscriptionId || "No active subscription"}
            </span>
          </div>
          <div className="px-4 py-2" style={{
            backgroundColor: '#FFF9E5',
            color: '#7C6400',
            border: '2px solid #FFEB99',
            borderRadius: '4px'
          }}>
            <p className="text-xs font-semibold mb-1"> Plan tier managed in License Overview below</p>
            <p className="text-xs">
              Use the License Overview section to view and change the organization's plan tier.
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 mb-4 p-2" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--error)" }} />
          <p className="text-xs" style={{ color: "var(--win95-text)" }}>
            <strong>Warning:</strong> Only clear subscription data if you&apos;ve already deleted the subscription in the Stripe Dashboard.
            This operation syncs Convex with Stripe&apos;s state.
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
            <span style={{ color: "var(--win95-text)" }}>Also clear Customer ID (use if recreating customer)</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={resetPlanToFree}
              onChange={(e) => setResetPlanToFree(e.target.checked)}
              className="w-4 h-4"
            />
            <span style={{ color: "var(--win95-text)" }}>Reset plan to FREE</span>
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
              Clearing...
            </>
          ) : (
            <>
              <Trash2 size={14} />
              Clear Subscription Data
            </>
          )}
        </button>

        {!organization.stripeSubscriptionId && (
          <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
            No subscription ID to clear.
          </p>
        )}
      </div>

      {/* Quota Overrides */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <Settings size={14} />
            Quota & Limits Override
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
                Saving...
              </>
            ) : (
              <>
                <Save size={12} />
                Save Quotas
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
            <label className="block text-xs font-bold mb-1.5 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <Users size={12} />
              Maximum Users
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
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              placeholder="0 = Unlimited"
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Set to 0 for unlimited users. Current active users: {organization.members?.length || 0}
            </p>
          </div>

          {/* Max Storage */}
          <div>
            <label className="block text-xs font-bold mb-1.5 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <Database size={12} />
              Maximum Storage (GB)
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
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              placeholder="0 = Unlimited"
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Set to 0 for unlimited storage. Used for media library files.
            </p>
          </div>

          {/* Max AI Requests */}
          <div>
            <label className="block text-xs font-bold mb-1.5 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <Zap size={12} />
              Maximum AI Requests (per month)
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
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              placeholder="0 = Unlimited"
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Set to 0 for unlimited AI requests. Only applies if using Platform Key mode.
            </p>
          </div>
        </div>
      </div>

      {/* App Access Control */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <Shield size={14} />
          App Access Control
        </h4>
        <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
          Control which apps this organization can access. Green = enabled, Red = disabled.
        </p>

        {!allApps ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
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
                      <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
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
                    {isEnabled ? "ENABLED" : "DISABLED"}
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
            <h4 className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Deprecated: Legacy Plan System
            </h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              The old plan system (free, pro, personal, business, enterprise) has been deprecated.
              Licensing is now controlled through:
            </p>
            <ul className="text-xs mt-2 space-y-1 ml-4" style={{ color: "var(--neutral-gray)" }}>
              <li>• <strong>AI Subscriptions</strong> - Pay-per-tier AI access</li>
              <li>• <strong>App Availability</strong> - Granular app access control</li>
              <li>• <strong>Quota Overrides</strong> - Manual limits for users, storage, API requests</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
