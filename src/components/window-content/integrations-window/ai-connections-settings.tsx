"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Lock, PlugZap, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWindowManager } from "@/hooks/use-window-manager";
import { StoreWindow } from "../store-window";
import type { Id } from "../../../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../../convex/_generated/api") as { api: any };

type VerificationAction = "test_auth" | "list_models" | "test_text" | "test_voice";
type ProbeStatus = "healthy" | "degraded" | "offline";

type ProviderConnection = {
  providerId: string;
  providerLabel: string;
  profileId: string;
  supportsCustomBaseUrl: boolean;
  defaultBaseUrl: string;
  baseUrl: string;
  enabled: boolean;
  hasApiKey: boolean;
  maskedKey: string | null;
  billingSource: "platform" | "byok" | "private" | null;
  isConnected: boolean;
  canConfigure: boolean;
  lockedReason: string | null;
  cooldownUntil: number | null;
  lastFailureReason: string | null;
  supportedVerificationActions: VerificationAction[];
  healthStatus: ProbeStatus | null;
  healthReason: string | null;
  healthCheckedAt: number | null;
  healthLastAction: VerificationAction | null;
  healthLatencyMs: number | null;
  healthModelCount: number | null;
  healthVoiceCount: number | null;
};

type CatalogResult = {
  currentTier: string;
  aiEnabled: boolean;
  byokFeatureEnabled: boolean;
  byokEnabled: boolean;
  requiredTierForByok: string;
  providers: ProviderConnection[];
};

type DraftState = {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  billingSource: "byok" | "private";
};

interface AIConnectionsSettingsProps {
  onBack: () => void;
}

export function AIConnectionsSettings({ onBack }: AIConnectionsSettingsProps) {
  const { sessionId, user } = useAuth();
  const { openWindow } = useWindowManager();
  const organizationId = user?.currentOrganization?.id as Id<"organizations"> | undefined;
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [verificationActionByProvider, setVerificationActionByProvider] = useState<
    Record<string, VerificationAction>
  >({});
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [resultByProvider, setResultByProvider] = useState<
    Record<
      string,
      {
        status: ProbeStatus;
        message: string;
        action?: VerificationAction;
        checkedAt?: number;
        latencyMs?: number;
        modelCount?: number;
        voiceCount?: number;
      }
    >
  >({});

  const catalog = useQuery(
    apiAny.integrations.aiConnections.getAIConnectionCatalog,
    sessionId && organizationId ? { sessionId, organizationId } : "skip"
  ) as CatalogResult | undefined;

  const saveConnection = useMutation(apiAny.integrations.aiConnections.saveAIConnection);
  const revokeConnection = useMutation(apiAny.integrations.aiConnections.revokeAIConnection);
  const testConnection = useAction(apiAny.integrations.aiConnections.testAIConnection);

  useEffect(() => {
    if (!catalog) {
      return;
    }

    setDrafts((current) => {
      const next = { ...current };
      for (const provider of catalog.providers) {
        if (next[provider.providerId]) {
          continue;
        }
        next[provider.providerId] = {
          enabled: provider.enabled,
          apiKey: "",
          baseUrl: provider.baseUrl || provider.defaultBaseUrl,
          billingSource: provider.billingSource === "private" ? "private" : "byok",
        };
      }
      return next;
    });

    setVerificationActionByProvider((current) => {
      const next = { ...current };
      for (const provider of catalog.providers) {
        const currentAction = next[provider.providerId];
        if (
          currentAction &&
          provider.supportedVerificationActions.includes(currentAction)
        ) {
          continue;
        }
        const defaultAction = provider.supportedVerificationActions.includes("test_auth")
          ? "test_auth"
          : provider.supportedVerificationActions[0];
        if (defaultAction) {
          next[provider.providerId] = defaultAction;
        }
      }
      return next;
    });
  }, [catalog]);

  const connectedCount = useMemo(() => {
    if (!catalog) {
      return 0;
    }
    return catalog.providers.filter((provider) => provider.isConnected).length;
  }, [catalog]);

  const openStore = () => {
    openWindow(
      "store",
      "Platform Store",
      <StoreWindow />,
      { x: 140, y: 100 },
      { width: 950, height: 700 }
    );
  };

  const updateDraft = (
    providerId: string,
    updates: Partial<DraftState>
  ) => {
    setDrafts((current) => ({
      ...current,
      [providerId]: {
        ...(current[providerId] ?? {
          enabled: false,
          apiKey: "",
          baseUrl: "",
          billingSource: "byok",
        }),
        ...updates,
      },
    }));
  };

  const formatVerificationAction = (action: VerificationAction): string => {
    if (action === "test_auth") {
      return "Auth probe";
    }
    if (action === "list_models") {
      return "List models";
    }
    if (action === "test_text") {
      return "Text probe";
    }
    return "Voice probe";
  };

  const formatCheckedAt = (value?: number | null): string | null => {
    if (typeof value !== "number") {
      return null;
    }
    return new Date(value).toLocaleString();
  };

  const handleSave = async (provider: ProviderConnection) => {
    if (!sessionId || !organizationId) {
      return;
    }

    const draft = drafts[provider.providerId];
    if (!draft) {
      return;
    }

    setActiveProviderId(provider.providerId);
    try {
      await saveConnection({
        sessionId,
        organizationId,
        providerId: provider.providerId,
        enabled: draft.enabled,
        apiKey: draft.apiKey.trim() || undefined,
        baseUrl: provider.supportsCustomBaseUrl
          ? draft.baseUrl.trim() || undefined
          : undefined,
        billingSource: draft.billingSource,
      });
      setResultByProvider((current) => ({
        ...current,
        [provider.providerId]: {
          status: "healthy",
          message: provider.hasApiKey
            ? "Connection updated and key rotation applied."
            : "Connection saved.",
        },
      }));
      updateDraft(provider.providerId, { apiKey: "" });
    } catch (error) {
      setResultByProvider((current) => ({
        ...current,
        [provider.providerId]: {
          status: "offline",
          message: error instanceof Error ? error.message : "Failed to save connection.",
        },
      }));
    } finally {
      setActiveProviderId(null);
    }
  };

  const handleRevoke = async (provider: ProviderConnection) => {
    if (!sessionId || !organizationId) {
      return;
    }
    const confirmed = window.confirm(
      `Revoke ${provider.providerLabel} connection? This removes the stored key and disables provider use.`
    );
    if (!confirmed) {
      return;
    }

    setActiveProviderId(provider.providerId);
    try {
      await revokeConnection({
        sessionId,
        organizationId,
        providerId: provider.providerId,
      });
      setResultByProvider((current) => ({
        ...current,
        [provider.providerId]: {
          status: "degraded",
          message: "Connection revoked.",
        },
      }));
      updateDraft(provider.providerId, { enabled: false, apiKey: "" });
    } catch (error) {
      setResultByProvider((current) => ({
        ...current,
        [provider.providerId]: {
          status: "offline",
          message: error instanceof Error ? error.message : "Failed to revoke connection.",
        },
      }));
    } finally {
      setActiveProviderId(null);
    }
  };

  const handleTest = async (provider: ProviderConnection) => {
    if (!sessionId || !organizationId) {
      return;
    }
    const draft = drafts[provider.providerId];
    if (!draft) {
      return;
    }
    const verificationAction =
      verificationActionByProvider[provider.providerId] ??
      provider.supportedVerificationActions[0] ??
      "test_auth";

    setActiveProviderId(provider.providerId);
    try {
      const probe = (await testConnection({
        sessionId,
        organizationId,
        providerId: provider.providerId,
        apiKey: draft.apiKey.trim() || undefined,
        baseUrl: provider.supportsCustomBaseUrl
          ? draft.baseUrl.trim() || undefined
          : undefined,
        verificationAction,
      })) as {
        success: boolean;
        status: ProbeStatus;
        reason?: string;
        verificationAction?: VerificationAction;
        checkedAt?: number;
        latencyMs?: number;
        modelCount?: number;
        voiceCount?: number;
      };

      const resolvedAction = probe.verificationAction ?? verificationAction;
      const successMessage =
        resolvedAction === "list_models"
          ? `Model list probe succeeded${typeof probe.modelCount === "number" ? ` (${probe.modelCount} models).` : "."}`
          : resolvedAction === "test_text"
            ? "Text generation probe succeeded."
            : resolvedAction === "test_voice"
              ? "Voice probe succeeded."
              : "Auth probe succeeded.";

      setResultByProvider((current) => ({
        ...current,
        [provider.providerId]: {
          status: probe.status,
          message: probe.success
            ? successMessage
            : probe.reason || "Connection test failed.",
          action: resolvedAction,
          checkedAt: probe.checkedAt,
          latencyMs: probe.latencyMs,
          modelCount: probe.modelCount,
          voiceCount: probe.voiceCount,
        },
      }));
    } catch (error) {
      setResultByProvider((current) => ({
        ...current,
        [provider.providerId]: {
          status: "offline",
          message: error instanceof Error ? error.message : "Connection test failed.",
          action: verificationAction,
        },
      }));
    } finally {
      setActiveProviderId(null);
    }
  };

  const statusColor = (status: ProbeStatus) => {
    if (status === "healthy") {
      return "#059669";
    }
    if (status === "degraded") {
      return "#d97706";
    }
    return "#dc2626";
  };

  if (!catalog) {
    return (
      <div className="integration-ui-scope flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Loading AI connections...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="integration-ui-scope flex flex-col h-full" style={{ background: "var(--window-document-bg)" }}>
      <div className="px-4 py-3 border-b-2 flex items-center justify-between gap-3" style={{ borderColor: "var(--window-document-border)" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-sm hover:underline"
            style={{ color: "var(--tone-accent)" }}
          >
            &larr; Back
          </button>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
              AI Connections
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {connectedCount} provider connection{connectedCount === 1 ? "" : "s"} configured
            </p>
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded border" style={{ borderColor: "var(--window-document-border)", color: "var(--neutral-gray)" }}>
          Tier: {catalog.currentTier}
        </span>
      </div>

      {!catalog.byokEnabled && (
        <div
          className="mx-4 mt-4 p-3 border-2"
          style={{
            borderColor: "var(--warning)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <div className="flex items-start gap-2">
            <Lock size={16} style={{ color: "var(--warning)" }} />
            <div className="space-y-1">
              <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                BYOK connections are locked on this tier
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Upgrade to {catalog.requiredTierForByok} or higher to connect provider API keys.
              </p>
              <button
                onClick={openStore}
                className="desktop-interior-button px-3 py-1 text-xs font-bold"
                style={{ background: "var(--tone-accent)", color: "#0f0f0f" }}
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {catalog.providers.map((provider) => {
          const draft = drafts[provider.providerId] ?? {
            enabled: provider.enabled,
            apiKey: "",
            baseUrl: provider.baseUrl,
            billingSource: "byok" as const,
          };
          const result = resultByProvider[provider.providerId];
          const selectedVerificationAction =
            verificationActionByProvider[provider.providerId] ??
            provider.supportedVerificationActions[0] ??
            "test_auth";
          const lastCatalogCheckedAt = formatCheckedAt(provider.healthCheckedAt);
          const resultCheckedAt = formatCheckedAt(result?.checkedAt);
          const isBusy = activeProviderId === provider.providerId;

          return (
            <div
              key={provider.providerId}
              className="border-2 p-3"
              style={{
                borderColor: provider.isConnected
                  ? "#059669"
                  : "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
                opacity: provider.canConfigure ? 1 : 0.8,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
                    <PlugZap size={15} />
                    {provider.providerLabel}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    {provider.providerId === "openai_compatible"
                      ? "Custom OpenAI-compatible/private endpoint connector."
                      : "Provider API key connection for AI runtime routing."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] px-2 py-1 font-bold"
                    style={{
                      background: provider.isConnected ? "#059669" : "var(--window-document-border)",
                      color: provider.isConnected ? "white" : "var(--neutral-gray)",
                    }}
                  >
                    {provider.isConnected ? "Connected" : "Not connected"}
                  </span>
                  {provider.hasApiKey && (
                    <span className="text-[11px] px-2 py-1 border font-mono" style={{ borderColor: "var(--window-document-border)", color: "var(--neutral-gray)" }}>
                      {provider.maskedKey}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs" style={{ color: "var(--window-document-text)" }}>
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    disabled={!provider.canConfigure}
                    onChange={(event) =>
                      updateDraft(provider.providerId, { enabled: event.target.checked })
                    }
                  />
                  Enable connection
                </label>

                <label className="text-xs flex flex-col gap-1" style={{ color: "var(--window-document-text)" }}>
                  Billing source
                  <select
                    className="p-2 text-xs border-2"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg)",
                      color: "var(--window-document-text)",
                    }}
                    value={draft.billingSource}
                    disabled={!provider.canConfigure}
                    onChange={(event) =>
                      updateDraft(provider.providerId, {
                        billingSource: event.target.value === "private" ? "private" : "byok",
                      })
                    }
                  >
                    <option value="byok">BYOK</option>
                    <option value="private">Private</option>
                  </select>
                </label>

                <label className="text-xs flex flex-col gap-1" style={{ color: "var(--window-document-text)" }}>
                  Verification action
                  <select
                    className="p-2 text-xs border-2"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg)",
                      color: "var(--window-document-text)",
                    }}
                    value={selectedVerificationAction}
                    disabled={!provider.canConfigure}
                    onChange={(event) =>
                      setVerificationActionByProvider((current) => ({
                        ...current,
                        [provider.providerId]: event.target.value as VerificationAction,
                      }))
                    }
                  >
                    {provider.supportedVerificationActions.map((action) => (
                      <option key={action} value={action}>
                        {formatVerificationAction(action)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs flex flex-col gap-1 lg:col-span-2" style={{ color: "var(--window-document-text)" }}>
                  API key
                  <input
                    type="password"
                    className="p-2 text-xs border-2 font-mono"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg)",
                      color: "var(--window-document-text)",
                    }}
                    value={draft.apiKey}
                    disabled={!provider.canConfigure}
                    onChange={(event) =>
                      updateDraft(provider.providerId, { apiKey: event.target.value })
                    }
                    placeholder={
                      provider.hasApiKey
                        ? "Stored key present. Enter a new key to rotate."
                        : "Enter provider API key"
                    }
                  />
                  <span style={{ color: "var(--neutral-gray)" }}>
                    Keys remain redacted in UI and are never echoed after save.
                  </span>
                </label>

                {provider.supportsCustomBaseUrl && (
                  <label className="text-xs flex flex-col gap-1 lg:col-span-2" style={{ color: "var(--window-document-text)" }}>
                    Base URL
                    <input
                      type="text"
                      className="p-2 text-xs border-2 font-mono"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                      value={draft.baseUrl}
                      disabled={!provider.canConfigure}
                      onChange={(event) =>
                        updateDraft(provider.providerId, { baseUrl: event.target.value })
                      }
                      placeholder={provider.defaultBaseUrl}
                    />
                  </label>
                )}
              </div>

              {!provider.canConfigure && provider.lockedReason && (
                <div
                  className="mt-3 p-2 border text-xs flex items-start gap-2"
                  style={{
                    borderColor: "var(--warning)",
                    background: "var(--window-document-bg)",
                    color: "var(--neutral-gray)",
                  }}
                >
                  <AlertTriangle size={14} style={{ color: "var(--warning)" }} />
                  <span>{provider.lockedReason}</span>
                </div>
              )}

              {provider.healthStatus && (
                <div
                  className="mt-3 p-2 border text-xs"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: statusColor(provider.healthStatus),
                  }}
                >
                  <p>
                    Last health: {provider.healthStatus}
                    {provider.healthLastAction
                      ? ` via ${formatVerificationAction(provider.healthLastAction)}`
                      : ""}
                    {lastCatalogCheckedAt ? ` at ${lastCatalogCheckedAt}` : ""}
                  </p>
                  {provider.healthReason && (
                    <p style={{ color: "var(--neutral-gray)" }}>
                      Reason: {provider.healthReason}
                    </p>
                  )}
                  {(typeof provider.healthModelCount === "number" ||
                    typeof provider.healthVoiceCount === "number" ||
                    typeof provider.healthLatencyMs === "number") && (
                    <p style={{ color: "var(--neutral-gray)" }}>
                      {typeof provider.healthModelCount === "number"
                        ? `models=${provider.healthModelCount} `
                        : ""}
                      {typeof provider.healthVoiceCount === "number"
                        ? `voices=${provider.healthVoiceCount} `
                        : ""}
                      {typeof provider.healthLatencyMs === "number"
                        ? `latency=${provider.healthLatencyMs}ms`
                        : ""}
                    </p>
                  )}
                </div>
              )}

              {result && (
                <div className="mt-3 text-xs flex items-start gap-2" style={{ color: statusColor(result.status) }}>
                  {result.status === "healthy" ? <CheckCircle2 size={14} /> : <ShieldCheck size={14} />}
                  <div>
                    <p>{result.message}</p>
                    {(result.action || resultCheckedAt || typeof result.latencyMs === "number") && (
                      <p style={{ color: "var(--neutral-gray)" }}>
                        {result.action ? `${formatVerificationAction(result.action)} ` : ""}
                        {resultCheckedAt ? `at ${resultCheckedAt} ` : ""}
                        {typeof result.latencyMs === "number" ? `latency=${result.latencyMs}ms ` : ""}
                        {typeof result.modelCount === "number" ? `models=${result.modelCount} ` : ""}
                        {typeof result.voiceCount === "number" ? `voices=${result.voiceCount}` : ""}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => handleTest(provider)}
                  disabled={!provider.canConfigure || isBusy}
                  className="desktop-interior-button py-1.5 px-3 text-xs font-pixel disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isBusy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                  Test
                </button>
                <button
                  onClick={() => handleSave(provider)}
                  disabled={!provider.canConfigure || isBusy}
                  className="desktop-interior-button py-1.5 px-3 text-xs font-pixel disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isBusy ? <Loader2 size={13} className="animate-spin" /> : provider.hasApiKey ? <RefreshCw size={13} /> : <KeyRound size={13} />}
                  {provider.hasApiKey ? "Rotate / Save" : "Connect"}
                </button>
                <button
                  onClick={() => handleRevoke(provider)}
                  disabled={!provider.canConfigure || isBusy || !provider.hasApiKey}
                  className="desktop-interior-button py-1.5 px-3 text-xs font-pixel disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  Revoke
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
