"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardCopy,
  Loader2,
  RefreshCw,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { InteriorButton } from "@/components/ui/interior-button";
import { generateWebchatDeploymentSnippets, type WebchatSnippetBootstrapContract } from "@/components/chat-widget";
import { normalizeWebchatCustomizationContract, type PublicInboundChannel, type WebchatCustomizationContract } from "../../../../convex/webchatCustomizationContractCore";
import type { Id } from "../../../../convex/_generated/dataModel";

type SnippetMode = "script" | "react" | "iframe";
type CopyState = "idle" | "copied" | "error";
type ValidationStatus = "idle" | "running" | "pass" | "fail";
type SaveState = "idle" | "saving" | "saved" | "error";

const COPY_FEEDBACK_TIMEOUT_MS = 2000;

interface WebchatChannelBinding {
  channel: string;
  enabled: boolean;
  welcomeMessage?: string;
  brandColor?: string;
  position?: "bottom-left" | "bottom-right";
  collectContactInfo?: boolean;
  bubbleText?: string;
  offlineMessage?: string;
  language?: string;
}

interface AgentRecord {
  _id: Id<"objects">;
  name: string;
  status?: string;
  customProperties?: {
    displayName?: string;
    avatar?: string;
    channelBindings?: unknown;
  };
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveDefaultAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (typeof configured === "string" && configured.trim().length > 0) {
    return stripTrailingSlash(configured.trim());
  }
  if (typeof window !== "undefined") {
    return stripTrailingSlash(window.location.origin);
  }
  return "";
}

function resolveDefaultApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_ENDPOINT_URL || process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (typeof configured === "string" && configured.trim().length > 0) {
    const normalized = stripTrailingSlash(configured.trim());
    return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`;
  }
  return "/api/v1";
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidApiBaseUrl(value: string): boolean {
  if (!value) return false;
  return value.startsWith("/") || isValidHttpUrl(value);
}

function sanitizeChannelBindings(rawBindings: unknown): WebchatChannelBinding[] {
  if (!Array.isArray(rawBindings)) {
    return [];
  }

  return rawBindings
    .map((entry): WebchatChannelBinding | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const channel = typeof record.channel === "string" ? record.channel.trim() : "";
      if (!channel) {
        return null;
      }

      const sanitized: WebchatChannelBinding = {
        channel,
        enabled: record.enabled === true,
      };

      if (typeof record.welcomeMessage === "string") {
        sanitized.welcomeMessage = record.welcomeMessage;
      }
      if (typeof record.brandColor === "string") {
        sanitized.brandColor = record.brandColor;
      }
      if (record.position === "bottom-left" || record.position === "bottom-right") {
        sanitized.position = record.position;
      }
      if (typeof record.collectContactInfo === "boolean") {
        sanitized.collectContactInfo = record.collectContactInfo;
      }
      if (typeof record.bubbleText === "string") {
        sanitized.bubbleText = record.bubbleText;
      }
      if (typeof record.offlineMessage === "string") {
        sanitized.offlineMessage = record.offlineMessage;
      }
      if (typeof record.language === "string") {
        sanitized.language = record.language;
      }

      return sanitized;
    })
    .filter((binding): binding is WebchatChannelBinding => binding !== null);
}

function getChannelBinding(bindings: WebchatChannelBinding[], channel: PublicInboundChannel): WebchatChannelBinding | null {
  return bindings.find((binding) => binding.channel === channel) || null;
}

function resolveAgentLabel(agent: AgentRecord): string {
  const displayName = agent.customProperties?.displayName;
  return typeof displayName === "string" && displayName.trim().length > 0
    ? displayName.trim()
    : agent.name;
}

function hasChannelBinding(bindings: WebchatChannelBinding[], channel: PublicInboundChannel): boolean {
  return bindings.some((binding) => binding.channel === channel);
}

function toBindingContract(binding: WebchatChannelBinding): WebchatChannelBinding {
  return {
    channel: binding.channel,
    enabled: binding.enabled,
    ...(typeof binding.welcomeMessage === "string" ? { welcomeMessage: binding.welcomeMessage } : {}),
    ...(typeof binding.brandColor === "string" ? { brandColor: binding.brandColor } : {}),
    ...(binding.position ? { position: binding.position } : {}),
    ...(typeof binding.collectContactInfo === "boolean" ? { collectContactInfo: binding.collectContactInfo } : {}),
    ...(typeof binding.bubbleText === "string" ? { bubbleText: binding.bubbleText } : {}),
    ...(typeof binding.offlineMessage === "string" ? { offlineMessage: binding.offlineMessage } : {}),
    ...(typeof binding.language === "string" ? { language: binding.language } : {}),
  };
}

function StatusDot({ status }: { status: ValidationStatus }) {
  if (status === "running") {
    return <Loader2 size={14} className="animate-spin" style={{ color: "var(--tone-accent)" }} />;
  }
  if (status === "pass") {
    return <CheckCircle2 size={14} style={{ color: "var(--success)" }} />;
  }
  if (status === "fail") {
    return <XCircle size={14} style={{ color: "var(--error)" }} />;
  }
  return <div className="w-3.5 h-3.5 rounded-full" style={{ background: "var(--window-document-border)" }} />;
}

function SnippetCard({
  title,
  summary,
  snippet,
  copyState,
  onCopy,
  disabled,
}: {
  title: string;
  summary: string;
  snippet: string;
  copyState: CopyState;
  onCopy: () => void;
  disabled: boolean;
}) {
  const copyLabel = copyState === "copied" ? "Copied" : copyState === "error" ? "Retry Copy" : "Copy";
  return (
    <div
      className="border-2 p-3 flex flex-col gap-3"
      style={{
        borderColor: "var(--window-document-border)",
        background: "var(--window-document-bg-elevated)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
            {title}
          </p>
          <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
            {summary}
          </p>
        </div>
        <InteriorButton
          onClick={onCopy}
          variant={copyState === "copied" ? "primary" : copyState === "error" ? "outline" : "secondary"}
          size="sm"
          className="flex items-center gap-1.5 whitespace-nowrap"
          disabled={disabled}
        >
          {copyState === "copied" ? <ClipboardCheck size={13} /> : <ClipboardCopy size={13} />}
          {copyLabel}
        </InteriorButton>
      </div>
      <pre
        className="text-[11px] leading-snug border-2 p-2 overflow-x-auto whitespace-pre"
        style={{
          borderColor: "var(--window-document-border)",
          background: "white",
          color: "var(--window-document-text)",
          minHeight: 170,
        }}
      >
        <code>{snippet}</code>
      </pre>
    </div>
  );
}

export function WebchatDeploymentTab() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();

  const [selectedChannel, setSelectedChannel] = useState<PublicInboundChannel>("webchat");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [appBaseUrl, setAppBaseUrl] = useState<string>(() => resolveDefaultAppBaseUrl());
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(() => resolveDefaultApiBaseUrl());
  const [bootstrapContract, setBootstrapContract] = useState<WebchatSnippetBootstrapContract | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(false);
  const [bootstrapReloadNonce, setBootstrapReloadNonce] = useState(0);
  const [draftConfig, setDraftConfig] = useState<WebchatCustomizationContract>(() =>
    normalizeWebchatCustomizationContract(undefined)
  );
  const [channelEnabled, setChannelEnabled] = useState(false);
  const [hasDirtyDraft, setHasDirtyDraft] = useState(false);
  const hasDirtyDraftRef = useRef(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [configEndpointStatus, setConfigEndpointStatus] = useState<ValidationStatus>("idle");
  const [configEndpointError, setConfigEndpointError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<Record<SnippetMode, CopyState>>({
    script: "idle",
    react: "idle",
    iframe: "idle",
  });
  const [copiedModes, setCopiedModes] = useState<Record<SnippetMode, boolean>>({
    script: false,
    react: false,
    iframe: false,
  });
  const copyTimersRef = useRef<Partial<Record<SnippetMode, ReturnType<typeof setTimeout>>>>({});
  const lastSelectionKeyRef = useRef<string>("");

  const normalizedAppBaseUrl = useMemo(() => stripTrailingSlash(appBaseUrl.trim()), [appBaseUrl]);
  const normalizedApiBaseUrl = useMemo(() => stripTrailingSlash(apiBaseUrl.trim()), [apiBaseUrl]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generatedApi = (require("../../../../convex/_generated/api") as { api: any }).api;
  const agents = useQuery(
    generatedApi.agentOntology.getAgents,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  ) as AgentRecord[] | undefined;
  const updateAgent = useMutation(generatedApi.agentOntology.updateAgent);

  const selectedAgent = useMemo(
    () => agents?.find((agent) => agent._id === selectedAgentId) || null,
    [agents, selectedAgentId]
  );
  const selectedAgentBindings = useMemo(
    () => sanitizeChannelBindings(selectedAgent?.customProperties?.channelBindings),
    [selectedAgent]
  );
  const selectedChannelBinding = useMemo(
    () => getChannelBinding(selectedAgentBindings, selectedChannel),
    [selectedAgentBindings, selectedChannel]
  );
  const normalizedDraftConfig = useMemo(
    () => normalizeWebchatCustomizationContract(draftConfig as unknown as Record<string, unknown>),
    [draftConfig]
  );

  const appBaseUrlIsValid = isValidHttpUrl(normalizedAppBaseUrl);
  const apiBaseUrlIsValid = isValidApiBaseUrl(normalizedApiBaseUrl);
  const hasCopiedSnippet = Object.values(copiedModes).some(Boolean);
  const brandColorLooksValid = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(draftConfig.brandColor.trim());
  const languageLooksValid = /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})?$/.test(draftConfig.language.trim());
  const welcomeTooLong = draftConfig.welcomeMessage.length > 500;
  const bubbleTooLong = draftConfig.bubbleText.length > 80;
  const offlineTooLong = draftConfig.offlineMessage.length > 500;

  useEffect(() => {
    hasDirtyDraftRef.current = hasDirtyDraft;
  }, [hasDirtyDraft]);

  useEffect(() => {
    if (!agents || agents.length === 0) {
      setSelectedAgentId("");
      return;
    }

    if (selectedAgentId && agents.some((agent) => agent._id === selectedAgentId)) {
      return;
    }

    const preferredAgent =
      agents.find((agent) => {
        const bindings = sanitizeChannelBindings(agent.customProperties?.channelBindings);
        return hasChannelBinding(bindings, "webchat");
      }) ||
      agents.find((agent) => {
        const bindings = sanitizeChannelBindings(agent.customProperties?.channelBindings);
        return hasChannelBinding(bindings, "native_guest");
      }) ||
      agents[0];

    setSelectedAgentId(preferredAgent._id);
  }, [agents, selectedAgentId]);

  useEffect(() => {
    if (!selectedAgent) {
      return;
    }

    const hasWebchat = hasChannelBinding(selectedAgentBindings, "webchat");
    const hasNativeGuest = hasChannelBinding(selectedAgentBindings, "native_guest");

    if (selectedChannel === "webchat" && !hasWebchat && hasNativeGuest) {
      setSelectedChannel("native_guest");
      return;
    }
    if (selectedChannel === "native_guest" && !hasNativeGuest && hasWebchat) {
      setSelectedChannel("webchat");
    }
  }, [selectedAgent, selectedAgentBindings, selectedChannel]);

  useEffect(() => {
    const selectionKey = `${selectedAgentId}:${selectedChannel}`;
    if (!selectedAgentId || lastSelectionKeyRef.current === selectionKey) {
      return;
    }

    lastSelectionKeyRef.current = selectionKey;
    setChannelEnabled(selectedChannelBinding?.enabled ?? false);
    setDraftConfig(
      normalizeWebchatCustomizationContract(selectedChannelBinding as unknown as Record<string, unknown> | undefined)
    );
    setHasDirtyDraft(false);
    setSaveState("idle");
    setSaveError(null);
    setConfigEndpointStatus("idle");
    setConfigEndpointError(null);
    setCopyState({ script: "idle", react: "idle", iframe: "idle" });
    setCopiedModes({ script: false, react: false, iframe: false });
  }, [selectedAgentId, selectedChannel, selectedChannelBinding]);

  const loadBootstrapContract = useCallback(async () => {
    if (!selectedAgentId) {
      setBootstrapContract(null);
      setBootstrapError(null);
      return;
    }

    if (!apiBaseUrlIsValid) {
      setBootstrapContract(null);
      setBootstrapError("Enter a valid API base URL before loading deployment snippets.");
      return;
    }

    setIsBootstrapLoading(true);
    setBootstrapError(null);

    try {
      const response = await fetch(
        `${normalizedApiBaseUrl}/webchat/bootstrap/${encodeURIComponent(selectedAgentId)}?channel=${selectedChannel}`
      );
      const payload = (await response.json().catch(() => null)) as
        | WebchatSnippetBootstrapContract
        | { error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : `Bootstrap request failed (${response.status}).`;
        throw new Error(message);
      }

      const contract = payload as WebchatSnippetBootstrapContract;
      setBootstrapContract(contract);
      setBootstrapError(null);
      if (!hasDirtyDraftRef.current) {
        setDraftConfig(
          normalizeWebchatCustomizationContract(contract.config as unknown as Record<string, unknown>)
        );
        setChannelEnabled(true);
      }
    } catch (error) {
      setBootstrapContract(null);
      setBootstrapError(error instanceof Error ? error.message : "Unable to load bootstrap contract.");
    } finally {
      setIsBootstrapLoading(false);
    }
  }, [apiBaseUrlIsValid, normalizedApiBaseUrl, selectedAgentId, selectedChannel]);

  useEffect(() => {
    void loadBootstrapContract();
  }, [loadBootstrapContract, bootstrapReloadNonce]);

  useEffect(() => {
    const timers = copyTimersRef.current;
    return () => {
      for (const timer of Object.values(timers)) {
        if (timer) {
          clearTimeout(timer);
        }
      }
    };
  }, []);

  const liveBootstrapContract = useMemo(() => {
    if (!bootstrapContract) {
      return null;
    }

    return {
      ...bootstrapContract,
      config: {
        ...bootstrapContract.config,
        ...normalizedDraftConfig,
      },
    } as WebchatSnippetBootstrapContract;
  }, [bootstrapContract, normalizedDraftConfig]);

  const snippetBuild = useMemo(() => {
    if (!liveBootstrapContract) {
      return { snippets: null, snippetError: null as string | null };
    }

    if (!appBaseUrlIsValid) {
      return {
        snippets: null,
        snippetError: "App base URL must be an absolute http(s) URL to generate copy-safe snippets.",
      };
    }

    try {
      const snippets = generateWebchatDeploymentSnippets(liveBootstrapContract, {
        appBaseUrl: normalizedAppBaseUrl,
        apiUrl: normalizedApiBaseUrl,
      });
      return { snippets, snippetError: null as string | null };
    } catch (error) {
      return {
        snippets: null,
        snippetError: error instanceof Error ? error.message : "Unable to generate deployment snippets.",
      };
    }
  }, [appBaseUrlIsValid, liveBootstrapContract, normalizedApiBaseUrl, normalizedAppBaseUrl]);

  const handleCopySnippet = useCallback(async (mode: SnippetMode, snippet: string) => {
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }

      await navigator.clipboard.writeText(snippet);
      setCopyState((current) => ({ ...current, [mode]: "copied" }));
      setCopiedModes((current) => ({ ...current, [mode]: true }));

      if (copyTimersRef.current[mode]) {
        clearTimeout(copyTimersRef.current[mode]);
      }
      copyTimersRef.current[mode] = setTimeout(() => {
        setCopyState((current) => ({ ...current, [mode]: "idle" }));
      }, COPY_FEEDBACK_TIMEOUT_MS);
    } catch {
      setCopyState((current) => ({ ...current, [mode]: "error" }));
    }
  }, []);

  const runQuickChecks = useCallback(async () => {
    if (!selectedAgentId || !apiBaseUrlIsValid) {
      setConfigEndpointStatus("fail");
      setConfigEndpointError("Pick an agent and fix API base URL before running quick checks.");
      return;
    }

    setConfigEndpointStatus("running");
    setConfigEndpointError(null);

    try {
      const response = await fetch(
        `${normalizedApiBaseUrl}/webchat/config/${encodeURIComponent(selectedAgentId)}?channel=${selectedChannel}`
      );
      const payload = (await response.json().catch(() => null)) as
        | { agentId?: string; error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload && typeof payload.error === "string"
            ? payload.error
            : `Config check failed (${response.status}).`;
        throw new Error(message);
      }

      if (!payload || payload.agentId !== selectedAgentId) {
        throw new Error("Config endpoint returned an unexpected agent payload.");
      }

      setConfigEndpointStatus("pass");
    } catch (error) {
      setConfigEndpointStatus("fail");
      setConfigEndpointError(error instanceof Error ? error.message : "Unable to validate config endpoint.");
    }
  }, [apiBaseUrlIsValid, normalizedApiBaseUrl, selectedAgentId, selectedChannel]);

  const handleSaveConfig = useCallback(async () => {
    if (!sessionId || !selectedAgent) {
      return;
    }

    setSaveState("saving");
    setSaveError(null);

    try {
      const baseBindings = selectedAgentBindings
        .filter((binding) => binding.channel !== selectedChannel)
        .map((binding) => toBindingContract(binding));

      const updatedBinding = toBindingContract({
        channel: selectedChannel,
        enabled: channelEnabled,
        ...normalizedDraftConfig,
      });

      await updateAgent({
        sessionId,
        agentId: selectedAgent._id,
        updates: {
          channelBindings: [...baseBindings, updatedBinding],
        },
      });

      setSaveState("saved");
      setSaveError(null);
      setHasDirtyDraft(false);
      setLastSavedAt(Date.now());
      setBootstrapReloadNonce((value) => value + 1);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unable to save configuration.");
    }
  }, [
    channelEnabled,
    normalizedDraftConfig,
    selectedAgent,
    selectedAgentBindings,
    selectedChannel,
    sessionId,
    updateAgent,
  ]);

  if (!sessionId || !currentOrg?.id) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
        Sign in and select an organization to configure webchat deployment.
      </div>
    );
  }

  if (agents === undefined) {
    return (
      <div className="p-4 text-xs flex items-center gap-2" style={{ color: "var(--neutral-gray)" }}>
        <Loader2 size={14} className="animate-spin" />
        Loading deployment agents...
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
        No agents found. Create an agent and enable the webchat channel to generate deployment snippets.
      </div>
    );
  }

  const bootstrapStatus: ValidationStatus = isBootstrapLoading
    ? "running"
    : bootstrapContract
      ? "pass"
      : bootstrapError
        ? "fail"
        : "idle";
  const snippetStatus: ValidationStatus = snippetBuild.snippets
    ? "pass"
    : snippetBuild.snippetError
      ? "fail"
      : "idle";
  const copyStatus: ValidationStatus = hasCopiedSnippet ? "pass" : "idle";
  const saveStatusForChecks: ValidationStatus = saveState === "saved" ? "pass" : saveState === "error" ? "fail" : "idle";
  const channelEnabledForChecks: ValidationStatus = channelEnabled ? "pass" : "fail";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            Webchat Deployment
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Configure one agent channel, generate embed snippets, and validate deployment before publishing.
          </p>
        </div>
        <InteriorButton
          onClick={() => setBootstrapReloadNonce((value) => value + 1)}
          variant="secondary"
          size="sm"
          className="flex items-center gap-2 whitespace-nowrap"
          disabled={isBootstrapLoading}
        >
          <RefreshCw size={14} className={isBootstrapLoading ? "animate-spin" : ""} />
          Refresh Contract
        </InteriorButton>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div
          className="border-2 p-4 space-y-3"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
        >
          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--window-document-text)" }}>
            Setup
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                Agent
              </label>
              <select
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
                className="w-full px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "white", color: "var(--window-document-text)" }}
              >
                {agents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {resolveAgentLabel(agent)} ({agent.status || "draft"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                Channel
              </label>
              <select
                value={selectedChannel}
                onChange={(event) => setSelectedChannel(event.target.value as PublicInboundChannel)}
                className="w-full px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "white", color: "var(--window-document-text)" }}
              >
                <option value="webchat">Webchat</option>
                <option value="native_guest">Native Guest</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                App Base URL
              </label>
              <input
                value={appBaseUrl}
                onChange={(event) => setAppBaseUrl(event.target.value)}
                className="w-full px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "white", color: "var(--window-document-text)" }}
                placeholder="https://app.example.com"
              />
              <p className="text-[11px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                Used in script/iframe snippet URLs. Keep this production origin-specific.
              </p>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                API Base URL
              </label>
              <input
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
                className="w-full px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "white", color: "var(--window-document-text)" }}
                placeholder="/api/v1"
              />
              <p className="text-[11px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                Relative `/api/v1` works on same origin; use full URL for external API hosts.
              </p>
            </div>
          </div>

          <div className="space-y-1 text-[11px]">
            {!appBaseUrlIsValid && (
              <p className="flex items-center gap-1.5" style={{ color: "var(--error)" }}>
                <TriangleAlert size={12} />
                App base URL must be absolute (for example `https://app.example.com`).
              </p>
            )}
            {!apiBaseUrlIsValid && (
              <p className="flex items-center gap-1.5" style={{ color: "var(--error)" }}>
                <TriangleAlert size={12} />
                API base URL must start with `/` or `https://`.
              </p>
            )}
            {!channelEnabled && (
              <p className="flex items-center gap-1.5" style={{ color: "var(--warning)" }}>
                <TriangleAlert size={12} />
                Selected channel is disabled. Enable it before production rollout.
              </p>
            )}
            {bootstrapError && (
              <p className="flex items-center gap-1.5" style={{ color: "var(--error)" }}>
                <TriangleAlert size={12} />
                {bootstrapError}
              </p>
            )}
          </div>
        </div>

        <div
          className="border-2 p-4 space-y-3"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
        >
          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--window-document-text)" }}>
            Config And Preview
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-bold block" style={{ color: "var(--window-document-text)" }}>
              Bubble Label
              <input
                value={draftConfig.bubbleText}
                onChange={(event) => {
                  setDraftConfig((current) => ({ ...current, bubbleText: event.target.value }));
                  setHasDirtyDraft(true);
                }}
                className="mt-1 w-full px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "white", color: "var(--window-document-text)" }}
              />
            </label>

            <label className="text-xs font-bold block" style={{ color: "var(--window-document-text)" }}>
              Brand Color
              <div className="mt-1 flex gap-2">
                <input
                  value={draftConfig.brandColor}
                  onChange={(event) => {
                    setDraftConfig((current) => ({ ...current, brandColor: event.target.value }));
                    setHasDirtyDraft(true);
                  }}
                  className="flex-1 px-2 py-1 text-xs border-2"
                  style={{ borderColor: "var(--window-document-border)", background: "white", color: "var(--window-document-text)" }}
                />
                <input
                  type="color"
                  value={
                    brandColorLooksValid
                      ? normalizeWebchatCustomizationContract(draftConfig as unknown as Record<string, unknown>).brandColor
                      : "#7c3aed"
                  }
                  onChange={(event) => {
                    setDraftConfig((current) => ({ ...current, brandColor: event.target.value }));
                    setHasDirtyDraft(true);
                  }}
                  className="w-11 h-7 border-2 p-1"
                  style={{ borderColor: "var(--window-document-border)", background: "white" }}
                />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-bold block" style={{ color: "var(--window-document-text)" }}>
              Position
              <select
                value={draftConfig.position}
                onChange={(event) => {
                  setDraftConfig((current) => ({
                    ...current,
                    position: event.target.value as "bottom-left" | "bottom-right",
                  }));
                  setHasDirtyDraft(true);
                }}
                className="mt-1 w-full px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "white", color: "var(--window-document-text)" }}
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </label>
            <label className="text-xs font-bold block" style={{ color: "var(--window-document-text)" }}>
              Language
              <input
                value={draftConfig.language}
                onChange={(event) => {
                  setDraftConfig((current) => ({ ...current, language: event.target.value }));
                  setHasDirtyDraft(true);
                }}
                className="mt-1 w-full px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "white", color: "var(--window-document-text)" }}
                placeholder="en"
              />
            </label>
          </div>

          <label className="text-xs font-bold block" style={{ color: "var(--window-document-text)" }}>
            Welcome Message
            <textarea
              value={draftConfig.welcomeMessage}
              onChange={(event) => {
                setDraftConfig((current) => ({ ...current, welcomeMessage: event.target.value }));
                setHasDirtyDraft(true);
              }}
              rows={3}
              className="mt-1 w-full px-2 py-1 text-xs border-2"
              style={{ borderColor: "var(--window-document-border)", background: "white", color: "var(--window-document-text)" }}
            />
          </label>

          <label className="text-xs font-bold block" style={{ color: "var(--window-document-text)" }}>
            Offline Message
            <textarea
              value={draftConfig.offlineMessage}
              onChange={(event) => {
                setDraftConfig((current) => ({ ...current, offlineMessage: event.target.value }));
                setHasDirtyDraft(true);
              }}
              rows={2}
              className="mt-1 w-full px-2 py-1 text-xs border-2"
              style={{ borderColor: "var(--window-document-border)", background: "white", color: "var(--window-document-text)" }}
            />
          </label>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              <input
                type="checkbox"
                checked={channelEnabled}
                onChange={(event) => {
                  setChannelEnabled(event.target.checked);
                  setHasDirtyDraft(true);
                }}
              />
              Channel enabled
            </label>
            <label className="flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              <input
                type="checkbox"
                checked={draftConfig.collectContactInfo}
                onChange={(event) => {
                  setDraftConfig((current) => ({ ...current, collectContactInfo: event.target.checked }));
                  setHasDirtyDraft(true);
                }}
              />
              Collect contact info
            </label>
          </div>

          <div className="space-y-1 text-[11px]">
            {!brandColorLooksValid && (
              <p style={{ color: "var(--warning)" }}>
                Brand color hint: use `#RGB` or `#RRGGBB`; invalid values fall back to default on save.
              </p>
            )}
            {!languageLooksValid && (
              <p style={{ color: "var(--warning)" }}>
                Language hint: prefer locale format like `en`, `de`, or `en-US`.
              </p>
            )}
            {welcomeTooLong && <p style={{ color: "var(--warning)" }}>Welcome message hint: keep to 500 characters.</p>}
            {bubbleTooLong && <p style={{ color: "var(--warning)" }}>Bubble label hint: keep to 80 characters.</p>}
            {offlineTooLong && <p style={{ color: "var(--warning)" }}>Offline message hint: keep to 500 characters.</p>}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <InteriorButton
              onClick={handleSaveConfig}
              variant="primary"
              size="sm"
              className="flex items-center gap-2 whitespace-nowrap"
              disabled={saveState === "saving" || !selectedAgent}
            >
              {saveState === "saving" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {saveState === "saving" ? "Saving..." : "Save Config"}
            </InteriorButton>
            <div className="text-[11px]" style={{ color: saveState === "error" ? "var(--error)" : "var(--neutral-gray)" }}>
              {saveState === "saved" && lastSavedAt
                ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                : saveState === "error" && saveError
                  ? saveError
                  : "Changes persist to the agent channel binding contract."}
            </div>
          </div>

          <div
            className="border-2 p-3"
            style={{ borderColor: "var(--window-document-border)", background: "white" }}
          >
            <p className="text-[11px] font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
              Live Preview
            </p>
            <div
              className="relative h-28 border-2"
              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
            >
              <div
                className={`absolute bottom-3 ${normalizedDraftConfig.position === "bottom-left" ? "left-3" : "right-3"} px-3 py-1 rounded-full text-[11px] font-bold`}
                style={{ background: normalizedDraftConfig.brandColor, color: "white" }}
              >
                {normalizedDraftConfig.bubbleText}
              </div>
            </div>
            <p className="text-[11px] mt-2" style={{ color: "var(--window-document-text)" }}>
              <span className="font-bold">{selectedAgent ? resolveAgentLabel(selectedAgent) : "Agent"}:</span>{" "}
              {channelEnabled ? normalizedDraftConfig.welcomeMessage : normalizedDraftConfig.offlineMessage}
            </p>
          </div>
        </div>
      </div>

      <div
        className="border-2 p-4 space-y-3"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--window-document-text)" }}>
              Deploy Snippets
            </h4>
            <p className="text-[11px] mt-1" style={{ color: "var(--neutral-gray)" }}>
              Copy script, React, or iframe embeds with the latest channel configuration.
            </p>
          </div>
        </div>

        {snippetBuild.snippetError && (
          <p className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--error)" }}>
            <TriangleAlert size={12} />
            {snippetBuild.snippetError}
          </p>
        )}

        {snippetBuild.snippets ? (
          <div className="grid grid-cols-1 2xl:grid-cols-3 gap-3">
            <SnippetCard
              title="Script Embed"
              summary="Drop into any HTML page."
              snippet={snippetBuild.snippets.script}
              copyState={copyState.script}
              onCopy={() => handleCopySnippet("script", snippetBuild.snippets.script)}
              disabled={!snippetBuild.snippets}
            />
            <SnippetCard
              title="React Embed"
              summary="Use directly in a React component."
              snippet={snippetBuild.snippets.react}
              copyState={copyState.react}
              onCopy={() => handleCopySnippet("react", snippetBuild.snippets.react)}
              disabled={!snippetBuild.snippets}
            />
            <SnippetCard
              title="Iframe Embed"
              summary="Pinned launcher with isolated runtime."
              snippet={snippetBuild.snippets.iframe}
              copyState={copyState.iframe}
              onCopy={() => handleCopySnippet("iframe", snippetBuild.snippets.iframe)}
              disabled={!snippetBuild.snippets}
            />
          </div>
        ) : (
          <div
            className="border-2 p-4 text-xs"
            style={{ borderColor: "var(--window-document-border)", background: "white", color: "var(--neutral-gray)" }}
          >
            Bootstrap contract and a valid app base URL are required before snippets can be generated.
          </div>
        )}
      </div>

      <div
        className="border-2 p-4 space-y-3"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--window-document-text)" }}>
              Quick Checks
            </h4>
            <p className="text-[11px] mt-1" style={{ color: "var(--neutral-gray)" }}>
              Validate contract readiness before handing snippets to engineering or embedding on production pages.
            </p>
          </div>
          <InteriorButton
            onClick={runQuickChecks}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 whitespace-nowrap"
            disabled={configEndpointStatus === "running"}
          >
            {configEndpointStatus === "running" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Run Quick Checks
          </InteriorButton>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <StatusDot status={bootstrapStatus} />
            <span style={{ color: "var(--window-document-text)" }}>Bootstrap contract resolved for selected agent/channel</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot status={snippetStatus} />
            <span style={{ color: "var(--window-document-text)" }}>Snippets generated from deterministic contract</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot status={copyStatus} />
            <span style={{ color: "var(--window-document-text)" }}>At least one snippet copied via one-click action</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot status={channelEnabledForChecks} />
            <span style={{ color: "var(--window-document-text)" }}>Channel enabled in webchat binding</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot status={saveStatusForChecks} />
            <span style={{ color: "var(--window-document-text)" }}>Configuration persisted to backend channel contract</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot status={configEndpointStatus} />
            <span style={{ color: "var(--window-document-text)" }}>`GET /webchat/config/:agentId` returns active payload</span>
          </div>
        </div>

        {configEndpointError && (
          <p className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--error)" }}>
            <TriangleAlert size={12} />
            {configEndpointError}
          </p>
        )}

        <div className="text-[11px] space-y-1" style={{ color: "var(--neutral-gray)" }}>
          <p>Required env hints: `NEXT_PUBLIC_APP_URL` for absolute snippet links and `NEXT_PUBLIC_API_ENDPOINT_URL` when API host differs from app host.</p>
          <p>Production spot check: paste the snippet into a sandbox page, confirm launcher label/color, then send one message to verify response + session continuity.</p>
        </div>
      </div>
    </div>
  );
}
