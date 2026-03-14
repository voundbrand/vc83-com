"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Shield,
  Smartphone,
  Wrench,
} from "lucide-react";

// Dynamic require to avoid TS2589 deep type instantiation in generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

type AgentClass = "internal_operator" | "external_customer_facing";
type PreferredOutreachChannel = "sms" | "email" | "telegram" | "phone_call";
type FallbackOutreachChannel = "none" | "sms" | "email" | "telegram";
type DeploymentChoice = "webchat" | "telegram" | "both";
type OperatingMode = "work" | "private";

interface AgentToolSetupDraft {
  agentClass: AgentClass;
  preferredChannel: PreferredOutreachChannel;
  fallbackChannel: FallbackOutreachChannel;
  allowedHoursStart: string;
  allowedHoursEnd: string;
  deploymentChoice: DeploymentChoice;
  operatingMode: OperatingMode;
  weekendModeEnabled: boolean;
  updatedAt?: number;
}

interface AgentToolSetupPanelProps {
  onBack?: () => void;
}

type ElevenLabsSettingsSnapshot = {
  enabled?: boolean;
  hasApiKey?: boolean;
  hasPlatformApiKey?: boolean;
  billingSource?: "platform" | "byok" | "private";
} | null | undefined;

const DEFAULT_DRAFT: AgentToolSetupDraft = {
  agentClass: "internal_operator",
  preferredChannel: "sms",
  fallbackChannel: "email",
  allowedHoursStart: "09:00",
  allowedHoursEnd: "17:00",
  deploymentChoice: "webchat",
  operatingMode: "work",
  weekendModeEnabled: true,
};

const OUTREACH_HOURS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

export function AgentToolSetupPanel({ onBack }: AgentToolSetupPanelProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [draft, setDraft] = useState<AgentToolSetupDraft>(DEFAULT_DRAFT);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveAgentToolSetupConfig = useMutation(api.ai.weekendMode.saveAgentToolSetupConfig);

  const googleConnection = useQuery(
    api.oauth.google.getGoogleConnectionStatus,
    sessionId ? { sessionId } : "skip",
  ) as {
    personal?: {
      status?: string;
      email?: string;
    } | null;
  } | undefined;

  const telegramStatus = useQuery(
    api.integrations.telegram.getTelegramIntegrationStatus,
    sessionId ? { sessionId } : "skip",
  ) as {
    platformBot?: {
      connected?: boolean;
    } | null;
    customBot?: {
      deployed?: boolean;
      botUsername?: string;
    } | null;
  } | undefined;

  const slackConnection = useQuery(
    api.oauth.slack.getSlackConnectionStatus,
    sessionId ? { sessionId } : "skip",
  ) as { connected?: boolean } | undefined;

  const toolSetupConfig = useQuery(
    api.ai.weekendMode.getAgentToolSetupConfig,
    sessionId ? { sessionId } : "skip",
  ) as
    | {
        contractVersion?: string;
        config?: AgentToolSetupDraft | null;
      }
    | null
    | undefined;

  const elevenLabsSettings = useQuery(
    api.integrations.elevenlabs.getElevenLabsSettings,
    sessionId && currentOrg?.id
      ? {
          sessionId,
          organizationId: currentOrg.id,
        }
      : "skip",
  ) as ElevenLabsSettingsSnapshot;

  useEffect(() => {
    if (!toolSetupConfig?.config) {
      return;
    }
    setDraft((previous) => ({
      ...previous,
      ...toolSetupConfig.config,
    }));
    setSavedAt(typeof toolSetupConfig.config.updatedAt === "number" ? toolSetupConfig.config.updatedAt : null);
  }, [toolSetupConfig]);

  const googleConnected = googleConnection?.personal?.status === "active";
  const telegramConnected = Boolean(
    telegramStatus?.platformBot?.connected || telegramStatus?.customBot?.deployed,
  );
  const slackConnected = Boolean(slackConnection?.connected);

  const strictElevenReady = useMemo(() => {
    if (!elevenLabsSettings?.enabled) {
      return false;
    }
    if (elevenLabsSettings.billingSource === "platform") {
      return Boolean(elevenLabsSettings.hasPlatformApiKey);
    }
    return Boolean(elevenLabsSettings.hasApiKey);
  }, [elevenLabsSettings]);

  const deploymentReadinessText = useMemo(() => {
    if (!strictElevenReady) {
      return "Strict customer-facing voice path is blocked until ElevenLabs is connected and enabled.";
    }
    if (draft.deploymentChoice === "webchat") {
      return "Webchat can run immediately on the strict Eleven path.";
    }
    if (draft.deploymentChoice === "telegram" && !telegramConnected) {
      return "Telegram deployment selected, but Telegram is not connected yet.";
    }
    if (draft.deploymentChoice === "both" && !telegramConnected) {
      return "Webchat is ready now. Telegram activates after Telegram integration is connected.";
    }
    return "Selected strict customer-facing deployment path is ready.";
  }, [draft.deploymentChoice, strictElevenReady, telegramConnected]);

  const saveDraft = async () => {
    if (!sessionId) {
      return;
    }
    try {
      const result = await saveAgentToolSetupConfig({
        sessionId,
        updates: {
          agentClass: draft.agentClass,
          preferredChannel: draft.preferredChannel,
          fallbackChannel: draft.fallbackChannel,
          allowedHoursStart: draft.allowedHoursStart,
          allowedHoursEnd: draft.allowedHoursEnd,
          deploymentChoice: draft.deploymentChoice,
          operatingMode: draft.operatingMode,
          weekendModeEnabled: draft.weekendModeEnabled,
          weekendTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      }) as { config?: { updatedAt?: number } | null };
      const updatedAt = typeof result?.config?.updatedAt === "number"
        ? result.config.updatedAt
        : Date.now();
      setSavedAt(updatedAt);
    } catch (error) {
      console.warn("Failed to save tool setup configuration:", error);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--window-document-bg)" }}>
      <div
        className="px-4 py-3 border-b-2 flex items-center gap-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm hover:underline"
            style={{ color: "var(--tone-accent)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        )}
        <div className="flex items-center gap-2">
          <Wrench size={20} style={{ color: "var(--tone-accent)" }} />
          <div>
            <h2 className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
              Agent Tool Setup
            </h2>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Agent-agnostic tool policy defaults with explicit internal/team vs customer-facing boundaries.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section
          className="border-2 rounded p-4 space-y-3"
          style={{
            borderColor: "var(--tone-accent)",
            background:
              "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%)",
          }}
        >
          <div className="flex items-start gap-3">
            <Shield size={18} style={{ color: "var(--tone-accent)" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                1. Agent boundary classification
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Choose the primary target for this policy context. Internal and customer-facing agents
                must remain explicit and separately governed.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              onClick={() =>
                setDraft((previous) => ({
                  ...previous,
                  agentClass: "internal_operator",
                }))
              }
              className="rounded border p-3 text-left"
              style={{
                borderColor:
                  draft.agentClass === "internal_operator"
                    ? "var(--tone-accent)"
                    : "var(--window-document-border)",
                background:
                  draft.agentClass === "internal_operator"
                    ? "rgba(99, 102, 241, 0.1)"
                    : "var(--window-document-bg)",
              }}
            >
              <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                Internal / Team agents
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                Operator-facing runtime policies, approvals, and internal work/private controls.
              </p>
            </button>
            <button
              onClick={() =>
                setDraft((previous) => ({
                  ...previous,
                  agentClass: "external_customer_facing",
                }))
              }
              className="rounded border p-3 text-left"
              style={{
                borderColor:
                  draft.agentClass === "external_customer_facing"
                    ? "var(--tone-accent)"
                    : "var(--window-document-border)",
                background:
                  draft.agentClass === "external_customer_facing"
                    ? "rgba(99, 102, 241, 0.1)"
                    : "var(--window-document-bg)",
              }}
            >
              <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                Customer-facing agents
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                Front-door support, lead capture, and external communication channels.
              </p>
            </button>
          </div>
        </section>

        <section
          className="border-2 rounded p-4 space-y-3"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--window-document-text)" }}>
            2. Tool policy defaults (agent-agnostic)
          </p>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            These defaults apply to outreach-capable tools and specialist workflows regardless of
            agent personality/template.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
              Preferred outreach channel
              <select
                value={draft.preferredChannel}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    preferredChannel: event.target.value as PreferredOutreachChannel,
                  }))
                }
                className="mt-1 w-full border px-2 py-1 text-xs"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="telegram">Telegram</option>
                <option value="phone_call">Phone call (approval-gated)</option>
              </select>
            </label>
            <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
              Fallback channel
              <select
                value={draft.fallbackChannel}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    fallbackChannel: event.target.value as FallbackOutreachChannel,
                  }))
                }
                className="mt-1 w-full border px-2 py-1 text-xs"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              >
                <option value="none">No fallback</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="telegram">Telegram</option>
              </select>
            </label>
            <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
              Allowed outreach start
              <select
                value={draft.allowedHoursStart}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    allowedHoursStart: event.target.value,
                  }))
                }
                className="mt-1 w-full border px-2 py-1 text-xs"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              >
                {OUTREACH_HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
              Allowed outreach end
              <select
                value={draft.allowedHoursEnd}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    allowedHoursEnd: event.target.value,
                  }))
                }
                className="mt-1 w-full border px-2 py-1 text-xs"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              >
                {OUTREACH_HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section
          className="border-2 rounded p-4 space-y-3"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--window-document-text)" }}>
            3. Internal / team runtime policies
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              onClick={() =>
                setDraft((previous) => ({
                  ...previous,
                  operatingMode: "work",
                }))
              }
              className="rounded border p-3 text-left"
              style={{
                borderColor:
                  draft.operatingMode === "work" ? "#10b981" : "var(--window-document-border)",
                background:
                  draft.operatingMode === "work"
                    ? "rgba(16, 185, 129, 0.08)"
                    : "var(--window-document-bg)",
              }}
            >
              <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                Work context (internal-only)
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                Execution context for connected tools with explicit approvals and audit trail.
              </p>
            </button>
            <button
              onClick={() =>
                setDraft((previous) => ({
                  ...previous,
                  operatingMode: "private",
                }))
              }
              className="rounded border p-3 text-left"
              style={{
                borderColor:
                  draft.operatingMode === "private" ? "#0ea5e9" : "var(--window-document-border)",
                background:
                  draft.operatingMode === "private"
                    ? "rgba(14, 165, 233, 0.08)"
                    : "var(--window-document-bg)",
              }}
            >
              <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                Private context (internal-only)
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                Advisory planning context with no external side effects.
              </p>
            </button>
          </div>
          <div
            className="rounded border p-2 flex items-center justify-between gap-3 text-xs"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          >
            <div>
              <p className="font-semibold">Weekend mode (internal runtime overlay)</p>
              <p style={{ color: "var(--neutral-gray)" }}>
                Auto-switch to cautious weekend handling from Friday evening through Monday morning.
              </p>
            </div>
            <button
              onClick={() =>
                setDraft((previous) => ({
                  ...previous,
                  weekendModeEnabled: !previous.weekendModeEnabled,
                }))
              }
              className="rounded border px-2 py-1 font-semibold"
              style={{
                borderColor: draft.weekendModeEnabled
                  ? "#10b981"
                  : "var(--window-document-border)",
                background: draft.weekendModeEnabled
                  ? "rgba(16, 185, 129, 0.12)"
                  : "var(--window-document-bg)",
              }}
            >
              {draft.weekendModeEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>
        </section>

        <section
          className="border-2 rounded p-4 space-y-3"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--window-document-text)" }}>
            4. Customer-facing deployment (strict voice path)
          </p>
          <div
            className="rounded border p-2 text-xs flex items-center justify-between gap-2"
            style={{
              borderColor: strictElevenReady ? "#10b981" : "var(--warning)",
              background: strictElevenReady ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
              color: "var(--window-document-text)",
            }}
          >
            <div className="flex items-center gap-2">
              {strictElevenReady ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              <span>
                Voice provider path: <strong>ElevenLabs (required)</strong>
              </span>
            </div>
            <span style={{ color: strictElevenReady ? "#047857" : "var(--warning)" }}>
              {strictElevenReady ? "Ready" : "Blocked"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              {
                value: "webchat",
                title: "Webchat",
                description: "Runs in desktop/webchat surface.",
              },
              {
                value: "telegram",
                title: "Telegram",
                description: "Requires Telegram bot integration.",
              },
              {
                value: "both",
                title: "Both",
                description: "Webchat now + Telegram once connected.",
              },
            ].map((option) => {
              const isSelected = draft.deploymentChoice === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() =>
                    setDraft((previous) => ({
                      ...previous,
                      deploymentChoice: option.value as DeploymentChoice,
                    }))
                  }
                  className="text-left rounded border p-3"
                  style={{
                    borderColor: isSelected ? "var(--tone-accent)" : "var(--window-document-border)",
                    background: isSelected ? "rgba(99, 102, 241, 0.1)" : "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    {option.value === "webchat" ? (
                      <MessageCircle size={12} />
                    ) : (
                      <Smartphone size={12} />
                    )}
                    {option.title}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
          <div
            className="rounded border p-2 text-xs"
            style={{
              borderColor:
                (draft.deploymentChoice === "telegram" || draft.deploymentChoice === "both") &&
                !telegramConnected
                  ? "var(--warning)"
                  : "var(--window-document-border)",
              background:
                (draft.deploymentChoice === "telegram" || draft.deploymentChoice === "both") &&
                !telegramConnected
                  ? "rgba(245, 158, 11, 0.08)"
                  : "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          >
            {deploymentReadinessText}
          </div>
        </section>

        <section
          className="border-2 rounded p-4 space-y-2"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--window-document-text)" }}>
            5. Vacation delegate policy (tool-level)
          </p>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            This policy should be configured once at tool level, then reused by any eligible agent.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div
              className="rounded border p-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              <strong>Slack integration:</strong> {slackConnected ? "connected" : "not connected"}
            </div>
            <div
              className="rounded border p-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              <strong>Google calendar write:</strong> {googleConnected ? "ready" : "not ready"}
            </div>
          </div>
          <div
            className="rounded border p-2 text-xs flex items-start gap-2"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--neutral-gray)",
            }}
          >
            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
            Configure detailed vacation policy constraints in Slack integration settings; this panel only
            tracks cross-agent readiness and boundaries.
          </div>
        </section>
      </div>

      <div
        className="px-4 py-3 border-t-2 flex items-center justify-between gap-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <div className="text-xs flex items-center gap-1.5" style={{ color: "var(--neutral-gray)" }}>
          <Clock3 size={12} />
          {savedAt
            ? `Saved ${new Date(savedAt).toLocaleString()}`
            : "No saved tool setup preferences yet"}
        </div>
        <button
          onClick={() => void saveDraft()}
          className="desktop-interior-button px-3 py-1.5 text-xs font-bold"
          style={{ color: "var(--window-document-text)" }}
        >
          Save Tool Setup
        </button>
      </div>
    </div>
  );
}
