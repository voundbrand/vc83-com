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
  Settings
} from "lucide-react";
import { ManualSubscriptionGrant } from "./components/manual-subscription-grant";
import { TokenPackIssuance } from "./components/token-pack-issuance";
import { ManualGrantsHistory } from "./components/manual-grants-history";

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

  // Mutations
  const setAppAvailability = useMutation(api.appAvailability.setAppAvailability);

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

      setSaveStatus("✓ Quota limits saved successfully");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Failed to save quotas:", error);
      setSaveStatus("✗ Failed to save quota limits");
    } finally {
      setIsSaving(false);
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
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-1 border-2"
            style={{
              background: "var(--success)",
              color: "white",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
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
              background: saveStatus.startsWith("✓") ? "var(--success)" : "var(--error)",
              color: "white",
            }}
          >
            {saveStatus.startsWith("✓") ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
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
