"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import type { Id } from "../../../../convex/_generated/dataModel";
import { useTranslation } from "@/contexts/translation-context";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import { SLACK_BRAND_HEX } from "@/tokens/slack";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  Unplug,
  X,
} from "lucide-react";

interface SlackSettingsProps {
  onBack: () => void;
}

type SlackInteractionMode = "mentions_only" | "mentions_and_dm";
type SlackManifestPreset = "v1" | "v2" | "v2_1";
type SlackManifestDownloadFormat = "json" | "yaml";

type SlackConnectionStatus =
  | {
      connected: boolean;
      isExpiringSoon?: boolean;
      canManageSettings?: boolean;
      requiredScopes?: string[];
      interactionMode?: SlackInteractionMode;
      aiAppFeaturesEnabled?: boolean;
      canUsePlatformManaged?: boolean;
      selectedProfileType?: "platform" | "organization";
      profiles?: {
        platform: {
          connected: boolean;
        };
        organization: {
          connected: boolean;
        };
      };
      connection?: {
        id: string;
        providerEmail: string;
        workspaceId: string;
        workspaceName?: string;
        workspaceDomain?: string;
        botUserId?: string;
        appId?: string;
        setupMode?: "platform_managed" | "organization_byoa";
        interactionMode?: SlackInteractionMode;
        aiAppFeaturesEnabled?: boolean;
        profileType?: "platform" | "organization";
        scopes: string[];
        connectedAt: number;
        tokenExpiresAt: number;
        status: string;
      } | null;
    }
  | null
  | undefined;

type SlackSetupConfig =
  | {
      setupMode: "platform_managed" | "organization_byoa";
      interactionMode?: SlackInteractionMode;
      aiAppFeaturesEnabled?: boolean;
      canManageSettings?: boolean;
      canUsePlatformManaged?: boolean;
      byoa: {
        configured: boolean;
        clientId?: string;
        hasClientSecret: boolean;
        hasSigningSecret: boolean;
      };
      activeConnectionProfileType?: "platform" | "organization" | null;
    }
  | null
  | undefined;

type VacationBlockedPeriodDraft = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  recurrence: "none" | "yearly";
};

type SlackVacationPolicyConfig =
  | {
      canManagePolicy: boolean;
      slack?: {
        connected?: boolean;
        workspaceName?: string | null;
        workspaceDomain?: string | null;
        teamId?: string | null;
        routeKey?: string | null;
        channelId?: string | null;
      };
      googleCalendar?: {
        work?: {
          hasConnection?: boolean;
          connectionType?: "personal" | "organizational" | null;
          connectionId?: string | null;
          status?: string | null;
          syncEnabled?: boolean;
          canWriteCalendar?: boolean;
          calendarWriteReady?: boolean;
          email?: string | null;
        };
        blockingCalendarIds?: string[];
        pushCalendarId?: string;
      };
      policy?: {
        exists?: boolean;
        objectId?: string | null;
        timezone?: string;
        maxConcurrentAway?: number;
        minOnDutyTotal?: number;
        pharmacistRoleFloor?: number;
        requestWindow?: {
          minLeadDays?: number;
          maxFutureDays?: number;
        };
        blockedPeriods?: Array<{
          id?: string;
          startDate?: string;
          endDate?: string;
          reason?: string;
          recurrence?: "none" | "yearly";
        }>;
        overrideAuthority?: {
          requireReason?: boolean;
          requireOwnerApproval?: boolean;
        };
        updatedAt?: number | null;
      };
    }
  | null
  | undefined;

const SLACK_SCOPE_FALLBACK = ["app_mentions:read", "channels:history", "channels:read", "chat:write"];

function coerceNonNegativeInteger(input: string, fallback: number): number {
  const parsed = Number.parseInt(input.trim(), 10);
  if (!Number.isFinite(parsed)) {
    return Math.max(0, fallback);
  }
  return Math.max(0, parsed);
}

function normalizeCalendarIdCsv(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );
}

function createEmptyBlockedPeriod(index: number): VacationBlockedPeriodDraft {
  return {
    id: `period-${Date.now()}-${index}`,
    startDate: "",
    endDate: "",
    reason: "",
    recurrence: "none",
  };
}

function interpolateTemplate(
  template: string,
  params?: Record<string, string | number | boolean>
): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (output, [paramKey, paramValue]) =>
      output.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue)),
    template
  );
}

function formatDate(
  timestamp: number | undefined,
  locale: string,
  unknownLabel: string
): string {
  if (!timestamp) return unknownLabel;
  return new Date(timestamp).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function normalizeNonEmptyString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeSlashCommand(value: string | undefined): string | undefined {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return undefined;
  }
  const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  if (withLeadingSlash.includes(" ")) {
    return undefined;
  }
  return withLeadingSlash;
}

function normalizeUrlBase(rawValue: string | undefined): string | undefined {
  if (!rawValue) {
    return undefined;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return undefined;
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function toConvexSiteBaseUrl(rawValue: string | undefined): string | undefined {
  const baseUrl = normalizeUrlBase(rawValue);
  if (!baseUrl) {
    return undefined;
  }
  return baseUrl.replace(".convex.cloud", ".convex.site");
}

function joinBaseUrlPath(
  baseUrl: string | undefined,
  path: string,
  fallbackPath: string
): string {
  if (!baseUrl) {
    return fallbackPath;
  }
  try {
    return new URL(path, `${baseUrl}/`).toString();
  } catch {
    return fallbackPath;
  }
}

function isPublicSlackWebhookUrl(urlValue: string): boolean {
  try {
    const url = new URL(urlValue);
    const host = url.hostname.toLowerCase();
    const isLoopbackHost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0" ||
      host.endsWith(".localhost");

    return url.protocol === "https:" && !isLoopbackHost;
  } catch {
    return false;
  }
}

export function SlackSettings({ onBack }: SlackSettingsProps) {
  const { sessionId } = useAuth();
  const { locale } = useTranslation();
  const { translationsMap } = useNamespaceTranslations("ui.integrations.slack");
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();
  const tx = useCallback(
    (
      key: string,
      fallback: string,
      params?: Record<string, string | number | boolean>
    ) => {
      const fullKey = `ui.integrations.slack.${key}`;
      return interpolateTemplate(translationsMap?.[fullKey] ?? fallback, params);
    },
    [translationsMap]
  );
  const interactionModeLabel = (mode: SlackInteractionMode) =>
    mode === "mentions_and_dm"
      ? tx("labels.mode.mentions_and_dm", "Mentions + App Home DMs (v2)")
      : tx("labels.mode.mentions_only", "Mentions only (v1)");
  const aiFeaturesLabel = (enabled: boolean) =>
    enabled
      ? tx("labels.ai_features.enabled", "Enabled (v2.1)")
      : tx("labels.ai_features.disabled", "Disabled");
  const setupModeLabel = (mode: "platform_managed" | "organization_byoa") =>
    mode === "organization_byoa"
      ? tx("labels.setup_mode.organization", "Organization BYOA app")
      : tx("labels.setup_mode.platform", "Platform-managed app");
  const connectionStateLabel = (isConnectedState: boolean) =>
    isConnectedState
      ? tx("labels.connection.connected", "Connected")
      : tx("labels.connection.not_connected", "Not connected");
  const yesNoLabel = (value: boolean) => (value ? tx("labels.yes", "yes") : tx("labels.no", "no"));
  const [isConnecting, setIsConnecting] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [setupMode, setSetupMode] = useState<"platform_managed" | "organization_byoa">(
    "platform_managed"
  );
  const [interactionMode, setInteractionMode] = useState<SlackInteractionMode>(
    "mentions_only"
  );
  const [manifestDownloadFormat, setManifestDownloadFormat] =
    useState<SlackManifestDownloadFormat>("json");
  const [showManifestWizard, setShowManifestWizard] = useState(false);
  const [manifestWizardStep, setManifestWizardStep] = useState<1 | 2 | 3>(1);
  const [manifestWizardPreset, setManifestWizardPreset] =
    useState<SlackManifestPreset>("v1");
  const [manifestWizardProfileType, setManifestWizardProfileType] = useState<
    "platform" | "organization"
  >("platform");
  const [manifestWizardAppName, setManifestWizardAppName] = useState("");
  const [aiAppFeaturesEnabled, setAiAppFeaturesEnabled] = useState(false);
  const [byoaClientId, setByoaClientId] = useState("");
  const [byoaClientSecret, setByoaClientSecret] = useState("");
  const [byoaSigningSecret, setByoaSigningSecret] = useState("");
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [setupHydrated, setSetupHydrated] = useState(false);
  const [policyHydrated, setPolicyHydrated] = useState(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policyTimezone, setPolicyTimezone] = useState("UTC");
  const [policyMaxConcurrentAway, setPolicyMaxConcurrentAway] = useState("1");
  const [policyMinOnDutyTotal, setPolicyMinOnDutyTotal] = useState("1");
  const [policyPharmacistRoleFloor, setPolicyPharmacistRoleFloor] = useState("1");
  const [policyMinLeadDays, setPolicyMinLeadDays] = useState("7");
  const [policyMaxFutureDays, setPolicyMaxFutureDays] = useState("365");
  const [policySlackChannelId, setPolicySlackChannelId] = useState("");
  const [policyGoogleBlockingCalendarIds, setPolicyGoogleBlockingCalendarIds] =
    useState("primary");
  const [policyGooglePushCalendarId, setPolicyGooglePushCalendarId] =
    useState("primary");
  const [policyOverrideRequireReason, setPolicyOverrideRequireReason] =
    useState(true);
  const [policyOverrideRequireOwnerApproval, setPolicyOverrideRequireOwnerApproval] =
    useState(false);
  const [policyBlockedPeriods, setPolicyBlockedPeriods] = useState<
    VacationBlockedPeriodDraft[]
  >([]);

  const connectionStatus = useQuery(
    api.oauth.slack.getSlackConnectionStatus as any,
    sessionId ? ({ sessionId } as any) : "skip"
  ) as SlackConnectionStatus;
  const setupConfig = useQuery(
    api.oauth.slack.getSlackSetupConfig as any,
    sessionId ? ({ sessionId } as any) : "skip"
  ) as SlackSetupConfig;
  const vacationPolicyConfig = useQuery(
    api.oauth.slack.getPharmacistVacationPolicyConfig as any,
    sessionId ? ({ sessionId } as any) : "skip"
  ) as SlackVacationPolicyConfig;

  const initiateSlackOAuth = useMutation(api.oauth.slack.initiateSlackOAuth as any);
  const disconnectSlack = useMutation(api.oauth.slack.disconnectSlack as any);
  const saveSlackSetupConfig = useMutation(api.oauth.slack.saveSlackSetupConfig as any);
  const saveVacationPolicyConfig = useMutation(
    api.oauth.slack.savePharmacistVacationPolicyConfig as any
  );

  const isLoading = connectionStatus === undefined;
  const isConnected = connectionStatus?.connected === true;
  const connection = connectionStatus?.connection ?? null;
  const byoaConfigured = setupConfig?.byoa?.configured === true;
  const connectedProfileType = connection?.profileType || null;
  const canManageSettings =
    setupConfig?.canManageSettings ??
    setupConfig?.canUsePlatformManaged ??
    connectionStatus?.canManageSettings ??
    connectionStatus?.canUsePlatformManaged ??
    false;
  const settingsReady = setupConfig !== undefined;
  const policyConfigReady = vacationPolicyConfig !== undefined;

  const grantedScopes = useMemo(
    () => new Set(connection?.scopes ?? []),
    [connection?.scopes]
  );
  const requiredScopes = connectionStatus?.requiredScopes ?? SLACK_SCOPE_FALLBACK;
  const missingRequiredScopes = useMemo(
    () => requiredScopes.filter((scope) => !grantedScopes.has(scope)),
    [requiredScopes, grantedScopes]
  );
  const slashCommandsEnabled = requiredScopes.includes("commands");
  const googleWorkReadiness = vacationPolicyConfig?.googleCalendar?.work;
  const policySlackScope = vacationPolicyConfig?.slack;
  const existingPolicy = vacationPolicyConfig?.policy;
  const policyBlockedPeriodsCount = policyBlockedPeriods.filter(
    (period) => period.startDate && period.endDate
  ).length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const workspace = params.get("workspace");

    if (success === "slack_connected") {
      notification.success(
        tx("notifications.connected.title", "Slack Connected"),
        workspace
          ? tx("notifications.connected.workspace", "Connected workspace: {workspace}", {
              workspace: decodeURIComponent(workspace),
            })
          : tx(
              "notifications.connected.success",
              "Slack workspace connected successfully"
            )
      );
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (error) {
      notification.error(
        tx("notifications.connection_failed.title", "Slack Connection Failed"),
        decodeURIComponent(error)
      );
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [notification, tx]);

  useEffect(() => {
    if (!setupConfig || setupHydrated) return;
    setSetupMode(setupConfig.setupMode);
    setInteractionMode(setupConfig.interactionMode || "mentions_only");
    setAiAppFeaturesEnabled(setupConfig.aiAppFeaturesEnabled === true);
    setByoaClientId(setupConfig.byoa?.clientId || "");
    setSetupHydrated(true);
  }, [setupConfig, setupHydrated]);

  useEffect(() => {
    if (!vacationPolicyConfig || policyHydrated) return;
    const hydratedPolicy = vacationPolicyConfig.policy;
    const hydratedGoogle = vacationPolicyConfig.googleCalendar;
    const hydratedSlack = vacationPolicyConfig.slack;

    setPolicyTimezone(hydratedPolicy?.timezone || "UTC");
    setPolicyMaxConcurrentAway(
      String(hydratedPolicy?.maxConcurrentAway ?? 1)
    );
    setPolicyMinOnDutyTotal(String(hydratedPolicy?.minOnDutyTotal ?? 1));
    setPolicyPharmacistRoleFloor(
      String(hydratedPolicy?.pharmacistRoleFloor ?? 1)
    );
    setPolicyMinLeadDays(
      String(hydratedPolicy?.requestWindow?.minLeadDays ?? 7)
    );
    setPolicyMaxFutureDays(
      String(hydratedPolicy?.requestWindow?.maxFutureDays ?? 365)
    );
    setPolicySlackChannelId(hydratedSlack?.channelId || "");
    setPolicyGoogleBlockingCalendarIds(
      (hydratedGoogle?.blockingCalendarIds || ["primary"]).join(", ")
    );
    setPolicyGooglePushCalendarId(hydratedGoogle?.pushCalendarId || "primary");
    setPolicyOverrideRequireReason(
      hydratedPolicy?.overrideAuthority?.requireReason !== false
    );
    setPolicyOverrideRequireOwnerApproval(
      hydratedPolicy?.overrideAuthority?.requireOwnerApproval === true
    );
    setPolicyBlockedPeriods(
      (hydratedPolicy?.blockedPeriods || []).map((period, index) => ({
        id: period.id || `period-${Date.now()}-${index}`,
        startDate: period.startDate || "",
        endDate: period.endDate || "",
        reason: period.reason || "",
        recurrence: period.recurrence === "yearly" ? "yearly" : "none",
      }))
    );
    setPolicyHydrated(true);
  }, [policyHydrated, vacationPolicyConfig]);

  const handleAddBlockedPeriod = () => {
    setPolicyBlockedPeriods((current) => [
      ...current,
      createEmptyBlockedPeriod(current.length + 1),
    ]);
  };

  const handleUpdateBlockedPeriod = (
    index: number,
    patch: Partial<VacationBlockedPeriodDraft>
  ) => {
    setPolicyBlockedPeriods((current) =>
      current.map((period, periodIndex) =>
        periodIndex === index ? { ...period, ...patch } : period
      )
    );
  };

  const handleRemoveBlockedPeriod = (index: number) => {
    setPolicyBlockedPeriods((current) =>
      current.filter((_, periodIndex) => periodIndex !== index)
    );
  };

  const handleSaveVacationPolicy = async () => {
    if (!sessionId) return;
    if (!canManageSettings) {
      notification.error(
        tx("notifications.restricted.title", "Restricted"),
        tx(
          "notifications.restricted.detail",
          "Only super admins can change Slack setup settings."
        )
      );
      return;
    }

    const maxConcurrentAway = coerceNonNegativeInteger(
      policyMaxConcurrentAway,
      1
    );
    const minOnDutyTotal = coerceNonNegativeInteger(policyMinOnDutyTotal, 1);
    const pharmacistRoleFloor = coerceNonNegativeInteger(
      policyPharmacistRoleFloor,
      1
    );
    const requestWindowMinLeadDays = coerceNonNegativeInteger(policyMinLeadDays, 7);
    const requestWindowMaxFutureDays = coerceNonNegativeInteger(
      policyMaxFutureDays,
      365
    );
    const blockedPeriods = policyBlockedPeriods
      .filter((period) => period.startDate && period.endDate)
      .map((period) => ({
        id: period.id,
        startDate: period.startDate,
        endDate: period.endDate,
        reason: period.reason.trim() || undefined,
        recurrence: period.recurrence,
      }));

    setIsSavingPolicy(true);
    try {
      await saveVacationPolicyConfig({
        sessionId,
        policyObjectId: existingPolicy?.objectId || undefined,
        timezone: policyTimezone.trim() || undefined,
        maxConcurrentAway,
        minOnDutyTotal,
        pharmacistRoleFloor,
        requestWindowMinLeadDays,
        requestWindowMaxFutureDays,
        slackChannelId: policySlackChannelId.trim() || undefined,
        googleBlockingCalendarIds: normalizeCalendarIdCsv(
          policyGoogleBlockingCalendarIds
        ),
        googlePushCalendarId: policyGooglePushCalendarId.trim() || undefined,
        overrideRequireReason: policyOverrideRequireReason,
        overrideRequireOwnerApproval: policyOverrideRequireOwnerApproval,
        blockedPeriods,
      });
      notification.success(
        tx("policy.saved.title", "Vacation policy saved"),
        tx(
          "policy.saved.detail",
          "Pharmacist vacation policy settings were saved for this Slack workspace."
        )
      );
    } catch (error) {
      notification.error(
        tx("policy.saved_failed.title", "Policy save failed"),
        error instanceof Error
          ? error.message
          : tx(
              "policy.saved_failed.detail",
              "Could not save pharmacist vacation policy settings."
            )
      );
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleSaveSetup = async () => {
    if (!sessionId) return;
    if (!canManageSettings) {
      notification.error(
        tx("notifications.restricted.title", "Restricted"),
        tx(
          "notifications.restricted.detail",
          "Only super admins can change Slack setup settings."
        )
      );
      return;
    }
    setIsSavingSetup(true);
    try {
      await saveSlackSetupConfig({
        sessionId,
        setupMode,
        interactionMode,
        aiAppFeaturesEnabled,
        byoaClientId: byoaClientId.trim() || undefined,
        byoaClientSecret: byoaClientSecret.trim() || undefined,
        byoaSigningSecret: byoaSigningSecret.trim() || undefined,
      });

      if (setupMode === "organization_byoa") {
        notification.success(
          tx("notifications.byoa_saved.title", "Slack BYOA Saved"),
          tx(
            "notifications.byoa_saved.detail",
            "Organization Slack app credentials, interaction mode, and AI app mode saved for the next connect/reconnect."
          )
        );
      } else {
        notification.success(
          tx("notifications.platform_mode_active.title", "Platform Mode Active"),
          tx(
            "notifications.platform_mode_active.detail",
            "Connect will now use the platform-managed Slack app with the selected interaction and AI app modes."
          )
        );
      }

      setByoaClientSecret("");
      setByoaSigningSecret("");
    } catch (err) {
      notification.error(
        tx("notifications.save_failed.title", "Save Failed"),
        err instanceof Error
          ? err.message
          : tx(
              "notifications.save_failed.detail",
              "Could not save Slack setup config"
            )
      );
    } finally {
      setIsSavingSetup(false);
    }
  };

  const handleConnect = async () => {
    if (!sessionId) return;
    if (setupMode === "organization_byoa" && !byoaConfigured) {
      notification.error(
        tx("notifications.byoa_required.title", "BYOA Setup Required"),
        tx(
          "notifications.byoa_required.detail",
          "Save your organization Slack app client ID, client secret, and signing secret before connecting."
        )
      );
      return;
    }
    setIsConnecting(true);
    try {
      const result = await initiateSlackOAuth({
        sessionId,
        connectionType: "organizational",
      });
      window.location.href = result.authUrl;
    } catch (err) {
      notification.error(
        tx("notifications.connection_error.title", "Connection Error"),
        err instanceof Error
          ? err.message
          : tx(
              "notifications.connection_error.detail",
              "Failed to start Slack OAuth"
            )
      );
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId || !connection?.id) return;

    const confirmed = await confirmDialog.confirm({
      title: tx("confirm.disconnect.title", "Disconnect Slack"),
      message: tx(
        "confirm.disconnect.message",
        "Disconnecting removes only the currently selected profile connection and stops inbound events/outbound replies for that profile. Continue?"
      ),
      confirmText: tx("confirm.disconnect.confirm", "Disconnect"),
      cancelText: tx("confirm.disconnect.cancel", "Cancel"),
      confirmVariant: "primary",
    });

    if (!confirmed) return;

    try {
      await disconnectSlack({
        sessionId,
        connectionId: connection.id as Id<"oauthConnections">,
      });
      notification.success(
        tx("notifications.disconnected.title", "Disconnected"),
        tx("notifications.disconnected.detail", "Slack integration disconnected")
      );
    } catch (err) {
      notification.error(
        tx("notifications.disconnect_failed.title", "Disconnect Failed"),
        err instanceof Error
          ? err.message
          : tx(
              "notifications.disconnect_failed.detail",
              "Could not disconnect Slack"
            )
      );
    }
  };

  const browserBaseUrl =
    typeof window !== "undefined" ? normalizeUrlBase(window.location.origin) : undefined;
  const appBaseUrl = normalizeUrlBase(process.env.NEXT_PUBLIC_APP_URL) || browserBaseUrl;
  const webhookBaseUrl =
    toConvexSiteBaseUrl(process.env.NEXT_PUBLIC_CONVEX_URL) || browserBaseUrl;

  const callbackUrl = joinBaseUrlPath(
    appBaseUrl,
    "/integrations/slack/oauth/callback",
    "/integrations/slack/oauth/callback"
  );
  const eventsUrl = joinBaseUrlPath(
    webhookBaseUrl,
    "/integrations/slack/events",
    "/integrations/slack/events"
  );
  const slashCommandsUrl = joinBaseUrlPath(
    webhookBaseUrl,
    "/integrations/slack/commands",
    "/integrations/slack/commands"
  );
  const interactivityUrl = joinBaseUrlPath(
    webhookBaseUrl,
    "/integrations/slack/interactivity",
    "/integrations/slack/interactivity"
  );
  const eventsUrlIsPublicForSlack = isPublicSlackWebhookUrl(eventsUrl);
  const isByoaModeForManifest = setupMode === "organization_byoa";
  const canDownloadManifestPresets = canManageSettings || isByoaModeForManifest;
  const manifestBaseAppName = isByoaModeForManifest
    ? tx("manifest.identity.byoa.app_name", "Organization Agent")
    : normalizeNonEmptyString(process.env.NEXT_PUBLIC_SLACK_PLATFORM_APP_MANIFEST_NAME) ||
      tx("manifest.identity.platform.app_name", "VC83 Agent");
  const manifestBotDisplayName = isByoaModeForManifest
    ? tx("manifest.identity.byoa.bot_name", "Org Agent")
    : normalizeNonEmptyString(process.env.NEXT_PUBLIC_SLACK_PLATFORM_BOT_DISPLAY_NAME) ||
      manifestBaseAppName;
  const manifestSlashCommand =
    normalizeSlashCommand(process.env.NEXT_PUBLIC_SLACK_MANIFEST_SLASH_COMMAND) ||
    (isByoaModeForManifest ? "/agent" : "/vc83");
  const slackAppsUrl = "https://api.slack.com/apps";
  const slackOAuthDocsUrl = "https://api.slack.com/authentication/oauth-v2";
  const slackManifestDocsUrl = "https://api.slack.com/reference/manifests";
  const slackAiAppsHelpUrl =
    "https://slack.com/help/articles/33076000248851-Understand-AI-apps-in-Slack";
  const slackAiDeveloperDocsUrl = "https://docs.slack.dev/ai/developing-ai-apps/";
  const slackAiDisplaySettingsDocsUrl =
    "https://slack.com/help/articles/33077521383059-Display-AI-apps-in-Slack";
  const slackAppHomeDocsUrl = "https://api.slack.com/surfaces/tabs";
  const slackEventsApiDocsUrl = "https://api.slack.com/apis/connections/events-api";
  const slackScopesDocsUrl = "https://api.slack.com/scopes";
  const slackMessageImDocsUrl = "https://docs.slack.dev/reference/events/message.im/";
  const slackAssistantThreadStartedDocsUrl =
    "https://docs.slack.dev/reference/events/assistant_thread_started/";
  const slackAssistantThreadContextChangedDocsUrl =
    "https://docs.slack.dev/reference/events/assistant_thread_context_changed/";

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notification.success(
        tx("notifications.copied.title", "Copied"),
        tx("notifications.copied.detail", "{label} copied to clipboard", {
          label,
        })
      );
    } catch {
      notification.error(
        tx("notifications.copy_failed.title", "Copy Failed"),
        tx(
          "notifications.copy_failed.detail",
          "Clipboard is unavailable in this browser"
        )
      );
    }
  };

  const buildSlackManifestScopes = (preset: SlackManifestPreset): string[] => {
    const scopes = [
      "app_mentions:read",
      "channels:history",
      "channels:read",
      "chat:write",
    ];
    if (preset !== "v1") {
      scopes.push("im:history");
    }
    if (preset === "v2_1") {
      scopes.push("assistant:write");
    }
    if (slashCommandsEnabled) {
      scopes.push("commands");
    }
    return scopes;
  };

  const buildSlackManifestBotEvents = (preset: SlackManifestPreset): string[] => {
    const events = ["app_mention"];
    if (preset !== "v1") {
      events.push("message.im");
    }
    if (preset === "v2_1") {
      events.push("assistant_thread_started", "assistant_thread_context_changed");
    }
    return events;
  };

  const buildSlackManifestForPreset = (
    preset: SlackManifestPreset,
    options?: { appName?: string }
  ) => {
    const resolvedAppName =
      normalizeNonEmptyString(options?.appName) || manifestBaseAppName;
    const presetLabel =
      preset === "v1"
        ? tx("manifest.preset.v1.label", "Mentions Only")
        : preset === "v2"
          ? tx("manifest.preset.v2.label", "Mentions + App Home DMs")
          : tx("manifest.preset.v2_1.label", "Agentic Slack");
    const botEvents = buildSlackManifestBotEvents(preset);
    const botScopes = buildSlackManifestScopes(preset);

    const manifest: {
      display_information: {
        name: string;
        description: string;
        background_color: string;
      };
      features: {
        bot_user: {
          display_name: string;
          always_online: boolean;
        };
        app_home: {
          home_tab_enabled: boolean;
          messages_tab_enabled: boolean;
          messages_tab_read_only_enabled: boolean;
        };
        assistant_view?: {
          assistant_description: string;
          suggested_prompts: Array<{
            title: string;
            message: string;
          }>;
        };
        slash_commands?: Array<{
          command: string;
          url: string;
          description: string;
          should_escape: boolean;
        }>;
      };
      oauth_config: {
        redirect_urls: string[];
        scopes: {
          bot: string[];
        };
      };
      settings: {
        event_subscriptions: {
          request_url: string;
          bot_events: string[];
        };
        interactivity: {
          is_enabled: boolean;
          request_url: string;
        };
        org_deploy_enabled: boolean;
        socket_mode_enabled: boolean;
        token_rotation_enabled: boolean;
      };
    } = {
      display_information: {
        name: `${resolvedAppName} (${presetLabel})`,
        description: tx(
          "manifest.description",
          "Slack integration preset: {presetLabel}",
          { presetLabel }
        ),
        background_color: SLACK_BRAND_HEX,
      },
      features: {
        bot_user: {
          display_name: resolvedAppName,
          always_online: false,
        },
        app_home: {
          home_tab_enabled: true,
          messages_tab_enabled: preset !== "v1",
          messages_tab_read_only_enabled: false,
        },
      },
      oauth_config: {
        redirect_urls: [callbackUrl],
        scopes: {
          bot: botScopes,
        },
      },
      settings: {
        event_subscriptions: {
          request_url: eventsUrl,
          bot_events: botEvents,
        },
        interactivity: {
          is_enabled: true,
          request_url: interactivityUrl,
        },
        org_deploy_enabled: false,
        socket_mode_enabled: false,
        token_rotation_enabled: false,
      },
    };

    if (slashCommandsEnabled) {
      manifest.features.slash_commands = [
        {
          command: manifestSlashCommand,
          url: slashCommandsUrl,
          description: tx(
            "manifest.slash_command.description",
            "Send a message to VC83 agent"
          ),
          should_escape: false,
        },
      ];
    }

    if (preset === "v2_1") {
      manifest.features.assistant_view = {
        assistant_description: tx(
          "manifest.assistant_view.description",
          "VC83 AI assistant for channel mentions and App Home conversations."
        ),
        suggested_prompts: [
          {
            title: tx("manifest.assistant_view.prompt.status", "Project status"),
            message: tx(
              "manifest.assistant_view.prompt.status.message",
              "Give me a quick status summary for active workstreams."
            ),
          },
          {
            title: tx("manifest.assistant_view.prompt.risks", "Top risks"),
            message: tx(
              "manifest.assistant_view.prompt.risks.message",
              "What are the top operational risks I should review today?"
            ),
          },
          {
            title: tx("manifest.assistant_view.prompt.handoff", "Prepare handoff"),
            message: tx(
              "manifest.assistant_view.prompt.handoff.message",
              "Draft a concise handoff note for the next operator shift."
            ),
          },
        ],
      };
    }

    return manifest;
  };

  const validateGeneratedSlackManifest = (
    manifest: ReturnType<typeof buildSlackManifestForPreset>
  ): void => {
    const botScopes = new Set(manifest.oauth_config.scopes.bot);
    const hasAssistantScope = botScopes.has("assistant:write");
    const hasAssistantView = Boolean(manifest.features.assistant_view);

    if (hasAssistantScope && !hasAssistantView) {
      throw new Error(
        tx(
          "notifications.download_failed.assistant_view_required",
          "Manifest preset is invalid: assistant:write requires features.assistant_view."
        )
      );
    }

    if (!hasAssistantScope && hasAssistantView) {
      throw new Error(
        tx(
          "notifications.download_failed.assistant_scope_required",
          "Manifest preset is invalid: features.assistant_view requires assistant:write."
        )
      );
    }
  };

  const serializeYamlScalar = (value: string | number | boolean | null): string => {
    if (value === null) return "null";
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return `'${value.replace(/'/g, "''")}'`;
  };

  const serializeYamlValue = (value: unknown, indentLevel = 0): string => {
    const indent = "  ".repeat(indentLevel);

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return `${indent}${serializeYamlScalar(
        value as string | number | boolean | null
      )}`;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return `${indent}[]`;
      }
      return value
        .map((item) => {
          if (
            item === null ||
            typeof item === "string" ||
            typeof item === "number" ||
            typeof item === "boolean"
          ) {
            return `${indent}- ${serializeYamlScalar(
              item as string | number | boolean | null
            )}`;
          }
          return `${indent}-\n${serializeYamlValue(item, indentLevel + 1)}`;
        })
        .join("\n");
    }

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>).filter(
        ([, fieldValue]) => fieldValue !== undefined
      );
      if (entries.length === 0) {
        return `${indent}{}`;
      }
      return entries
        .map(([key, fieldValue]) => {
          if (
            fieldValue === null ||
            typeof fieldValue === "string" ||
            typeof fieldValue === "number" ||
            typeof fieldValue === "boolean"
          ) {
            return `${indent}${key}: ${serializeYamlScalar(
              fieldValue as string | number | boolean | null
            )}`;
          }
          if (Array.isArray(fieldValue) && fieldValue.length === 0) {
            return `${indent}${key}: []`;
          }
          return `${indent}${key}:\n${serializeYamlValue(
            fieldValue,
            indentLevel + 1
          )}`;
        })
        .join("\n");
    }

    return `${indent}${serializeYamlScalar(String(value))}`;
  };

  const openSlackManifestWizard = (preset: SlackManifestPreset) => {
    setManifestWizardPreset(preset);
    setManifestWizardProfileType(
      isByoaModeForManifest ? "organization" : "platform"
    );
    setManifestWizardAppName(manifestBaseAppName);
    setManifestWizardStep(1);
    setShowManifestWizard(true);
  };

  const continueManifestWizardToReview = () => {
    const appName = normalizeNonEmptyString(manifestWizardAppName);
    if (!appName) {
      notification.error(
        tx("notifications.download_failed.title", "Download Failed"),
        tx(
          "notifications.download_failed.app_name_required",
          "Manifest export requires an app name."
        )
      );
      return;
    }
    setManifestWizardAppName(appName);
    setManifestWizardStep(3);
  };

  const downloadSlackManifestFromWizard = () => {
    if (typeof document === "undefined") {
      return;
    }

    try {
      const appName = normalizeNonEmptyString(manifestWizardAppName);
      if (!appName) {
        throw new Error(
          tx(
            "notifications.download_failed.app_name_required",
            "Manifest export requires an app name."
          )
        );
      }

      if (
        manifestWizardProfileType === "platform" &&
        !canManageSettings
      ) {
        throw new Error(
          tx(
            "notifications.download_failed.platform_manifest_restricted",
            "Manifest export for the platform-managed Slack app is restricted to super admins."
          )
        );
      }

      if (!canDownloadManifestPresets) {
        throw new Error(
          tx(
            "notifications.download_failed.platform_manifest_restricted",
            "Manifest export for the platform-managed Slack app is restricted to super admins."
          )
        );
      }

      if (!eventsUrlIsPublicForSlack) {
        throw new Error(
          tx(
            "notifications.download_failed.events_url_public_required",
            "Manifest export blocked: Slack request URL must be a public HTTPS URL. Current Events URL: {eventsUrl}. Set NEXT_PUBLIC_CONVEX_URL to your Convex deployment URL (or use an HTTPS tunnel) and try again.",
            { eventsUrl }
          )
        );
      }

      const manifest = buildSlackManifestForPreset(manifestWizardPreset, {
        appName,
      });
      validateGeneratedSlackManifest(manifest);
      const isYaml = manifestDownloadFormat === "yaml";
      const content = isYaml
        ? `# VC83 Slack manifest preset: ${manifestWizardPreset}\n${serializeYamlValue(
            manifest
          )}\n`
        : JSON.stringify(manifest, null, 2);
      const blob = new Blob([content], {
        type: isYaml ? "application/yaml" : "application/json",
      });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      const appNameSlug = appName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      anchor.download = `vc83-slack-manifest-${manifestWizardPreset}-${appNameSlug || "app"}.${isYaml ? "yaml" : "json"}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      notification.success(
        tx("notifications.manifest_downloaded.title", "Manifest Downloaded"),
        tx(
          "notifications.manifest_downloaded.detail",
          "Slack {preset} manifest downloaded as {format}.",
          { preset: manifestWizardPreset, format: isYaml ? "YAML" : "JSON" }
        )
      );
      setShowManifestWizard(false);
    } catch (error) {
      notification.error(
        tx("notifications.download_failed.title", "Download Failed"),
        error instanceof Error
          ? error.message
          : tx(
              "notifications.download_failed.detail",
              "Could not generate Slack manifest"
            )
      );
    }
  };

  const setupValues = [
    { label: tx("setup_packet.oauth_callback_url", "OAuth Callback URL"), value: callbackUrl },
    { label: tx("setup_packet.events_request_url", "Events Request URL"), value: eventsUrl },
    {
      label: tx("setup_packet.interactivity_url", "Interactivity URL"),
      value: interactivityUrl,
    },
    {
      label: tx("setup_packet.slash_commands_url", "Slash Commands URL"),
      value: slashCommandsEnabled
        ? slashCommandsUrl
        : tx("setup_packet.slash_commands_disabled", "Disabled (commands scope off)"),
      copyable: slashCommandsEnabled,
    },
  ];

  const isByoaMode = setupMode === "organization_byoa";
  const effectiveInteractionMode: SlackInteractionMode = canManageSettings
    ? interactionMode
    : setupConfig?.interactionMode ??
      connectionStatus?.interactionMode ??
      interactionMode;
  const effectiveAiAppFeaturesEnabled = canManageSettings
    ? aiAppFeaturesEnabled
    : setupConfig?.aiAppFeaturesEnabled ??
      connectionStatus?.aiAppFeaturesEnabled ??
      connection?.aiAppFeaturesEnabled ??
      false;
  const isDmMode = effectiveInteractionMode === "mentions_and_dm";
  const isAiAppFeaturesEnabled = effectiveAiAppFeaturesEnabled;
  const platformProfileConnected = connectionStatus?.profiles?.platform.connected === true;
  const organizationProfileConnected =
    connectionStatus?.profiles?.organization.connected === true;
  const anyProfileConnected = platformProfileConnected || organizationProfileConnected;
  const connectButtonLabel = isByoaMode
    ? tx("actions.connect_byoa_profile", "Connect Org BYOA Profile")
    : tx("actions.connect_platform_profile", "Connect Platform Profile");
  const reconnectButtonLabel = isByoaMode
    ? tx("actions.reconnect_byoa_profile", "Reconnect Org BYOA Profile")
    : tx("actions.reconnect_platform_profile", "Reconnect Platform Profile");
  const connectTargetPillLabel = isByoaMode
    ? tx("labels.connect_target.byoa", "BYOA")
    : tx("labels.connect_target.platform", "PLATFORM");
  const connectTargetPillStyle = isByoaMode
    ? {
        background: "var(--success)",
        color: "var(--shell-on-accent)",
        borderColor: "var(--shell-on-accent)",
      }
    : {
        background: "var(--shell-text)",
        color: "var(--shell-surface)",
        borderColor: "var(--shell-surface)",
      };
  const connectDisabled = !settingsReady || isConnecting || (isByoaMode && !byoaConfigured);
  const manifestWizardWorkspaceLabel =
    connection?.workspaceName ||
    connection?.workspaceDomain ||
    connection?.workspaceId ||
    tx("manifest.wizard.workspace.pending", "Workspace not connected yet");
  const manifestWizardModal =
    showManifestWizard && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ background: "var(--modal-overlay-bg)" }}
            onClick={() => setShowManifestWizard(false)}
          >
            <div
              className="w-full max-w-3xl max-h-[92vh] border rounded flex flex-col"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                boxShadow: "var(--modal-shadow)",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className="px-5 py-4 border-b flex items-start justify-between gap-3"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div>
                  <p className="text-base font-bold" style={{ color: "var(--window-document-text)" }}>
                    {tx("manifest.wizard.title", "Slack Manifest Wizard")}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    {tx(
                      "manifest.wizard.step_indicator",
                      "Step {step} of 3",
                      { step: manifestWizardStep }
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowManifestWizard(false)}
                  className="p-2 border rounded"
                  style={{
                    borderColor: "var(--window-document-border)",
                    color: "var(--window-document-text)",
                    background: "var(--window-document-bg)",
                  }}
                  aria-label={tx("actions.close", "Close")}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                {manifestWizardStep === 1 && (
                  <section
                    className="p-4 border rounded space-y-3"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg-elevated)",
                    }}
                  >
                    <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                      {tx("manifest.wizard.workspace.title", "Workspace Context")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "manifest.wizard.workspace.subtitle",
                        "Confirm target profile/workspace before generating a manifest."
                      )}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div
                        className="p-3 border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        <p className="font-bold">{tx("manifest.wizard.profile", "Profile")}</p>
                        <p className="mt-1">
                          {manifestWizardProfileType === "organization"
                            ? tx("labels.setup_mode.organization", "Organization BYOA app")
                            : tx("labels.setup_mode.platform", "Platform-managed app")}
                        </p>
                      </div>
                      <div
                        className="p-3 border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        <p className="font-bold">{tx("manifest.wizard.workspace", "Workspace")}</p>
                        <p className="mt-1">{manifestWizardWorkspaceLabel}</p>
                      </div>
                    </div>
                  </section>
                )}

                {manifestWizardStep === 2 && (
                  <section
                    className="p-4 border rounded space-y-4"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg-elevated)",
                    }}
                  >
                    <div>
                      <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                        {tx("manifest.wizard.config.title", "Manifest Basics")}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                        {tx(
                          "manifest.wizard.config.subtitle",
                          "App name is required. Preset and format remain configurable controls."
                        )}
                      </p>
                    </div>
                    <div>
                      <label
                        className="text-xs font-bold"
                        style={{ color: "var(--window-document-text)" }}
                      >
                        {tx("manifest.wizard.app_name", "App Name")}
                      </label>
                      <input
                        value={manifestWizardAppName}
                        onChange={(event) => setManifestWizardAppName(event.target.value)}
                        placeholder={tx("manifest.wizard.app_name.placeholder", "VC83 Agent")}
                        className="mt-1 w-full px-3 py-2 border rounded text-sm"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        {tx("manifest.wizard.preset", "Preset")}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {(["v1", "v2", "v2_1"] as SlackManifestPreset[]).map((preset) => (
                          <button
                            key={`wizard-preset-${preset}`}
                            onClick={() => setManifestWizardPreset(preset)}
                            className="px-2 py-1 border rounded font-bold"
                            style={{
                              borderColor:
                                manifestWizardPreset === preset
                                  ? "var(--success)"
                                  : "var(--window-document-border)",
                              background:
                                manifestWizardPreset === preset
                                  ? "var(--success-bg)"
                                  : "var(--window-document-bg)",
                              color: "var(--window-document-text)",
                            }}
                          >
                            {preset === "v1"
                              ? tx("manifest.preset.v1.label", "Mentions Only")
                              : preset === "v2"
                                ? tx("manifest.preset.v2.label", "Mentions + App Home DMs")
                                : tx("manifest.preset.v2_1.label", "Agentic Slack")}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        {tx("manifest.wizard.format", "Format")}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          onClick={() => setManifestDownloadFormat("json")}
                          className="px-2 py-1 border rounded font-bold"
                          style={{
                            borderColor:
                              manifestDownloadFormat === "json"
                                ? "var(--success)"
                                : "var(--window-document-border)",
                            background:
                              manifestDownloadFormat === "json"
                                ? "var(--success-bg)"
                                : "var(--window-document-bg)",
                            color: "var(--window-document-text)",
                          }}
                        >
                          {tx("labels.format.json", "JSON")}
                        </button>
                        <button
                          onClick={() => setManifestDownloadFormat("yaml")}
                          className="px-2 py-1 border rounded font-bold"
                          style={{
                            borderColor:
                              manifestDownloadFormat === "yaml"
                                ? "var(--success)"
                                : "var(--window-document-border)",
                            background:
                              manifestDownloadFormat === "yaml"
                                ? "var(--success-bg)"
                                : "var(--window-document-bg)",
                            color: "var(--window-document-text)",
                          }}
                        >
                          {tx("labels.format.yaml", "YAML")}
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {manifestWizardStep === 3 && (
                  <section
                    className="p-4 border rounded space-y-3 text-xs"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg-elevated)",
                    }}
                  >
                    <p className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
                      {tx("manifest.wizard.review.title", "Review and Export")}
                    </p>
                    <p style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "manifest.wizard.review.subtitle",
                        "Confirm these values before downloading your Slack manifest."
                      )}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 border rounded" style={{ borderColor: "var(--window-document-border)" }}>
                        <span className="font-bold">{tx("manifest.wizard.app_name", "App Name")}: </span>
                        {manifestWizardAppName}
                      </div>
                      <div className="p-2 border rounded" style={{ borderColor: "var(--window-document-border)" }}>
                        <span className="font-bold">{tx("manifest.wizard.preset", "Preset")}: </span>
                        {manifestWizardPreset}
                      </div>
                      <div className="p-2 border rounded" style={{ borderColor: "var(--window-document-border)" }}>
                        <span className="font-bold">{tx("manifest.wizard.format", "Format")}: </span>
                        {manifestDownloadFormat.toUpperCase()}
                      </div>
                      <div className="p-2 border rounded" style={{ borderColor: "var(--window-document-border)" }}>
                        <span className="font-bold">{tx("manifest.wizard.workspace", "Workspace")}: </span>
                        {manifestWizardWorkspaceLabel}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                        {tx("manifest.wizard.endpoints", "Endpoint Bundle")}
                      </p>
                      <p className="font-mono break-all">{callbackUrl}</p>
                      <p className="font-mono break-all">{eventsUrl}</p>
                      <p className="font-mono break-all">{slashCommandsUrl}</p>
                      <p className="font-mono break-all">{interactivityUrl}</p>
                    </div>
                  </section>
                )}
              </div>

              <div
                className="px-5 py-3 border-t flex flex-wrap items-center justify-between gap-2"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div className="flex items-center gap-2">
                  {manifestWizardStep > 1 && (
                    <button
                      onClick={() => setManifestWizardStep((manifestWizardStep - 1) as 1 | 2 | 3)}
                      className="px-3 py-2 text-xs font-bold border rounded"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      {tx("actions.back", "Back")}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {manifestWizardStep === 1 && (
                    <button
                      onClick={() => setManifestWizardStep(2)}
                      className="px-3 py-2 text-xs font-bold border rounded"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      {tx("actions.continue", "Continue")}
                    </button>
                  )}
                  {manifestWizardStep === 2 && (
                    <button
                      onClick={continueManifestWizardToReview}
                      className="px-3 py-2 text-xs font-bold border rounded"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      {tx("actions.review", "Review")}
                    </button>
                  )}
                  {manifestWizardStep === 3 && (
                    <button
                      onClick={downloadSlackManifestFromWizard}
                      className="px-3 py-2 text-xs font-bold border rounded"
                      style={{
                        borderColor: "var(--success)",
                        background: "var(--success-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      {tx("actions.download_manifest", "Download manifest")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;
  const instructionsModal =
    showInstructionsModal && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "var(--modal-overlay-bg)" }}
            onClick={() => setShowInstructionsModal(false)}
          >
            <div
              className="w-full max-w-5xl max-h-[92vh] border rounded flex flex-col"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                boxShadow: "var(--modal-shadow)",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className="px-5 py-4 border-b flex items-start justify-between gap-3"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div>
                  <p className="text-base font-bold" style={{ color: "var(--window-document-text)" }}>
                    {tx("instructions.title", "Slack Setup Guide")}
                  </p>
                  <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                    {tx(
                      "instructions.subtitle",
                      "Follow the steps below, then reconnect. Each step links to Slack docs."
                    )}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    {tx(
                      "instructions.current_state",
                      "Current mode: {mode} | AI features: {aiFeatures}",
                      {
                        mode: interactionModeLabel(
                          isDmMode ? "mentions_and_dm" : "mentions_only"
                        ),
                        aiFeatures: aiFeaturesLabel(isAiAppFeaturesEnabled),
                      }
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowInstructionsModal(false)}
                  className="p-2 border rounded"
                  style={{
                    borderColor: "var(--window-document-border)",
                    color: "var(--window-document-text)",
                    background: "var(--window-document-bg)",
                  }}
                  aria-label={tx("actions.close_instructions", "Close instructions")}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div
                  className="p-3 border rounded text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                    color: "var(--neutral-gray)",
                  }}
                >
                  {canManageSettings
                    ? tx(
                        "instructions.manage_access.full",
                        "You can switch setup mode and save settings. Connect/Reconnect/Disconnect targets the selected profile."
                      )
                    : tx(
                        "instructions.manage_access.limited",
                        "You can connect/reconnect/disconnect, but a super admin must change setup settings (mode and credentials)."
                      )}
                </div>

                {canDownloadManifestPresets ? (
                  <section
                    className="p-4 border rounded space-y-3"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg-elevated)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                          {tx(
                            "instructions.manifest.title",
                            "Download Reusable Slack App Manifests"
                          )}
                        </p>
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {tx(
                            "instructions.manifest.subtitle",
                            "Download preset manifests for v1, v2, and v2.1. Files are generated locally with your current VC83 URLs, not stored in Convex."
                          )}
                        </p>
                      </div>
                      <a
                        href={slackManifestDocsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs hover:underline"
                        style={{
                          borderColor: "var(--window-document-border)",
                          color: "var(--tone-accent)",
                          background: "var(--window-document-bg)",
                        }}
                      >
                        {tx("links.manifest_docs", "Manifest Docs")}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span style={{ color: "var(--neutral-gray)" }}>
                        {tx("instructions.manifest.download_format", "Download format:")}
                      </span>
                      <button
                        onClick={() => setManifestDownloadFormat("json")}
                        className="px-2 py-1 border rounded font-bold"
                        style={{
                          borderColor:
                            manifestDownloadFormat === "json"
                              ? "var(--success)"
                              : "var(--window-document-border)",
                          background:
                            manifestDownloadFormat === "json"
                              ? "var(--success-bg)"
                              : "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        {tx("labels.format.json", "JSON")}
                      </button>
                      <button
                        onClick={() => setManifestDownloadFormat("yaml")}
                        className="px-2 py-1 border rounded font-bold"
                        style={{
                          borderColor:
                            manifestDownloadFormat === "yaml"
                              ? "var(--success)"
                              : "var(--window-document-border)",
                          background:
                            manifestDownloadFormat === "yaml"
                              ? "var(--success-bg)"
                              : "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        {tx("labels.format.yaml", "YAML")}
                      </button>
                      <span style={{ color: "var(--neutral-gray)" }}>
                        {tx(
                          "instructions.manifest.format_hint",
                          "Slack supports both formats in manifest import."
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div
                        className="p-3 border rounded space-y-2"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                        }}
                      >
                        <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                          {tx("instructions.manifest.v1.title", "v1: Mentions only")}
                        </p>
                        <p style={{ color: "var(--neutral-gray)" }}>
                          {tx(
                            "instructions.manifest.v1.subtitle",
                            "Channel app mentions only. No App Home DM ingestion."
                          )}
                        </p>
                        <button
                          onClick={() => openSlackManifestWizard("v1")}
                          className="px-2 py-1 border rounded font-bold"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background: "var(--window-document-bg-elevated)",
                            color: "var(--window-document-text)",
                          }}
                        >
                          {tx("actions.start_manifest_wizard_v1", "Start v1 wizard")}
                        </button>
                      </div>
                      <div
                        className="p-3 border rounded space-y-2"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                        }}
                      >
                        <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                          {tx("instructions.manifest.v2.title", "v2: Mentions + App Home DMs")}
                        </p>
                        <p style={{ color: "var(--neutral-gray)" }}>
                          {tx(
                            "instructions.manifest.v2.subtitle",
                            "Adds App Home DM events and scopes for operator conversational flows."
                          )}
                        </p>
                        <button
                          onClick={() => openSlackManifestWizard("v2")}
                          className="px-2 py-1 border rounded font-bold"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background: "var(--window-document-bg-elevated)",
                            color: "var(--window-document-text)",
                          }}
                        >
                          {tx("actions.start_manifest_wizard_v2", "Start v2 wizard")}
                        </button>
                      </div>
                      <div
                        className="p-3 border rounded space-y-2"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                        }}
                      >
                        <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                          {tx("instructions.manifest.v2_1.title", "v2.1: Agentic Slack")}
                        </p>
                        <p style={{ color: "var(--neutral-gray)" }}>
                          {tx(
                            "instructions.manifest.v2_1.subtitle",
                            "Adds assistant thread lifecycle events and `assistant:write` scope."
                          )}
                        </p>
                        <button
                          onClick={() => openSlackManifestWizard("v2_1")}
                          className="px-2 py-1 border rounded font-bold"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background: "var(--window-document-bg-elevated)",
                            color: "var(--window-document-text)",
                          }}
                        >
                          {tx("actions.start_manifest_wizard_v2_1", "Start v2.1 wizard")}
                        </button>
                      </div>
                    </div>
                  </section>
                ) : (
                  <section
                    className="p-4 border rounded"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg-elevated)",
                    }}
                  >
                    <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                      {tx(
                        "instructions.manifest.restricted.title",
                        "Manifest export is restricted"
                      )}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "instructions.manifest.restricted.detail",
                        "Platform app manifest export is limited to super admins."
                      )}
                    </p>
                  </section>
                )}

                <section
                  className="p-4 border rounded space-y-3"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                  }}
                >
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                      {tx("instructions.step1.title", "Step 1: Select mode in VC83 and save")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "instructions.step1.subtitle",
                        "Set interaction mode to v2 if you want App Home DMs. Enable AI features only if you plan to use Slack AI app functionality."
                      )}
                    </p>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    <li>
                      {tx(
                        "instructions.step1.item1",
                        "Pick setup mode: Platform-managed or Organization BYOA."
                      )}
                    </li>
                    <li>
                      {tx(
                        "instructions.step1.item2",
                        "Pick interaction mode: `Mentions + App Home DMs (v2)` for DM support."
                      )}
                    </li>
                    <li>
                      {tx(
                        "instructions.step1.item3",
                        "Optional: Enable `AI Features On (v2.1)` for assistant thread features."
                      )}
                    </li>
                    <li>{tx("instructions.step1.item4", "Click save, then reconnect in Step 5.")}</li>
                  </ol>
                </section>

                <section
                  className="p-4 border rounded space-y-3"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                        {tx(
                          "instructions.step2.title",
                          "Step 2: Configure App Home + Event Subscriptions in Slack"
                        )}
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {tx(
                          "instructions.step2.subtitle",
                          "Required for App Home DM handling, and the foundation for agentic AI app workflows."
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={slackAppHomeDocsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs hover:underline"
                        style={{
                          borderColor: "var(--window-document-border)",
                          color: "var(--tone-accent)",
                          background: "var(--window-document-bg)",
                        }}
                      >
                        {tx("links.app_home_docs", "App Home Docs")}
                        <ExternalLink size={12} />
                      </a>
                      <a
                        href={slackEventsApiDocsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs hover:underline"
                        style={{
                          borderColor: "var(--window-document-border)",
                          color: "var(--tone-accent)",
                          background: "var(--window-document-bg)",
                        }}
                      >
                        {tx("links.events_api_docs", "Events API Docs")}
                        <ExternalLink size={12} />
                      </a>
                      <a
                        href={slackAiDeveloperDocsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs hover:underline"
                        style={{
                          borderColor: "var(--window-document-border)",
                          color: "var(--tone-accent)",
                          background: "var(--window-document-bg)",
                        }}
                      >
                        {tx("links.agentic_ai_docs", "Agentic AI Docs")}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    <li>{tx("instructions.step2.item1", "Open your app in Slack App Dashboard.")}</li>
                    <li>{tx("instructions.step2.item2", "In `App Home`, enable messages from users.")}</li>
                    <li>
                      {tx(
                        "instructions.step2.item3",
                        "In `Event Subscriptions`, set Request URL to"
                      )}{" "}
                      <span className="font-mono" style={{ color: "var(--window-document-text)" }}>
                        {eventsUrl}
                      </span>
                      .
                    </li>
                    {!eventsUrlIsPublicForSlack && (
                      <li>
                        {tx(
                          "instructions.step2.item3_warning",
                          "Important: Slack cannot verify localhost/internal URLs. Use a public HTTPS webhook URL (Convex .site or tunnel) before importing manifests."
                        )}
                      </li>
                    )}
                    <li>
                      {tx("instructions.step2.item4", "Add bot events:")}{" "}
                      <span className="font-mono" style={{ color: "var(--window-document-text)" }}>
                        app_mention
                      </span>
                      {isDmMode ? ", message.im" : ""}
                      {isAiAppFeaturesEnabled
                        ? ", assistant_thread_started, assistant_thread_context_changed"
                        : ""}
                      .
                    </li>
                    {isAiAppFeaturesEnabled && (
                      <li>
                        {tx(
                          "instructions.step2.item5",
                          "In Slack app settings, enable the `Agents & AI Apps` feature for your app."
                        )}
                      </li>
                    )}
                  </ol>
                  <div className="flex flex-wrap items-center gap-2">
                    {isDmMode && (
                      <a
                        href={slackMessageImDocsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs hover:underline"
                        style={{ color: "var(--tone-accent)" }}
                      >
                        {tx("links.message_im_reference", "`message.im` event reference")}
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {isAiAppFeaturesEnabled && (
                      <>
                        <a
                          href={slackAssistantThreadStartedDocsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs hover:underline"
                          style={{ color: "var(--tone-accent)" }}
                        >
                          {tx(
                            "links.assistant_thread_started_docs",
                            "`assistant_thread_started` docs"
                          )}
                          <ExternalLink size={12} />
                        </a>
                        <a
                          href={slackAssistantThreadContextChangedDocsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs hover:underline"
                          style={{ color: "var(--tone-accent)" }}
                        >
                          {tx(
                            "links.assistant_thread_context_changed_docs",
                            "`assistant_thread_context_changed` docs"
                          )}
                          <ExternalLink size={12} />
                        </a>
                      </>
                    )}
                  </div>
                </section>

                <section
                  className="p-4 border rounded space-y-3"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                        {tx(
                          "instructions.step3.title",
                          "Step 3: Enable agentic Slack experience + top bar visibility"
                        )}
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {tx(
                          "instructions.step3.subtitle",
                          "This is the part teams usually miss: app-level AI mode plus each installer's personal top-bar preference."
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={slackAiDeveloperDocsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs hover:underline"
                        style={{
                          borderColor: "var(--window-document-border)",
                          color: "var(--tone-accent)",
                          background: "var(--window-document-bg)",
                        }}
                      >
                        {tx("links.agentic_setup_docs", "Agentic Setup Docs")}
                        <ExternalLink size={12} />
                      </a>
                      <a
                        href={slackAiDisplaySettingsDocsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs hover:underline"
                        style={{
                          borderColor: "var(--window-document-border)",
                          color: "var(--tone-accent)",
                          background: "var(--window-document-bg)",
                        }}
                      >
                        {tx("links.display_settings_docs", "Display Settings Docs")}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    <li>
                      {tx(
                        "instructions.step3.item1",
                        "App owner: enable Slack `Agents & AI Apps` feature for this app (agentic Slack version)."
                      )}
                    </li>
                    <li>
                      {tx(
                        "instructions.step3.item2",
                        "Workspace admin: in Slack app management, allow AI apps to be displayed if your workspace policy requires it."
                      )}
                    </li>
                    <li>
                      {tx(
                        "instructions.step3.item3",
                        "Each installer/user: open Slack `Preferences` -> `Navigation` -> `App agents & assistants` and enable `Show app agents` (this is the `Show on Slack's top bar` experience)."
                      )}
                    </li>
                  </ol>
                </section>

                <section
                  className="p-4 border rounded space-y-3"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                        {tx("instructions.step4.title", "Step 4: Confirm OAuth scopes in Slack")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {tx(
                          "instructions.step4.subtitle",
                          "Slack app scopes must match what VC83 requires for your selected mode."
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={slackOAuthDocsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs hover:underline"
                        style={{
                          borderColor: "var(--window-document-border)",
                          color: "var(--tone-accent)",
                          background: "var(--window-document-bg)",
                        }}
                      >
                        {tx("links.oauth_docs", "OAuth Docs")}
                        <ExternalLink size={12} />
                      </a>
                      <a
                        href={slackScopesDocsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs hover:underline"
                        style={{
                          borderColor: "var(--window-document-border)",
                          color: "var(--tone-accent)",
                          background: "var(--window-document-bg)",
                        }}
                      >
                        {tx("links.scopes_docs", "Scopes Docs")}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {tx(
                      "instructions.step4.required_scopes",
                      "Required scopes for current settings:"
                    )}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {requiredScopes.map((scope) => (
                      <div
                        key={`instruction-scope-${scope}`}
                        className="px-2 py-1 border rounded text-xs font-mono"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        {scope}
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  className="p-4 border rounded space-y-3"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                  }}
                >
                  <p className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                    {tx("instructions.step5.title", "Step 5: Reconnect and verify")}
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    <li>{tx("instructions.step5.item1", "Reconnect from this Slack settings screen.")}</li>
                    <li>
                      {tx(
                        "instructions.step5.item2",
                        "Check `Scope Verification` shows required scopes as granted."
                      )}
                    </li>
                    <li>{tx("instructions.step5.item3", "Send one channel mention and confirm reply.")}</li>
                    {isDmMode && (
                      <li>{tx("instructions.step5.item4", "Send one App Home DM and confirm reply.")}</li>
                    )}
                    <li>
                      {tx(
                        "instructions.step5.item5",
                        "Confirm generic non-DM `message` events are not auto-handled."
                      )}
                    </li>
                  </ol>
                </section>
              </div>

              <div
                className="px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={slackAppsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs hover:underline"
                    style={{ color: "var(--tone-accent)" }}
                  >
                    {tx("links.open_slack_dashboard", "Open Slack App Dashboard")}
                    <ExternalLink size={12} />
                  </a>
                  <a
                    href={slackAiAppsHelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs hover:underline"
                    style={{ color: "var(--tone-accent)" }}
                  >
                    {tx("links.ai_apps_overview", "AI Apps Overview")}
                    <ExternalLink size={12} />
                  </a>
                  <a
                    href={slackAiDisplaySettingsDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs hover:underline"
                    style={{ color: "var(--tone-accent)" }}
                  >
                    {tx("links.top_bar_setting_docs", "Top Bar Setting Docs")}
                    <ExternalLink size={12} />
                  </a>
                </div>
                <button
                  onClick={() => setShowInstructionsModal(false)}
                  className="px-3 py-2 text-xs font-bold border rounded"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                >
                  {tx("actions.close", "Close")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <confirmDialog.Dialog />
      <div className="flex flex-col h-full" style={{ background: "var(--window-document-bg)" }}>
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
            {tx("actions.back", "Back")}
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare size={22} style={{ color: SLACK_BRAND_HEX }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
                {tx("header.title", "Slack")}
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx(
                  "header.subtitle",
                  "Channel mentions, optional App Home DMs, replies, commands, and AI app readiness"
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInstructionsModal(true)}
            className="ml-auto px-2 py-1 text-xs font-bold border rounded inline-flex items-center gap-1"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
            }}
          >
            <BookOpen size={14} />
            {tx("actions.instructions", "Instructions")}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div
              className="p-6 border rounded flex flex-col items-center justify-center gap-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
              }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--window-document-text)" }} />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("loading.connection_status", "Loading Slack connection status...")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="p-4 border rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                {canManageSettings ? (
                  <>
                    <p className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: "var(--window-document-text)" }}>
                      {tx("setup_mode.title", "Setup Mode")}
                    </p>
                    <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "setup_mode.subtitle",
                        "Setup mode chooses which Slack app profile Connect/Reconnect and Disconnect target. Both profiles can be connected at the same time."
                      )}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div
                        className="rounded border p-3"
                        style={{
                          borderColor: !isByoaMode ? "var(--success)" : "var(--window-document-border)",
                          background: !isByoaMode ? "var(--success-bg)" : "var(--window-document-bg)",
                        }}
                      >
                        <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                          {tx("setup_mode.platform.title", "Platform-managed app")}
                        </p>
                        <p style={{ color: "var(--neutral-gray)" }}>
                          {tx(
                            "setup_mode.platform.subtitle",
                            "Fastest onboarding path. Connects the shared platform Slack app."
                          )}
                        </p>
                      </div>
                      <div
                        className="rounded border p-3"
                        style={{
                          borderColor: isByoaMode ? "var(--success)" : "var(--window-document-border)",
                          background: isByoaMode ? "var(--success-bg)" : "var(--window-document-bg)",
                        }}
                      >
                        <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                          {tx("setup_mode.organization.title", "Organization BYOA app")}
                        </p>
                        <p style={{ color: "var(--neutral-gray)" }}>
                          {tx(
                            "setup_mode.organization.subtitle",
                            "Connect your org-owned Slack app credentials for tenant-level ownership and rotation."
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => setSetupMode("platform_managed")}
                        className="px-3 py-2 text-xs font-bold border rounded"
                        style={{
                          borderColor: !isByoaMode ? "var(--success)" : "var(--window-document-border)",
                          background: !isByoaMode ? "var(--success-bg)" : "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        {tx("actions.use_platform_app", "Use Platform App")}
                      </button>
                      <button
                        onClick={() => setSetupMode("organization_byoa")}
                        className="px-3 py-2 text-xs font-bold border rounded"
                        style={{
                          borderColor: isByoaMode ? "var(--success)" : "var(--window-document-border)",
                          background: isByoaMode ? "var(--success-bg)" : "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        {tx("actions.use_byoa_app", "Use Org BYOA App")}
                      </button>
                    </div>
                    <p className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {tx("setup_mode.current_target", "Current action target:")}{" "}
                      <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                        {setupModeLabel(isByoaMode ? "organization_byoa" : "platform_managed")}
                      </span>
                      .
                    </p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div
                        className="p-2 border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--neutral-gray)",
                        }}
                      >
                        {tx("setup_mode.platform_profile", "Platform app profile:")}{" "}
                        <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                          {connectionStateLabel(platformProfileConnected)}
                        </span>
                      </div>
                      <div
                        className="p-2 border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--neutral-gray)",
                        }}
                      >
                        {tx("setup_mode.organization_profile", "Organization app profile:")}{" "}
                        <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                          {connectionStateLabel(organizationProfileConnected)}
                        </span>
                      </div>
                    </div>
                    <div
                      className="mt-3 p-3 border rounded space-y-2"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                      }}
                    >
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        {tx("interaction_mode.title", "Interaction Mode")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {tx(
                          "interaction_mode.subtitle",
                          "Choose whether Slack handles channel mentions only, or both mentions and App Home DMs."
                        )}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => setInteractionMode("mentions_only")}
                          className="px-3 py-2 text-xs font-bold border rounded"
                          style={{
                            borderColor: !isDmMode
                              ? "var(--success)"
                              : "var(--window-document-border)",
                            background: !isDmMode
                              ? "var(--success-bg)"
                              : "var(--window-document-bg-elevated)",
                            color: "var(--window-document-text)",
                          }}
                        >
                          {tx("actions.select_mentions_only", "Mentions Only (v1)")}
                        </button>
                        <button
                          onClick={() => setInteractionMode("mentions_and_dm")}
                          className="px-3 py-2 text-xs font-bold border rounded"
                          style={{
                            borderColor: isDmMode
                              ? "var(--success)"
                              : "var(--window-document-border)",
                            background: isDmMode
                              ? "var(--success-bg)"
                              : "var(--window-document-bg-elevated)",
                            color: "var(--window-document-text)",
                          }}
                        >
                          {tx(
                            "actions.select_mentions_and_dm",
                            "Mentions + App Home DMs (v2)"
                          )}
                        </button>
                      </div>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {tx("interaction_mode.selected", "Selected interaction mode:")}{" "}
                        <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                          {interactionModeLabel(
                            isDmMode ? "mentions_and_dm" : "mentions_only"
                          )}
                        </span>
                        .{" "}
                        {tx(
                          "interaction_mode.reconnect_hint",
                          "Reconnect after saving whenever scope requirements change."
                        )}
                      </p>
                      <div
                        className="mt-2 p-3 border rounded space-y-2"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg-elevated)",
                        }}
                      >
                        <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                          {tx("ai_features.title", "Slack AI App Features (v2.1)")}
                        </p>
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {tx(
                            "ai_features.subtitle",
                            "Enables Slack AI app scopes and setup guidance while preserving current mention and App Home DM flows."
                          )}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            onClick={() => setAiAppFeaturesEnabled(false)}
                            className="px-3 py-2 text-xs font-bold border rounded"
                            style={{
                              borderColor: !isAiAppFeaturesEnabled
                                ? "var(--success)"
                                : "var(--window-document-border)",
                              background: !isAiAppFeaturesEnabled
                                ? "var(--success-bg)"
                                : "var(--window-document-bg)",
                              color: "var(--window-document-text)",
                            }}
                          >
                            {tx("actions.ai_features_off", "AI Features Off")}
                          </button>
                          <button
                            onClick={() => setAiAppFeaturesEnabled(true)}
                            className="px-3 py-2 text-xs font-bold border rounded"
                            style={{
                              borderColor: isAiAppFeaturesEnabled
                                ? "var(--success)"
                                : "var(--window-document-border)",
                              background: isAiAppFeaturesEnabled
                                ? "var(--success-bg)"
                                : "var(--window-document-bg)",
                              color: "var(--window-document-text)",
                            }}
                          >
                            {tx("actions.ai_features_on", "AI Features On (v2.1)")}
                          </button>
                        </div>
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {tx("ai_features.current", "Current AI feature mode:")}{" "}
                          <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                            {aiFeaturesLabel(isAiAppFeaturesEnabled)}
                          </span>
                          .{" "}
                          {tx(
                            "ai_features.reconnect_hint",
                            "When enabled, reconnect to grant Slack AI app scopes (for example `assistant:write`)."
                          )}
                        </p>
                      </div>
                    </div>
                    {isByoaMode && (
                      <div
                        className="mt-3 p-3 border rounded space-y-2"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                        }}
                      >
                        <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                          {tx("byoa_credentials.title", "Organization Slack App Credentials")}
                        </p>
                        <input
                          type="text"
                          value={byoaClientId}
                          onChange={(event) => setByoaClientId(event.target.value)}
                          placeholder={tx("byoa_credentials.client_id", "Slack Client ID")}
                          className="w-full p-2 text-xs border rounded font-mono"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background: "var(--window-document-bg-elevated)",
                            color: "var(--window-document-text)",
                          }}
                        />
                        <input
                          type="password"
                          value={byoaClientSecret}
                          onChange={(event) => setByoaClientSecret(event.target.value)}
                          placeholder={tx(
                            "byoa_credentials.client_secret",
                            "Slack Client Secret (leave blank to keep current)"
                          )}
                          className="w-full p-2 text-xs border rounded font-mono"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background: "var(--window-document-bg-elevated)",
                            color: "var(--window-document-text)",
                          }}
                        />
                        <input
                          type="password"
                          value={byoaSigningSecret}
                          onChange={(event) => setByoaSigningSecret(event.target.value)}
                          placeholder={tx(
                            "byoa_credentials.signing_secret",
                            "Slack Signing Secret (leave blank to keep current)"
                          )}
                          className="w-full p-2 text-xs border rounded font-mono"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background: "var(--window-document-bg-elevated)",
                            color: "var(--window-document-text)",
                          }}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                            {tx(
                              "byoa_credentials.saved_state",
                              "Saved: client ID {clientIdSaved}, client secret {clientSecretSaved}, signing secret {signingSecretSaved}.",
                              {
                                clientIdSaved: yesNoLabel(Boolean(setupConfig?.byoa?.clientId)),
                                clientSecretSaved: yesNoLabel(
                                  setupConfig?.byoa?.hasClientSecret === true
                                ),
                                signingSecretSaved: yesNoLabel(
                                  setupConfig?.byoa?.hasSigningSecret === true
                                ),
                              }
                            )}
                          </p>
                          <button
                            onClick={handleSaveSetup}
                            disabled={isSavingSetup}
                            className="px-3 py-2 text-xs font-bold border rounded disabled:opacity-60"
                            style={{
                              borderColor: "var(--window-document-border)",
                              background: "var(--window-document-bg-elevated)",
                              color: "var(--window-document-text)",
                            }}
                          >
                            {isSavingSetup
                              ? tx("actions.saving", "Saving...")
                              : tx("actions.save_byoa_mode", "Save BYOA + Mode")}
                          </button>
                        </div>
                        {!byoaConfigured && (
                          <p className="text-xs" style={{ color: "var(--warning)" }}>
                            {tx(
                              "byoa_credentials.locked_hint",
                              "BYOA connect is locked until all three values are saved."
                            )}
                          </p>
                        )}
                      </div>
                    )}
                    {!isByoaMode && (
                      <div className="mt-3">
                        <button
                          onClick={handleSaveSetup}
                          disabled={isSavingSetup}
                          className="px-3 py-2 text-xs font-bold border rounded disabled:opacity-60"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background: "var(--window-document-bg)",
                            color: "var(--window-document-text)",
                          }}
                        >
                          {isSavingSetup
                            ? tx("actions.saving", "Saving...")
                            : tx("actions.save_slack_mode", "Save Slack Mode")}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                      {tx(
                        "read_only.super_admin_managed",
                        "Slack setup settings are managed by super admins."
                      )}
                    </p>
                    <p>
                      {tx(
                        "read_only.allowed_actions",
                        "You can still connect, reconnect, and disconnect Slack using the profile configured for this organization."
                      )}
                    </p>
                    <p>
                      {tx("read_only.current_profile", "Current configured profile:")}{" "}
                      <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                        {setupModeLabel(isByoaMode ? "organization_byoa" : "platform_managed")}
                      </span>
                    </p>
                    <p>
                      {tx("read_only.current_interaction_mode", "Current interaction mode:")}{" "}
                      <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                        {interactionModeLabel(
                          isDmMode ? "mentions_and_dm" : "mentions_only"
                        )}
                      </span>
                    </p>
                    <p>
                      {tx("read_only.ai_features", "Slack AI app features:")}{" "}
                      <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                        {aiFeaturesLabel(isAiAppFeaturesEnabled)}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div
                className="p-4 border rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                    {tx(
                      "vacation_policy.title",
                      "Pharmacist Vacation Policy (Owner Controls)"
                    )}
                  </p>
                  <span
                    className="text-[11px] px-2 py-1 border rounded font-bold"
                    style={{
                      borderColor: googleWorkReadiness?.calendarWriteReady
                        ? "var(--success)"
                        : "var(--warning)",
                      color: googleWorkReadiness?.calendarWriteReady
                        ? "var(--success)"
                        : "var(--warning)",
                      background: googleWorkReadiness?.calendarWriteReady
                        ? "var(--success-bg)"
                        : "var(--warning-bg)",
                    }}
                  >
                    {googleWorkReadiness?.calendarWriteReady
                      ? tx("vacation_policy.badge.ready", "Google Write Ready")
                      : tx(
                          "vacation_policy.badge.not_ready",
                          "Google Write Not Ready"
                        )}
                  </span>
                </div>

                {!policyConfigReady ? (
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {tx("vacation_policy.loading", "Loading vacation policy settings...")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div
                        className="p-2 border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        <span className="font-bold">
                          {tx("vacation_policy.slack_workspace", "Slack workspace:")}
                        </span>{" "}
                        {policySlackScope?.workspaceName ||
                          policySlackScope?.teamId ||
                          tx("labels.unavailable", "Unavailable")}
                      </div>
                      <div
                        className="p-2 border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        <span className="font-bold">
                          {tx("vacation_policy.route_key", "Route key:")}
                        </span>{" "}
                        {policySlackScope?.routeKey ||
                          tx("labels.unavailable", "Unavailable")}
                      </div>
                      <div
                        className="p-2 border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        <span className="font-bold">
                          {tx(
                            "vacation_policy.google_connection",
                            "Google calendar connection:"
                          )}
                        </span>{" "}
                        {googleWorkReadiness?.email ||
                          tx("labels.unavailable", "Unavailable")}
                      </div>
                      <div
                        className="p-2 border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        <span className="font-bold">
                          {tx(
                            "vacation_policy.google_sync",
                            "Google sync + scopes:"
                          )}
                        </span>{" "}
                        {googleWorkReadiness?.syncEnabled === true &&
                        googleWorkReadiness?.canWriteCalendar === true
                          ? tx("vacation_policy.status.ready", "ready")
                          : tx(
                              "vacation_policy.status.needs_attention",
                              "needs attention"
                            )}
                      </div>
                    </div>

                    {canManageSettings ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                          <label className="space-y-1">
                            <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                              {tx("vacation_policy.max_concurrent", "Max concurrent away")}
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={policyMaxConcurrentAway}
                              onChange={(event) =>
                                setPolicyMaxConcurrentAway(event.target.value)
                              }
                              className="w-full p-2 border rounded"
                              style={{
                                borderColor: "var(--window-document-border)",
                                background: "var(--window-document-bg)",
                                color: "var(--window-document-text)",
                              }}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                              {tx("vacation_policy.role_floor", "Pharmacist role floor")}
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={policyPharmacistRoleFloor}
                              onChange={(event) =>
                                setPolicyPharmacistRoleFloor(event.target.value)
                              }
                              className="w-full p-2 border rounded"
                              style={{
                                borderColor: "var(--window-document-border)",
                                background: "var(--window-document-bg)",
                                color: "var(--window-document-text)",
                              }}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                              {tx("vacation_policy.min_on_duty_total", "Min on duty total")}
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={policyMinOnDutyTotal}
                              onChange={(event) =>
                                setPolicyMinOnDutyTotal(event.target.value)
                              }
                              className="w-full p-2 border rounded"
                              style={{
                                borderColor: "var(--window-document-border)",
                                background: "var(--window-document-bg)",
                                color: "var(--window-document-text)",
                              }}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                              {tx("vacation_policy.min_lead_days", "Min lead days")}
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={policyMinLeadDays}
                              onChange={(event) => setPolicyMinLeadDays(event.target.value)}
                              className="w-full p-2 border rounded"
                              style={{
                                borderColor: "var(--window-document-border)",
                                background: "var(--window-document-bg)",
                                color: "var(--window-document-text)",
                              }}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                              {tx("vacation_policy.max_future_days", "Max future days")}
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={policyMaxFutureDays}
                              onChange={(event) =>
                                setPolicyMaxFutureDays(event.target.value)
                              }
                              className="w-full p-2 border rounded"
                              style={{
                                borderColor: "var(--window-document-border)",
                                background: "var(--window-document-bg)",
                                color: "var(--window-document-text)",
                              }}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                              {tx("vacation_policy.timezone", "Timezone")}
                            </span>
                            <input
                              type="text"
                              value={policyTimezone}
                              onChange={(event) => setPolicyTimezone(event.target.value)}
                              className="w-full p-2 border rounded"
                              style={{
                                borderColor: "var(--window-document-border)",
                                background: "var(--window-document-bg)",
                                color: "var(--window-document-text)",
                              }}
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <label className="space-y-1">
                            <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                              {tx("vacation_policy.slack_channel", "Policy Slack channel ID")}
                            </span>
                            <input
                              type="text"
                              value={policySlackChannelId}
                              onChange={(event) =>
                                setPolicySlackChannelId(event.target.value)
                              }
                              className="w-full p-2 border rounded"
                              style={{
                                borderColor: "var(--window-document-border)",
                                background: "var(--window-document-bg)",
                                color: "var(--window-document-text)",
                              }}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                              {tx(
                                "vacation_policy.blocking_calendars",
                                "Blocking calendars (comma-separated IDs)"
                              )}
                            </span>
                            <input
                              type="text"
                              value={policyGoogleBlockingCalendarIds}
                              onChange={(event) =>
                                setPolicyGoogleBlockingCalendarIds(event.target.value)
                              }
                              className="w-full p-2 border rounded font-mono"
                              style={{
                                borderColor: "var(--window-document-border)",
                                background: "var(--window-document-bg)",
                                color: "var(--window-document-text)",
                              }}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                              {tx("vacation_policy.push_calendar", "Push calendar ID")}
                            </span>
                            <input
                              type="text"
                              value={policyGooglePushCalendarId}
                              onChange={(event) =>
                                setPolicyGooglePushCalendarId(event.target.value)
                              }
                              className="w-full p-2 border rounded font-mono"
                              style={{
                                borderColor: "var(--window-document-border)",
                                background: "var(--window-document-bg)",
                                color: "var(--window-document-text)",
                              }}
                            />
                          </label>
                        </div>

                        <div
                          className="p-3 border rounded space-y-2"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background: "var(--window-document-bg)",
                          }}
                        >
                          <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                            {tx("vacation_policy.blackout_periods", "Blackout periods")}
                          </p>
                          {policyBlockedPeriods.length === 0 && (
                            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                              {tx(
                                "vacation_policy.blackout_empty",
                                "No blackout periods configured."
                              )}
                            </p>
                          )}
                          {policyBlockedPeriods.map((period, index) => (
                            <div
                              key={period.id}
                              className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end"
                            >
                              <label className="space-y-1">
                                <span className="text-[11px] font-bold" style={{ color: "var(--window-document-text)" }}>
                                  {tx("vacation_policy.start_date", "Start")}
                                </span>
                                <input
                                  type="date"
                                  value={period.startDate}
                                  onChange={(event) =>
                                    handleUpdateBlockedPeriod(index, {
                                      startDate: event.target.value,
                                    })
                                  }
                                  className="w-full p-2 border rounded text-xs"
                                  style={{
                                    borderColor: "var(--window-document-border)",
                                    background: "var(--window-document-bg-elevated)",
                                    color: "var(--window-document-text)",
                                  }}
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[11px] font-bold" style={{ color: "var(--window-document-text)" }}>
                                  {tx("vacation_policy.end_date", "End")}
                                </span>
                                <input
                                  type="date"
                                  value={period.endDate}
                                  onChange={(event) =>
                                    handleUpdateBlockedPeriod(index, {
                                      endDate: event.target.value,
                                    })
                                  }
                                  className="w-full p-2 border rounded text-xs"
                                  style={{
                                    borderColor: "var(--window-document-border)",
                                    background: "var(--window-document-bg-elevated)",
                                    color: "var(--window-document-text)",
                                  }}
                                />
                              </label>
                              <label className="space-y-1 sm:col-span-2">
                                <span className="text-[11px] font-bold" style={{ color: "var(--window-document-text)" }}>
                                  {tx("vacation_policy.reason", "Reason")}
                                </span>
                                <input
                                  type="text"
                                  value={period.reason}
                                  onChange={(event) =>
                                    handleUpdateBlockedPeriod(index, {
                                      reason: event.target.value,
                                    })
                                  }
                                  className="w-full p-2 border rounded text-xs"
                                  style={{
                                    borderColor: "var(--window-document-border)",
                                    background: "var(--window-document-bg-elevated)",
                                    color: "var(--window-document-text)",
                                  }}
                                />
                              </label>
                              <div className="flex items-center gap-2">
                                <select
                                  value={period.recurrence}
                                  onChange={(event) =>
                                    handleUpdateBlockedPeriod(index, {
                                      recurrence:
                                        event.target.value === "yearly"
                                          ? "yearly"
                                          : "none",
                                    })
                                  }
                                  className="flex-1 p-2 border rounded text-xs"
                                  style={{
                                    borderColor: "var(--window-document-border)",
                                    background: "var(--window-document-bg-elevated)",
                                    color: "var(--window-document-text)",
                                  }}
                                >
                                  <option value="none">
                                    {tx("vacation_policy.recurrence.none", "No recurrence")}
                                  </option>
                                  <option value="yearly">
                                    {tx("vacation_policy.recurrence.yearly", "Yearly")}
                                  </option>
                                </select>
                                <button
                                  onClick={() => handleRemoveBlockedPeriod(index)}
                                  className="px-2 py-2 border rounded text-xs"
                                  style={{
                                    borderColor: "var(--window-document-border)",
                                    background: "var(--window-document-bg-elevated)",
                                    color: "var(--window-document-text)",
                                  }}
                                >
                                  {tx("actions.remove", "Remove")}
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={handleAddBlockedPeriod}
                            className="px-3 py-2 text-xs font-bold border rounded"
                            style={{
                              borderColor: "var(--window-document-border)",
                              background: "var(--window-document-bg-elevated)",
                              color: "var(--window-document-text)",
                            }}
                          >
                            {tx("actions.add_blackout_period", "Add blackout period")}
                          </button>
                        </div>

                        <div
                          className="p-3 border rounded flex flex-col gap-2 text-xs"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background: "var(--window-document-bg)",
                            color: "var(--window-document-text)",
                          }}
                        >
                          <p className="font-bold">
                            {tx("vacation_policy.override_authority", "Override authority")}
                          </p>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={policyOverrideRequireReason}
                              onChange={(event) =>
                                setPolicyOverrideRequireReason(event.target.checked)
                              }
                            />
                            {tx(
                              "vacation_policy.override_require_reason",
                              "Require override reason"
                            )}
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={policyOverrideRequireOwnerApproval}
                              onChange={(event) =>
                                setPolicyOverrideRequireOwnerApproval(
                                  event.target.checked
                                )
                              }
                            />
                            {tx(
                              "vacation_policy.override_require_owner",
                              "Require owner approval"
                            )}
                          </label>
                          <p style={{ color: "var(--neutral-gray)" }}>
                            {tx(
                              "vacation_policy.override_scope_note",
                              "Overrides remain scoped to this organization and connected Slack workspace."
                            )}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                            {tx(
                              "vacation_policy.summary",
                              "Configured blackout periods: {count}.",
                              { count: policyBlockedPeriodsCount }
                            )}
                          </p>
                          <button
                            onClick={handleSaveVacationPolicy}
                            disabled={isSavingPolicy}
                            className="px-3 py-2 text-xs font-bold border rounded disabled:opacity-60"
                            style={{
                              borderColor: "var(--window-document-border)",
                              background: "var(--window-document-bg)",
                              color: "var(--window-document-text)",
                            }}
                          >
                            {isSavingPolicy
                              ? tx("actions.saving", "Saving...")
                              : tx(
                                  "actions.save_vacation_policy",
                                  "Save Vacation Policy"
                                )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                        <p>
                          {tx(
                            "vacation_policy.read_only",
                            "You can view vacation policy readiness but cannot edit owner controls in this role."
                          )}
                        </p>
                        <p>
                          {tx(
                            "vacation_policy.read_only_rule",
                            "Current policy: max concurrent away {maxConcurrentAway}, pharmacist role floor {roleFloor}.",
                            {
                              maxConcurrentAway:
                                existingPolicy?.maxConcurrentAway ?? 1,
                              roleFloor: existingPolicy?.pharmacistRoleFloor ?? 1,
                            }
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {canManageSettings && (
                <div
                  className="p-4 border rounded"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                      {isByoaMode
                        ? tx("setup_packet.title_byoa", "Slack BYOA Setup Packet")
                        : tx("setup_packet.title_platform", "Slack Platform App Setup Packet")}
                    </p>
                    <a
                      href="https://api.slack.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs hover:underline"
                      style={{ color: "var(--tone-accent)" }}
                    >
                      {tx("links.open_slack_dashboard", "Open Slack App Dashboard")}
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="space-y-2 text-xs" style={{ color: "var(--window-document-text)" }}>
                    {setupValues.map((field) => (
                      <div key={field.label} className="flex items-center gap-2">
                        <div
                          className="flex-1 p-2 rounded border font-mono break-all"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background: "var(--window-document-bg)",
                            color: "var(--window-document-text)",
                          }}
                        >
                          <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                            {field.label}:
                          </span>{" "}
                          {field.value}
                        </div>
                        {field.copyable !== false && (
                          <button
                            onClick={() => copyValue(field.label, field.value)}
                            title={tx("actions.copy_label", "Copy {label}", {
                              label: field.label,
                            })}
                          >
                            <Copy size={14} style={{ color: "var(--neutral-gray)" }} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                      {tx("setup_packet.oauth_scopes_title", "OAuth Bot Token Scopes")}
                    </p>
                    {requiredScopes.map((scope) => (
                      <p key={scope} className="font-mono">{scope}</p>
                    ))}
                  </div>
                  <div className="mt-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                      {tx("setup_packet.handoff_title", "Agency handoff flow")}
                    </p>
                    {isByoaMode ? (
                      <ol className="list-decimal list-inside space-y-1">
                        <li>
                          {tx(
                            "setup_packet.handoff_byoa.item1",
                            "Create Slack app in the client workspace and set URLs/scopes above."
                          )}
                        </li>
                        <li>
                          {tx(
                            "setup_packet.handoff_byoa.item2",
                            "Save BYOA credentials in this panel, then connect workspace."
                          )}
                        </li>
                        <li>
                          {tx("setup_packet.handoff_byoa.item3_prefix", "Confirm app mention event")}
                          {isDmMode
                            ? tx("setup_packet.handoff_byoa.item3_dm_join", ", one App Home DM, ")
                            : tx("setup_packet.handoff_byoa.item3_join", " and ")}
                          {tx(
                            "setup_packet.handoff_byoa.item3_suffix",
                            "one slash command in client canary workspace."
                          )}
                        </li>
                        {isAiAppFeaturesEnabled && (
                          <li>
                            {tx(
                              "setup_packet.handoff_byoa.item4",
                              "Enable Slack AI app events (`assistant_thread_started`, `assistant_thread_context_changed`) before live rollout."
                            )}
                          </li>
                        )}
                      </ol>
                    ) : (
                      <ol className="list-decimal list-inside space-y-1">
                        <li>
                          {tx(
                            "setup_packet.handoff_platform.item1",
                            "Use Connect to install the platform Slack app into the workspace."
                          )}
                        </li>
                        <li>
                          {tx(
                            "setup_packet.handoff_platform.item2",
                            "Invite the app into a canary channel."
                          )}
                        </li>
                        <li>
                          {tx(
                            "setup_packet.handoff_platform.item3_prefix",
                            "Confirm one app mention response"
                          )}
                          {isDmMode
                            ? tx(
                                "setup_packet.handoff_platform.item3_dm_suffix",
                                " and one App Home DM response"
                              )
                            : ""}
                          {" "}
                          {tx(
                            "setup_packet.handoff_platform.item3_suffix",
                            "before production usage."
                          )}
                        </li>
                        {isAiAppFeaturesEnabled && (
                          <li>
                            {tx(
                              "setup_packet.handoff_platform.item4",
                              "Turn on Slack AI app event subscriptions for assistant thread lifecycle before production usage."
                            )}
                          </li>
                        )}
                      </ol>
                    )}
                  </div>
                </div>
              )}

              <div
                className="p-4 border rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                  {tx("communication.title", "How Slack communication works")}
                </p>
                <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <li>
                    {tx(
                      "communication.item1",
                      "Connecting OAuth installs the selected app profile, but does not create a DM thread or post a message by itself."
                    )}
                  </li>
                  <li>
                    {tx(
                      "communication.item2",
                      "Find the app in Slack under Apps, then invite it to a channel (`/invite @YourApp`) or add it from channel Integrations."
                    )}
                  </li>
                  <li>
                    {tx(
                      "communication.item3",
                      "Mention the app in that channel (`@YourApp ...`) to trigger agent handling."
                    )}
                  </li>
                  <li>
                    {tx(
                      "communication.item4",
                      "Replies post back to Slack in-channel (top-level or thread, based on context)."
                    )}
                  </li>
                </ol>
                <div className="mt-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {slashCommandsEnabled ? (
                    <p>
                      {tx(
                        "communication.slash_enabled_prefix",
                        "Slash commands are enabled. Configure a Slack slash command to point to"
                      )}{" "}
                      <span className="font-mono" style={{ color: "var(--window-document-text)" }}>
                        {slashCommandsUrl}
                      </span>
                      .
                    </p>
                  ) : (
                    <p>
                      {tx(
                        "communication.slash_disabled",
                        "Slash commands are disabled in this environment."
                      )}
                    </p>
                  )}
                  {isDmMode ? (
                    <>
                      <p className="mt-1">
                        {tx(
                          "communication.dm_enabled.item1",
                          "App Home DM routing is enabled (v2). Ensure the Slack app has `message.im` event subscription and App Home messages enabled."
                        )}
                      </p>
                      <p className="mt-1">
                        {tx(
                          "communication.dm_enabled.item2",
                          "Reconnect after enabling DM mode so OAuth can grant DM scopes (for example `im:history`)."
                        )}
                      </p>
                      {isAiAppFeaturesEnabled && (
                        <>
                          <p className="mt-1">
                            {tx(
                              "communication.dm_enabled.ai.item1",
                              "Slack AI app features are enabled (v2.1). Also subscribe to `assistant_thread_started` and `assistant_thread_context_changed`."
                            )}
                          </p>
                          <p className="mt-1">
                            {tx(
                              "communication.dm_enabled.ai.item2",
                              "Reconnect after enabling v2.1 so OAuth can grant AI app scope requirements (for example `assistant:write`)."
                            )}
                          </p>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="mt-1">
                        {tx(
                          "communication.dm_disabled.item1",
                          "Direct-message routing is disabled in v1 mode. Start in a channel mention flow."
                        )}
                      </p>
                      <p className="mt-1">
                        {tx(
                          "communication.dm_disabled.item2",
                          "If Slack shows 'Sending messages to this app has been turned off,' that is App Home DM behavior. Use channel mentions instead."
                        )}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {isConnected && connection ? (
                <>
                  <div
                    className="p-4 border rounded"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg-elevated)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
                      <span className="text-xs font-bold" style={{ color: "var(--success)" }}>
                        {connectedProfileType === "organization"
                          ? tx(
                              "connection.connected_title.organization",
                              "Organization Slack App Connected"
                            )
                          : tx(
                              "connection.connected_title.platform",
                              "Platform Slack App Connected"
                            )}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs" style={{ color: "var(--window-document-text)" }}>
                      <p>
                        <span className="font-bold">
                          {tx("connection.field.profile", "Profile:")}
                        </span>{" "}
                        {connectedProfileType === "organization"
                          ? tx("labels.setup_mode.organization", "Organization BYOA app")
                          : tx("labels.setup_mode.platform", "Platform-managed app")}
                      </p>
                      <p>
                        <span className="font-bold">
                          {tx("connection.field.interaction_mode", "Interaction mode:")}
                        </span>{" "}
                        {interactionModeLabel(
                          isDmMode ? "mentions_and_dm" : "mentions_only"
                        )}
                      </p>
                      <p>
                        <span className="font-bold">
                          {tx("connection.field.ai_features", "AI app features:")}
                        </span>{" "}
                        {aiFeaturesLabel(isAiAppFeaturesEnabled)}
                      </p>
                      <p>
                        <span className="font-bold">
                          {tx("connection.field.workspace", "Workspace:")}
                        </span>{" "}
                        {connection.workspaceName || connection.workspaceId}
                      </p>
                      <p>
                        <span className="font-bold">
                          {tx("connection.field.workspace_id", "Workspace ID:")}
                        </span>{" "}
                        {connection.workspaceId}
                      </p>
                      <p>
                        <span className="font-bold">
                          {tx("connection.field.bot_user_id", "Bot User ID:")}
                        </span>{" "}
                        {connection.botUserId || tx("labels.unavailable", "Unavailable")}
                      </p>
                      <p>
                        <span className="font-bold">
                          {tx("connection.field.connected_at", "Connected:")}
                        </span>{" "}
                        {formatDate(
                          connection.connectedAt,
                          locale,
                          tx("labels.unknown", "Unknown")
                        )}
                      </p>
                    </div>
                    {platformProfileConnected && organizationProfileConnected && (
                      <p className="mt-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {tx(
                          "connection.both_profiles_connected",
                          "Both profiles are connected. Switch setup mode to view or manage the other profile."
                        )}
                      </p>
                    )}
                  </div>

                  {connectionStatus?.isExpiringSoon && (
                    <div
                      className="p-3 border rounded flex items-start gap-2"
                      style={{
                        borderColor: "var(--warning)",
                        background: "var(--warning-bg)",
                      }}
                    >
                      <AlertTriangle
                        size={16}
                        className="flex-shrink-0 mt-0.5"
                        style={{ color: "var(--warning)" }}
                      />
                      <div className="text-xs">
                        <p className="font-bold" style={{ color: "var(--warning)" }}>
                          {tx(
                            "connection.token_expiring.title",
                            "Token requires reconnection soon"
                          )}
                        </p>
                        <p style={{ color: "var(--neutral-gray)" }}>
                          {tx(
                            "connection.token_expiring.detail",
                            "Current token expires on {date}.",
                            {
                              date: formatDate(
                                connection.tokenExpiresAt,
                                locale,
                                tx("labels.unknown", "Unknown")
                              ),
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  <div
                    className="p-4 border rounded"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg-elevated)",
                    }}
                  >
                    <p className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                      {tx("scope_verification.title", "Scope Verification")}
                    </p>
                    <div className="space-y-1 text-xs">
                      {requiredScopes.map((scope) => {
                        const granted = grantedScopes.has(scope);
                        return (
                          <div
                            key={scope}
                            className="flex items-center justify-between"
                            style={{ color: granted ? "#065f46" : "#7f1d1d" }}
                          >
                            <span className="font-mono">{scope}</span>
                            <span className="font-bold">
                              {granted
                                ? tx("scope_verification.granted", "Granted")
                                : tx("scope_verification.missing", "Missing")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {missingRequiredScopes.length > 0 && (
                      <p className="mt-2 text-xs" style={{ color: "var(--warning)" }}>
                        {tx(
                          "scope_verification.missing_detail",
                          "Missing required scopes: {scopes}. Reconnect to grant updated scopes.",
                          { scopes: missingRequiredScopes.join(", ") }
                        )}
                      </p>
                    )}
                  </div>

                  {canManageSettings &&
                    connectedProfileType &&
                    ((isByoaMode && connectedProfileType !== "organization") ||
                      (!isByoaMode && connectedProfileType !== "platform")) && (
                      <div
                        className="p-3 border rounded text-xs"
                        style={{
                          borderColor: "var(--warning)",
                          background: "var(--warning-bg)",
                          color: "var(--warning)",
                        }}
                      >
                        {tx(
                          "connection.mode_differs_warning",
                          "Selected mode differs from the currently connected profile. Reconnect to apply the new mode."
                        )}
                      </div>
                    )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={handleConnect}
                      disabled={connectDisabled}
                      className="relative w-full px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                      style={{
                        background: "#000000",
                        color: "#ffffff",
                        border: "1px solid #ffffff",
                        borderRadius: "6px",
                      }}
                    >
                      <span
                        className="absolute -top-2 -right-2 rounded-full border px-2 py-0.5 text-xs font-bold"
                        style={connectTargetPillStyle}
                      >
                        {connectTargetPillLabel}
                      </span>
                      {isConnecting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {tx("actions.reconnecting", "Reconnecting...")}
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          {reconnectButtonLabel}
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="desktop-interior-button w-full px-4 py-2 text-sm font-bold flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      <Unplug size={14} />
                      {tx("actions.disconnect", "Disconnect")}
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {canManageSettings
                      ? tx(
                          "actions.reconnect_disconnect_scope.manage",
                          "Reconnect and Disconnect apply to the profile selected in Setup Mode."
                        )
                      : tx(
                          "actions.reconnect_disconnect_scope.read_only",
                          "Reconnect and Disconnect apply to the profile configured by your super admin."
                        )}
                  </p>
                </>
              ) : (
                <div className="space-y-4">
                  <div
                    className="p-4 border rounded"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg-elevated)",
                    }}
                  >
                    <p className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                      {tx("disconnected.title", "Slack workspace is not connected")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {anyProfileConnected
                        ? canManageSettings
                          ? tx(
                              "disconnected.detail.profile_not_connected.manage",
                              "The selected profile is not connected. The other profile can still run. Switch setup mode to manage that profile, or connect this profile to run both."
                            )
                          : tx(
                              "disconnected.detail.profile_not_connected.read_only",
                              "The configured profile is not connected. Ask a super admin if you need a different Slack profile."
                            )
                        : isByoaMode
                          ? canManageSettings
                            ? tx(
                                "disconnected.detail.byoa.manage",
                                "Save BYOA credentials, then connect to install your organization-owned Slack app."
                              )
                            : tx(
                                "disconnected.detail.byoa.read_only",
                                "BYOA settings are managed by super admins. Connect after your admin completes Slack setup."
                              )
                          : tx(
                              "disconnected.detail.platform",
                              "Connect your Slack workspace to install the platform-managed Slack app."
                            )}
                    </p>
                  </div>

                  <button
                    onClick={handleConnect}
                    disabled={connectDisabled}
                    className="relative w-full px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                    style={{
                      background: "#000000",
                      color: "#ffffff",
                      border: "1px solid #ffffff",
                      borderRadius: "6px",
                    }}
                  >
                    <span
                      className="absolute -top-2 -right-2 rounded-full border px-2 py-0.5 text-xs font-bold"
                      style={connectTargetPillStyle}
                    >
                      {connectTargetPillLabel}
                    </span>
                    {isConnecting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {tx("actions.connecting", "Connecting...")}
                      </>
                    ) : (
                      <>
                        <MessageSquare size={16} />
                        {connectButtonLabel}
                      </>
                    )}
                  </button>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {canManageSettings
                      ? tx(
                          "actions.connect_scope.manage",
                          "Connect applies to the profile selected in Setup Mode."
                        )
                      : tx(
                          "actions.connect_scope.read_only",
                          "Connect applies to the profile configured by your super admin."
                        )}
                  </p>
                  {isByoaMode && !byoaConfigured && (
                    <p className="text-xs" style={{ color: "var(--warning)" }}>
                      {canManageSettings
                        ? tx(
                            "disconnected.byoa_locked.manage",
                            "BYOA connect is disabled until client ID, client secret, and signing secret are saved."
                          )
                        : tx(
                            "disconnected.byoa_locked.read_only",
                            "BYOA credentials are not configured for this organization. Ask a super admin to complete Slack setup settings."
                          )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {manifestWizardModal}
      {instructionsModal}
    </>
  );
}
