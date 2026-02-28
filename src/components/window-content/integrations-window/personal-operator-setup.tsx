"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation in generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MessageCircle,
  Shield,
  Smartphone,
} from "lucide-react";

type PreferredOutreachChannel = "sms" | "email" | "telegram" | "phone_call";
type FallbackOutreachChannel = "none" | "sms" | "email" | "telegram";
type DeploymentChoice = "webchat" | "telegram" | "both";
type OperatingMode = "work" | "private";

interface PersonalOperatorSetupDraft {
  preferredChannel: PreferredOutreachChannel;
  fallbackChannel: FallbackOutreachChannel;
  allowedHoursStart: string;
  allowedHoursEnd: string;
  deploymentChoice: DeploymentChoice;
  operatingMode: OperatingMode;
}

interface StoredPersonalOperatorSetupDraft extends PersonalOperatorSetupDraft {
  updatedAt?: number;
}

interface PersonalOperatorSetupProps {
  onBack: () => void;
  onOpenIntegration: (integrationId: "google" | "telegram") => void;
}

type SlackVacationPolicyConfig =
  | {
      slack?: {
        connected?: boolean;
        workspaceName?: string | null;
        teamId?: string | null;
      };
      googleCalendar?: {
        work?: {
          hasConnection?: boolean;
          calendarWriteReady?: boolean;
          email?: string | null;
        };
      };
      policy?: {
        exists?: boolean;
        maxConcurrentAway?: number;
        pharmacistRoleFloor?: number;
        blockedPeriods?: Array<unknown>;
      };
    }
  | null
  | undefined;

const STORAGE_KEY = "personal_operator_setup_v1";

const DEFAULT_DRAFT: PersonalOperatorSetupDraft = {
  preferredChannel: "sms",
  fallbackChannel: "email",
  allowedHoursStart: "09:00",
  allowedHoursEnd: "17:00",
  deploymentChoice: "webchat",
  operatingMode: "work",
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

type TranslateWithFallback = (
  key: string,
  fallback: string,
  params?: Record<string, string | number>
) => string;

export function PersonalOperatorSetup({
  onBack,
  onOpenIntegration,
}: PersonalOperatorSetupProps) {
  const { sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.integrations.personal_operator_setup");
  const tx: TranslateWithFallback = (key, fallback, params) => {
    const fullKey = `ui.integrations.personal_operator_setup.${key}`;
    const translated = t(fullKey, params);
    return translated === fullKey ? fallback : translated;
  };
  const [draft, setDraft] = useState<PersonalOperatorSetupDraft>(DEFAULT_DRAFT);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const googleConnection = useQuery(
    api.oauth.google.getGoogleConnectionStatus,
    sessionId ? { sessionId } : "skip"
  ) as {
    personal?: {
      status?: string;
      email?: string;
    } | null;
  } | undefined;

  const telegramStatus = useQuery(
    api.integrations.telegram.getTelegramIntegrationStatus,
    sessionId ? { sessionId } : "skip"
  ) as {
    platformBot?: {
      connected?: boolean;
    } | null;
    customBot?: {
      deployed?: boolean;
      botUsername?: string;
    } | null;
  } | undefined;
  const vacationPolicyConfig = useQuery(
    api.oauth.slack.getPharmacistVacationPolicyConfig,
    sessionId ? { sessionId } : "skip"
  ) as SlackVacationPolicyConfig;

  const googleConnected = googleConnection?.personal?.status === "active";
  const telegramConnected = Boolean(
    telegramStatus?.platformBot?.connected || telegramStatus?.customBot?.deployed
  );
  const vacationPolicyReady =
    vacationPolicyConfig?.policy?.exists === true &&
    vacationPolicyConfig?.slack?.connected === true &&
    vacationPolicyConfig?.googleCalendar?.work?.calendarWriteReady === true;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);
      if (!rawValue) {
        return;
      }
      const parsed = JSON.parse(rawValue) as StoredPersonalOperatorSetupDraft;
      setDraft({
        preferredChannel: parsed.preferredChannel || DEFAULT_DRAFT.preferredChannel,
        fallbackChannel: parsed.fallbackChannel || DEFAULT_DRAFT.fallbackChannel,
        allowedHoursStart: parsed.allowedHoursStart || DEFAULT_DRAFT.allowedHoursStart,
        allowedHoursEnd: parsed.allowedHoursEnd || DEFAULT_DRAFT.allowedHoursEnd,
        deploymentChoice: parsed.deploymentChoice || DEFAULT_DRAFT.deploymentChoice,
        operatingMode: parsed.operatingMode || DEFAULT_DRAFT.operatingMode,
      });
      setSavedAt(typeof parsed.updatedAt === "number" ? parsed.updatedAt : null);
    } catch (error) {
      console.warn("Failed to parse personal operator setup draft:", error);
    }
  }, []);

  const saveDraft = () => {
    if (typeof window === "undefined") {
      return;
    }
    const updatedAt = Date.now();
    const payload: StoredPersonalOperatorSetupDraft = {
      ...draft,
      updatedAt,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSavedAt(updatedAt);
  };

  const deploymentReadinessText = useMemo(() => {
    if (draft.deploymentChoice === "webchat") {
      return tx("deployment.readiness.webchat", "Webchat is immediately available after setup.");
    }
    if (draft.deploymentChoice === "telegram" && !telegramConnected) {
      return tx(
        "deployment.readiness.telegram_not_connected",
        "Telegram deployment selected, but Telegram is not connected yet."
      );
    }
    if (draft.deploymentChoice === "both" && !telegramConnected) {
      return tx(
        "deployment.readiness.both_waiting_telegram",
        "Webchat is ready now. Telegram activates after you connect Telegram."
      );
    }
    return tx("deployment.readiness.ready", "Selected deployment path is ready.");
  }, [draft.deploymentChoice, telegramConnected, tx]);

  return (
    <div className="integration-ui-scope flex flex-col h-full" style={{ background: "var(--window-document-bg)" }}>
      <div
        className="px-4 py-3 border-b-2 flex items-center gap-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm hover:underline"
          style={{ color: "var(--tone-accent)" }}
        >
          <ArrowLeft size={16} />
          {tx("header.back", "Back")}
        </button>
        <div className="flex items-center gap-2">
          <Shield size={20} style={{ color: "var(--tone-accent)" }} />
          <div>
            <h2 className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
              {tx("header.title", "Personal Operator Setup")}
            </h2>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx("header.subtitle", "Calendar + outreach preferences + deployment handoff")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section
          className="border-2 rounded p-4 space-y-3"
          style={{
            borderColor: "var(--tone-accent)",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%)",
          }}
        >
          <div className="flex items-start gap-3">
            <Clock3 size={18} style={{ color: "var(--tone-accent)" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                {tx("overview.target_time", "First-run setup target: about 15 minutes")}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {tx(
                  "overview.timing_note",
                  "Timing assumes required inputs are ready: Google sign-in, outreach defaults, and deployment pick."
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div
              className="rounded border p-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              <strong>{tx("overview.available_now_label", "Available now:")}</strong>{" "}
              {tx(
                "overview.available_now_body",
                "Google calendar connect, preference capture, webchat/telegram handoff selection."
              )}
            </div>
            <div
              className="rounded border p-2"
              style={{
                borderColor: "var(--warning)",
                background: "rgba(245, 158, 11, 0.08)",
                color: "var(--window-document-text)",
              }}
            >
              <strong>{tx("overview.planned_label", "Planned:")}</strong>{" "}
              {tx(
                "overview.planned_body",
                "autonomous outbound appointment calling is not shipped yet."
              )}
            </div>
          </div>
        </section>

        <section
          className="border-2 rounded p-4"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--window-document-text)" }}>
                {tx("calendar.section_title", "1. Google Calendar")}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {tx(
                  "calendar.section_body",
                  "Connect your Google account so booking workflows can read/write calendar availability."
                )}
              </p>
            </div>
            <span
              className="text-[11px] px-2 py-1 rounded border inline-flex items-center gap-1"
              style={{
                borderColor: googleConnected ? "#10b981" : "var(--window-document-border)",
                color: googleConnected ? "#047857" : "var(--neutral-gray)",
                background: googleConnected ? "rgba(16, 185, 129, 0.12)" : "transparent",
              }}
            >
              {googleConnected ? (
                <>
                  <CheckCircle2 size={12} />
                  {tx("calendar.status.connected", "Connected")}
                </>
              ) : (
                tx("calendar.status.not_connected", "Not connected")
              )}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onOpenIntegration("google")}
              className="desktop-interior-button px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
              style={{ color: "var(--window-document-text)" }}
            >
              <CalendarDays size={13} />
              {googleConnected
                ? tx("calendar.actions.manage_connection", "Manage Google Connection")
                : tx("calendar.actions.connect_calendar", "Connect Google Calendar")}
            </button>
            {googleConnection?.personal?.email && (
              <span className="text-xs self-center" style={{ color: "var(--neutral-gray)" }}>
                {tx(
                  "calendar.connected_as",
                  `Connected as ${googleConnection.personal.email}`,
                  { email: googleConnection.personal.email }
                )}
              </span>
            )}
          </div>
        </section>

        <section
          className="border-2 rounded p-4 space-y-2"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--window-document-text)" }}>
                {tx("vacation_policy.section_title", "1.5 Pharmacist vacation policy")}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {tx(
                  "vacation_policy.section_body",
                  "Policy controls are managed in Slack settings and evaluated with Slack + Google scope boundaries."
                )}
              </p>
            </div>
            <span
              className="text-[11px] px-2 py-1 rounded border inline-flex items-center gap-1"
              style={{
                borderColor: vacationPolicyReady ? "#10b981" : "var(--warning)",
                color: vacationPolicyReady ? "#047857" : "var(--warning)",
                background: vacationPolicyReady
                  ? "rgba(16, 185, 129, 0.12)"
                  : "rgba(245, 158, 11, 0.08)",
              }}
            >
              {vacationPolicyReady
                ? tx("vacation_policy.status.ready", "Policy ready")
                : tx("vacation_policy.status.not_ready", "Policy needs setup")}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div
              className="rounded border p-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              <strong>{tx("vacation_policy.workspace", "Slack workspace:")}</strong>{" "}
              {vacationPolicyConfig?.slack?.workspaceName ||
                vacationPolicyConfig?.slack?.teamId ||
                tx("labels.unavailable", "Unavailable")}
            </div>
            <div
              className="rounded border p-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              <strong>{tx("vacation_policy.google", "Google write readiness:")}</strong>{" "}
              {vacationPolicyConfig?.googleCalendar?.work?.calendarWriteReady
                ? tx("vacation_policy.google_ready", "ready")
                : tx("vacation_policy.google_not_ready", "not ready")}
            </div>
            <div
              className="rounded border p-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              <strong>{tx("vacation_policy.max_concurrent", "Max concurrent away:")}</strong>{" "}
              {vacationPolicyConfig?.policy?.maxConcurrentAway ?? 1}
            </div>
            <div
              className="rounded border p-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              <strong>{tx("vacation_policy.role_floor", "Pharmacist role floor:")}</strong>{" "}
              {vacationPolicyConfig?.policy?.pharmacistRoleFloor ?? 1}
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
            {tx(
              "vacation_policy.note",
              "Edit blackout periods, role floor, and override authority in Slack integration settings before using Slack vacation requests."
            )}
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
            {tx("outreach.section_title", "2. Outreach preferences")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
              {tx("outreach.preferred_channel_label", "Preferred channel")}
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
                <option value="sms">{tx("outreach.channels.sms", "SMS")}</option>
                <option value="email">{tx("outreach.channels.email", "Email")}</option>
                <option value="telegram">{tx("outreach.channels.telegram", "Telegram")}</option>
                <option value="phone_call">
                  {tx(
                    "outreach.channels.phone_call",
                    "Phone call (approval required once shipped)"
                  )}
                </option>
              </select>
            </label>
            <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
              {tx("outreach.fallback_channel_label", "Fallback channel")}
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
                <option value="none">{tx("outreach.channels.none", "No fallback")}</option>
                <option value="sms">{tx("outreach.channels.sms", "SMS")}</option>
                <option value="email">{tx("outreach.channels.email", "Email")}</option>
                <option value="telegram">{tx("outreach.channels.telegram", "Telegram")}</option>
              </select>
            </label>
            <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
              {tx("outreach.allowed_start_label", "Allowed outreach start")}
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
              {tx("outreach.allowed_end_label", "Allowed outreach end")}
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
            {tx("deployment.section_title", "3. Deployment handoff")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              {
                value: "webchat",
                title: tx("deployment.options.webchat.title", "Webchat"),
                description: tx(
                  "deployment.options.webchat.description",
                  "Runs in the desktop/webchat surface."
                ),
              },
              {
                value: "telegram",
                title: tx("deployment.options.telegram.title", "Telegram"),
                description: tx(
                  "deployment.options.telegram.description",
                  "Requires Telegram bot setup first."
                ),
              },
              {
                value: "both",
                title: tx("deployment.options.both.title", "Both"),
                description: tx(
                  "deployment.options.both.description",
                  "Webchat now + Telegram after connect."
                ),
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
                    background: isSelected
                      ? "rgba(99, 102, 241, 0.1)"
                      : "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    {option.value === "webchat" ? <MessageCircle size={12} /> : <Smartphone size={12} />}
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
            className="rounded border p-2 text-xs flex items-center justify-between gap-2"
            style={{
              borderColor:
                draft.deploymentChoice === "telegram" && !telegramConnected
                  ? "var(--warning)"
                  : "var(--window-document-border)",
              background:
                draft.deploymentChoice === "telegram" && !telegramConnected
                  ? "rgba(245, 158, 11, 0.08)"
                  : "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          >
            <span>{deploymentReadinessText}</span>
            {(draft.deploymentChoice === "telegram" || draft.deploymentChoice === "both") && (
              <button
                onClick={() => onOpenIntegration("telegram")}
                className="desktop-interior-button px-2 py-1 text-[11px] font-bold flex items-center gap-1"
              >
                {tx("deployment.actions.open_telegram", "Open Telegram")}
                <ExternalLink size={11} />
              </button>
            )}
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
            {tx("mode_boundary.section_title", "Work vs private mode boundary")}
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
                {tx("mode_boundary.work.title", "Work context")}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx(
                  "mode_boundary.work.description",
                  "Use for booking execution with connected tools and explicit approvals."
                )}
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
                {tx("mode_boundary.private.title", "Private context")}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx(
                  "mode_boundary.private.description",
                  "Advisory-only planning. Keep private sessions free from external outreach actions."
                )}
              </p>
            </button>
          </div>
          <div
            className="rounded border p-2 text-xs flex items-start gap-2"
            style={{
              borderColor: "var(--warning)",
              background: "rgba(245, 158, 11, 0.08)",
              color: "var(--window-document-text)",
            }}
          >
            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
            {tx(
              "mode_boundary.outbound_calls_note",
              "Outbound appointment calls are planned and remain unavailable in current runtime."
            )}
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
            ? tx("footer.saved_at", `Saved ${new Date(savedAt).toLocaleString()}`, {
                savedAt: new Date(savedAt).toLocaleString(),
              })
            : tx("footer.no_saved_preferences", "No saved setup preferences yet")}
        </div>
        <button
          onClick={saveDraft}
          className="desktop-interior-button px-3 py-1.5 text-xs font-bold"
          style={{ color: "var(--window-document-text)" }}
        >
          {tx("footer.save_button", "Save Setup Preferences")}
        </button>
      </div>
    </div>
  );
}
