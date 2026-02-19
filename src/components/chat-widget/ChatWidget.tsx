"use client";

/**
 * CHAT WIDGET
 *
 * Embeddable webchat widget for AI agents.
 * Can be embedded on any website via script tag, React component, or iframe.
 *
 * Usage (React):
 *   import { ChatWidget } from "@/components/chat-widget";
 *   <ChatWidget agentId="abc123" apiUrl="https://api.l4yercak3.com" />
 *
 * Usage (Script tag):
 *   <script src="https://l4yercak3.com/widget.js" data-agent-id="abc123"></script>
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MessageSquare, X, Send, Loader2, User, Bot } from "lucide-react";
import {
  normalizeWebchatCustomizationContract,
  normalizeWebchatCustomizationOverrides,
  type PublicInboundChannel,
  type WebchatCustomizationContract,
  type WebchatCustomizationOverrides,
  type WebchatWidgetPosition,
} from "../../../convex/webchatCustomizationContractCore";
import { parseWebchatSnippetRuntimeSeedFromQuery } from "./deploymentSnippets";

// ============================================================================
// TYPES
// ============================================================================

export interface WebchatConfig extends WebchatCustomizationContract {
  agentId: string;
  agentName: string;
  avatar?: string;
}

interface PublicWebchatBootstrapContract {
  contractVersion: string;
  resolvedAt: number;
  channel: PublicInboundChannel;
  organizationId: string;
  agentId: string;
  config: WebchatConfig;
  deploymentDefaults: {
    snippetMode: "script";
    iframe: {
      width: number;
      height: number;
      offsetPx: number;
      position: WebchatWidgetPosition;
    };
  };
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actions?: ChatConversionAction[];
}

type HitlQuickAction = "takeover" | "resume";
type HitlRuntimeState = "pending" | "taken_over" | null;

type ChatConversionKind =
  | "create_account"
  | "resume_chat"
  | "upgrade_plan"
  | "buy_credits"
  | "open_link";

interface ChatConversionAction {
  key: string;
  kind: ChatConversionKind;
  label: string;
  href: string;
}

interface CampaignAttribution {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPath?: string;
}

interface VisitorInfoInput {
  name?: string;
  email?: string;
}

export interface ChatWidgetProps {
  /** Agent ID to connect to */
  agentId?: string;
  /** Legacy optional org ID; server now resolves canonical org context. */
  organizationId?: string;
  /** API base URL (defaults to /api/v1) */
  apiUrl?: string;
  /** Public channel (webchat default) */
  channel?: PublicInboundChannel;
  /** Optional customization overrides from deploy snippets */
  customization?: WebchatCustomizationOverrides;
  /** Override position (default comes from config) */
  position?: WebchatWidgetPosition;
  /** Override brand color */
  brandColor?: string;
  /** Optional prefilled visitor metadata */
  visitorInfo?: VisitorInfoInput;
  /** Initially open */
  defaultOpen?: boolean;
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const STORAGE_KEY_PREFIX = "l4yercak3_webchat_";

function getStorageKey(agentId: string, key: string): string {
  return `${STORAGE_KEY_PREFIX}${agentId}_${key}`;
}

function getSessionToken(agentId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getStorageKey(agentId, "sessionToken"));
}

function setSessionToken(agentId: string, token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey(agentId, "sessionToken"), token);
}

function getStoredMessages(agentId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(getStorageKey(agentId, "messages"));
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function setStoredMessages(agentId: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  // Keep only last 50 messages to avoid localStorage limits
  const toStore = messages.slice(-50);
  localStorage.setItem(getStorageKey(agentId, "messages"), JSON.stringify(toStore));
}

function getClaimToken(agentId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getStorageKey(agentId, "claimToken"));
}

function setClaimToken(agentId: string, token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey(agentId, "claimToken"), token);
}

function getDeviceFingerprint(agentId: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const key = getStorageKey(agentId, "deviceFingerprint");
  const existing = localStorage.getItem(key);
  if (existing && existing.length > 0) {
    return existing;
  }

  const created = `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  localStorage.setItem(key, created);
  return created;
}

function readCampaignAttribution(): CampaignAttribution | undefined {
  if (typeof window === "undefined") return undefined;
  const url = new URL(window.location.href);
  const attribution: CampaignAttribution = {
    source: url.searchParams.get("utm_source") || url.searchParams.get("utmSource") || undefined,
    medium: url.searchParams.get("utm_medium") || url.searchParams.get("utmMedium") || undefined,
    campaign: url.searchParams.get("utm_campaign") || url.searchParams.get("utmCampaign") || undefined,
    content: url.searchParams.get("utm_content") || url.searchParams.get("utmContent") || undefined,
    term: url.searchParams.get("utm_term") || url.searchParams.get("utmTerm") || undefined,
    referrer: document.referrer || undefined,
    landingPath: `${url.pathname}${url.search}`,
  };

  const hasSignal = Object.values(attribution).some((value) => typeof value === "string" && value.length > 0);
  return hasSignal ? attribution : undefined;
}

function withOnboardingAttribution(url: string, channel: "webchat" | "native_guest", attribution?: CampaignAttribution): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("onboardingChannel", channel);

    if (attribution?.source) parsed.searchParams.set("utm_source", attribution.source);
    if (attribution?.medium) parsed.searchParams.set("utm_medium", attribution.medium);
    if (attribution?.campaign) parsed.searchParams.set("utm_campaign", attribution.campaign);
    if (attribution?.content) parsed.searchParams.set("utm_content", attribution.content);
    if (attribution?.term) parsed.searchParams.set("utm_term", attribution.term);
    if (attribution?.referrer) parsed.searchParams.set("referrer", attribution.referrer);
    if (attribution?.landingPath) parsed.searchParams.set("landingPath", attribution.landingPath);

    return parsed.toString();
  } catch {
    return url;
  }
}

function resolveAppBaseUrl(apiUrl: string): string {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl && configuredAppUrl.length > 0) {
    return configuredAppUrl.replace(/\/+$/, "");
  }

  try {
    if (apiUrl.startsWith("http")) {
      const parsed = new URL(apiUrl);
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    // Fall through to browser origin.
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "";
}

function buildSignupUrl(
  apiUrl: string,
  claimToken?: string | null,
  attribution?: CampaignAttribution
): string {
  const appBaseUrl = resolveAppBaseUrl(apiUrl);
  const params = new URLSearchParams({
    provider: "google",
    sessionType: "platform",
    onboardingChannel: "webchat",
  });
  if (claimToken) {
    params.set("identityClaimToken", claimToken);
  }
  if (attribution?.source) params.set("utm_source", attribution.source);
  if (attribution?.medium) params.set("utm_medium", attribution.medium);
  if (attribution?.campaign) params.set("utm_campaign", attribution.campaign);
  if (attribution?.content) params.set("utm_content", attribution.content);
  if (attribution?.term) params.set("utm_term", attribution.term);
  if (attribution?.referrer) params.set("referrer", attribution.referrer);
  if (attribution?.landingPath) params.set("landingPath", attribution.landingPath);
  return `${appBaseUrl}/api/auth/oauth-signup?${params.toString()}`;
}

function classifyConversionAction(url: URL): ChatConversionKind {
  if (url.pathname === "/api/auth/oauth-signup") {
    return "create_account";
  }

  if (url.pathname === "/chat" || url.searchParams.get("conversation")) {
    return "resume_chat";
  }

  if (url.searchParams.get("openWindow") === "store") {
    const panel = (url.searchParams.get("panel") || "").toLowerCase();
    if (panel.includes("credit")) return "buy_credits";
    return "upgrade_plan";
  }

  if (url.hostname.includes("checkout.stripe.com")) {
    return "buy_credits";
  }

  return "open_link";
}

function getActionLabel(kind: ChatConversionKind): string {
  switch (kind) {
    case "create_account":
      return "Create account";
    case "resume_chat":
      return "Resume chat";
    case "upgrade_plan":
      return "Upgrade";
    case "buy_credits":
      return "Buy credits";
    default:
      return "Open link";
  }
}

function extractMessageActions(content: string): ChatConversionAction[] {
  const urlRegex = /https?:\/\/[^\s<>"'`]+/g;
  const matches = content.match(urlRegex) || [];
  const dedupe = new Set<string>();
  const actions: ChatConversionAction[] = [];

  for (const rawUrl of matches) {
    try {
      const parsed = new URL(rawUrl);
      const normalized = parsed.toString();
      if (dedupe.has(normalized)) continue;
      dedupe.add(normalized);
      const kind = classifyConversionAction(parsed);
      actions.push({
        key: `${kind}:${normalized}`,
        kind,
        label: getActionLabel(kind),
        href: normalized,
      });
    } catch {
      // Ignore invalid URLs parsed from assistant text.
    }
  }

  return actions;
}

function inferHitlRuntimeState(messages: ChatMessage[]): HitlRuntimeState {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") {
      continue;
    }

    const normalized = message.content.toLowerCase();
    if (normalized.includes("being handled by a team member")) {
      return "taken_over";
    }
    if (normalized.includes("team has been notified and will be with you shortly")) {
      return "pending";
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseWidgetConfigPayload(payload: unknown, fallbackAgentId: string): WebchatConfig | null {
  if (!isRecord(payload)) {
    return null;
  }

  const source = isRecord(payload.config) ? payload.config : payload;
  const customization = normalizeWebchatCustomizationContract(source);
  const agentName =
    typeof source.agentName === "string" && source.agentName.trim().length > 0
      ? source.agentName.trim()
      : "AI Assistant";
  const avatar =
    typeof source.avatar === "string" && source.avatar.trim().length > 0
      ? source.avatar.trim()
      : undefined;

  return {
    agentId:
      typeof source.agentId === "string" && source.agentId.trim().length > 0
        ? source.agentId.trim()
        : fallbackAgentId,
    agentName,
    avatar,
    ...customization,
  };
}

function resolveUiCopy(language: string): {
  onlineLabel: string;
  inputPlaceholder: string;
  closeAria: string;
} {
  const normalized = language.toLowerCase();

  if (normalized.startsWith("de")) {
    return {
      onlineLabel: "Online",
      inputPlaceholder: "Nachricht schreiben...",
      closeAria: "Chat schliessen",
    };
  }

  return {
    onlineLabel: "Online",
    inputPlaceholder: "Type a message...",
    closeAria: "Close chat",
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ChatWidget({
  agentId: agentIdProp,
  organizationId,
  apiUrl,
  channel: channelProp = "webchat",
  customization,
  position: positionOverride,
  brandColor: brandColorOverride,
  visitorInfo: visitorInfoProp,
  defaultOpen = false,
}: ChatWidgetProps) {
  const querySeed = useMemo(
    () =>
      typeof window === "undefined"
        ? {}
        : parseWebchatSnippetRuntimeSeedFromQuery(window.location.search),
    []
  );
  const resolvedAgentId = useMemo(() => {
    const directAgentId = typeof agentIdProp === "string" ? agentIdProp.trim() : "";
    if (directAgentId.length > 0) {
      return directAgentId;
    }
    const queryAgentId = typeof querySeed.agentId === "string" ? querySeed.agentId.trim() : "";
    return queryAgentId.length > 0 ? queryAgentId : null;
  }, [agentIdProp, querySeed.agentId]);
  const resolvedApiUrl = useMemo(() => {
    const directApi = typeof apiUrl === "string" ? apiUrl.trim() : "";
    if (directApi.length > 0) {
      return directApi.replace(/\/+$/, "");
    }
    const queryApi = typeof querySeed.apiUrl === "string" ? querySeed.apiUrl.trim() : "";
    if (queryApi.length > 0) {
      return queryApi.replace(/\/+$/, "");
    }
    return "/api/v1";
  }, [apiUrl, querySeed.apiUrl]);
  const resolvedChannel = useMemo<PublicInboundChannel>(
    () => channelProp || querySeed.channel || "webchat",
    [channelProp, querySeed.channel]
  );
  const snippetCustomization = useMemo<WebchatCustomizationOverrides>(
    () => querySeed.customization || {},
    [querySeed.customization]
  );
  const propCustomization = useMemo(
    () =>
      normalizeWebchatCustomizationOverrides({
        ...(customization || {}),
        ...(positionOverride ? { position: positionOverride } : {}),
        ...(brandColorOverride ? { brandColor: brandColorOverride } : {}),
      }),
    [brandColorOverride, customization, positionOverride]
  );
  const runtimeCustomizationOverrides = useMemo(
    () => ({
      ...snippetCustomization,
      ...propCustomization,
    }),
    [propCustomization, snippetCustomization]
  );

  // State
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [config, setConfig] = useState<WebchatConfig | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isApplyingHitlAction, setIsApplyingHitlAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimToken, setClaimTokenState] = useState<string | null>(null);
  const [visitorInfoState, setVisitorInfoState] = useState<VisitorInfoInput>({
    name: visitorInfoProp?.name || "",
    email: visitorInfoProp?.email || "",
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derived values
  const effectiveConfig = useMemo<WebchatConfig>(() => {
    const normalized = normalizeWebchatCustomizationContract(
      {
        ...(config || {}),
        ...runtimeCustomizationOverrides,
      },
      runtimeCustomizationOverrides
    );

    return {
      agentId: resolvedAgentId || config?.agentId || "",
      agentName: config?.agentName || "AI Assistant",
      avatar: config?.avatar,
      ...normalized,
    };
  }, [config, resolvedAgentId, runtimeCustomizationOverrides]);
  const position = effectiveConfig.position;
  const brandColor = effectiveConfig.brandColor;
  const appBaseUrl = useMemo(() => resolveAppBaseUrl(resolvedApiUrl), [resolvedApiUrl]);
  const attribution = useMemo(() => readCampaignAttribution(), []);
  const uiCopy = useMemo(() => resolveUiCopy(effectiveConfig.language), [effectiveConfig.language]);
  const hitlRuntimeState = useMemo(() => inferHitlRuntimeState(messages), [messages]);
  const currentSessionToken = useMemo(
    () => (resolvedAgentId ? getSessionToken(resolvedAgentId) : null),
    [resolvedAgentId, messages.length]
  );
  const showHitlQuickActions =
    resolvedChannel === "webchat" &&
    Boolean(currentSessionToken) &&
    hitlRuntimeState !== null;

  useEffect(() => {
    if (!visitorInfoProp) {
      return;
    }
    setVisitorInfoState({
      name: visitorInfoProp.name || "",
      email: visitorInfoProp.email || "",
    });
  }, [visitorInfoProp, visitorInfoProp?.email, visitorInfoProp?.name]);

  // ============================================================================
  // FETCH CONFIG
  // ============================================================================

  useEffect(() => {
    const activeAgentId = resolvedAgentId;
    if (!activeAgentId) {
      return;
    }
    const stableAgentId: string = activeAgentId;

    async function fetchConfig() {
      setIsLoading(true);
      setError(null);

      try {
        const bootstrapResponse = await fetch(
          `${resolvedApiUrl}/webchat/bootstrap/${stableAgentId}?channel=${resolvedChannel}`,
          { cache: "no-store" }
        );
        if (bootstrapResponse.ok) {
          const bootstrapData = (await bootstrapResponse.json()) as PublicWebchatBootstrapContract;
          const parsedBootstrapConfig = parseWidgetConfigPayload(bootstrapData, stableAgentId);
          if (parsedBootstrapConfig) {
            setConfig(parsedBootstrapConfig);
          }
        } else {
          const configResponse = await fetch(
            `${resolvedApiUrl}/webchat/config/${stableAgentId}?channel=${resolvedChannel}`,
            { cache: "no-store" }
          );
          if (!configResponse.ok) {
            throw new Error("Failed to load chat configuration");
          }

          const configData = await configResponse.json();
          const parsedConfig = parseWidgetConfigPayload(configData, stableAgentId);
          if (!parsedConfig) {
            throw new Error("Invalid chat configuration payload");
          }
          setConfig(parsedConfig);
        }

        // Load stored messages
        const storedMessages = getStoredMessages(stableAgentId);
        if (storedMessages.length > 0) {
          setMessages(storedMessages);
        }

        // Load existing claim token to preserve guest->auth continuity
        const storedClaimToken = getClaimToken(stableAgentId);
        if (storedClaimToken) {
          setClaimTokenState(storedClaimToken);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load widget");
        console.error("[ChatWidget] Config fetch failed:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchConfig();
  }, [resolvedAgentId, resolvedApiUrl, resolvedChannel]);

  // ============================================================================
  // AUTO SCROLL
  // ============================================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ============================================================================
  // SEND MESSAGE
  // ============================================================================

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending || !resolvedAgentId) return;

      setIsSending(true);
      setError(null);

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const updated = [...prev, userMessage];
        setStoredMessages(resolvedAgentId, updated);
        return updated;
      });
      setInput("");

      try {
        const sessionToken = getSessionToken(resolvedAgentId);
        const deviceFingerprint = getDeviceFingerprint(resolvedAgentId);
        const trimmedName = visitorInfoState.name?.trim();
        const trimmedEmail = visitorInfoState.email?.trim();
        const visitorInfo =
          effectiveConfig.collectContactInfo && (trimmedName || trimmedEmail)
            ? {
                ...(trimmedName ? { name: trimmedName } : {}),
                ...(trimmedEmail ? { email: trimmedEmail } : {}),
              }
            : undefined;
        const messageEndpoint =
          resolvedChannel === "native_guest"
            ? `${resolvedApiUrl}/native-guest/message`
            : `${resolvedApiUrl}/webchat/message`;

        const response = await fetch(messageEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agentId: resolvedAgentId,
            organizationId,
            message: text.trim(),
            sessionToken,
            deviceFingerprint,
            visitorInfo,
            attribution,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to send message");
        }

        const data = await response.json();

        // Store session token for future messages
        if (data.sessionToken) {
          setSessionToken(resolvedAgentId, data.sessionToken);
        }

        // Store latest claim token so signup/login can claim this guest session
        if (data.claimToken) {
          setClaimToken(resolvedAgentId, data.claimToken);
          setClaimTokenState(data.claimToken);
        }

        // Add assistant response
        if (data.response) {
          const detectedActions = extractMessageActions(data.response);
          const assistantMessage: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: "assistant",
            content: data.response,
            timestamp: Date.now(),
            actions: detectedActions.length > 0 ? detectedActions : undefined,
          };
          setMessages((prev) => {
            const updated = [...prev, assistantMessage];
            setStoredMessages(resolvedAgentId, updated);
            return updated;
          });
        }
      } catch (err) {
        const fallbackError =
          err instanceof Error && err.message ? err.message : effectiveConfig.offlineMessage;
        setError(fallbackError || "Failed to send message");
        console.error("[ChatWidget] Send failed:", err);
      } finally {
        setIsSending(false);
      }
    },
    [
      attribution,
      effectiveConfig.collectContactInfo,
      effectiveConfig.offlineMessage,
      isSending,
      organizationId,
      resolvedAgentId,
      resolvedApiUrl,
      resolvedChannel,
      visitorInfoState.email,
      visitorInfoState.name,
    ]
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const applyHitlQuickAction = useCallback(
    async (action: HitlQuickAction) => {
      if (!resolvedAgentId || isApplyingHitlAction) {
        return;
      }

      const sessionToken = getSessionToken(resolvedAgentId);
      if (!sessionToken) {
        setError("No active session available for HITL quick action");
        return;
      }

      setIsApplyingHitlAction(true);
      setError(null);

      try {
        const response = await fetch(`${resolvedApiUrl}/webchat/hitl`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionToken,
            action,
            actorLabel: visitorInfoState.name?.trim() || undefined,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to apply HITL quick action");
        }

        const assistantMessage: ChatMessage = {
          id: `assistant_hitl_${Date.now()}`,
          role: "assistant",
          content:
            typeof data.message === "string" && data.message.trim().length > 0
              ? data.message
              : action === "takeover"
                ? "Human takeover is active for this conversation."
                : "Agent resumed autonomous handling for this conversation.",
          timestamp: Date.now(),
        };

        setMessages((prev) => {
          const updated = [...prev, assistantMessage];
          setStoredMessages(resolvedAgentId, updated);
          return updated;
        });
      } catch (err) {
        const quickActionError =
          err instanceof Error && err.message
            ? err.message
            : "Failed to apply HITL quick action";
        setError(quickActionError);
        console.error("[ChatWidget] HITL quick action failed:", err);
      } finally {
        setIsApplyingHitlAction(false);
      }
    },
    [isApplyingHitlAction, resolvedAgentId, resolvedApiUrl, visitorInfoState.name]
  );

  const handleActionClick = (action: ChatConversionAction) => {
    if (typeof window === "undefined") return;

    if (action.kind === "resume_chat") {
      window.location.href = withOnboardingAttribution(action.href, resolvedChannel, attribution);
      return;
    }

    if (action.kind === "create_account") {
      const signupUrl = action.href || buildSignupUrl(resolvedApiUrl, claimToken, attribution);
      window.location.href = signupUrl;
      return;
    }

    window.location.href = withOnboardingAttribution(action.href, resolvedChannel, attribution);
  };

  const conversionActions: ChatConversionAction[] = useMemo(
    () => [
      {
        key: "create-account",
        kind: "create_account",
        label: "Create account",
        href: buildSignupUrl(resolvedApiUrl, claimToken, attribution),
      },
      {
        key: "resume-chat",
        kind: "resume_chat",
        label: "Resume chat",
        href: withOnboardingAttribution(`${appBaseUrl}/chat`, resolvedChannel, attribution),
      },
      {
        key: "upgrade",
        kind: "upgrade_plan",
        label: "Upgrade",
        href: withOnboardingAttribution(
          `${appBaseUrl}/?openWindow=store&panel=plans`,
          resolvedChannel,
          attribution
        ),
      },
      {
        key: "credits",
        kind: "buy_credits",
        label: "Buy credits",
        href: withOnboardingAttribution(
          `${appBaseUrl}/?openWindow=store&panel=credits`,
          resolvedChannel,
          attribution
        ),
      },
    ],
    [appBaseUrl, attribution, claimToken, resolvedApiUrl, resolvedChannel]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  // Position styles
  const positionStyles =
    position === "bottom-left"
      ? { left: "20px", bottom: "20px" }
      : { right: "20px", bottom: "20px" };

  if (!resolvedAgentId) {
    return null;
  }

  // Loading state (config not yet loaded)
  if (isLoading) {
    return (
      <div className="fixed z-[9999]" style={positionStyles}>
        <button
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: brandColor }}
          disabled
        >
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </button>
      </div>
    );
  }

  // Error state
  if (error && !config) {
    return null; // Silently fail if config couldn't load
  }

  return (
    <div className="fixed z-[9999]" style={positionStyles} lang={effectiveConfig.language}>
      {/* Chat Window */}
      {isOpen && (
        <div
          className="mb-4 w-[380px] max-w-[calc(100vw-40px)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            height: "min(600px, calc(100vh - 120px))",
            border: `1px solid ${brandColor}20`,
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: brandColor }}
          >
            <div className="flex items-center gap-3">
              {effectiveConfig.avatar ? (
                <img
                  src={effectiveConfig.avatar}
                  alt={effectiveConfig.agentName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-white text-sm">
                  {effectiveConfig.agentName || "Chat"}
                </h3>
                <p className="text-white/70 text-xs">{uiCopy.onlineLabel}</p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {/* Welcome message */}
            {messages.length === 0 && effectiveConfig.welcomeMessage && (
              <div className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: `${brandColor}20` }}
                >
                  <Bot className="w-4 h-4" style={{ color: brandColor }} />
                </div>
                <div
                  className="rounded-2xl rounded-tl-md px-4 py-2 max-w-[80%] bg-white shadow-sm"
                  style={{ border: `1px solid ${brandColor}10` }}
                >
                  <p className="text-sm text-gray-700">{effectiveConfig.welcomeMessage}</p>
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                    message.role === "user" ? "bg-gray-200" : ""
                  }`}
                  style={
                    message.role === "assistant"
                      ? { backgroundColor: `${brandColor}20` }
                      : undefined
                  }
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Bot className="w-4 h-4" style={{ color: brandColor }} />
                  )}
                </div>
                <div
                  className={`rounded-2xl px-4 py-2 max-w-[80%] ${
                    message.role === "user"
                      ? "rounded-tr-md text-white"
                      : "rounded-tl-md bg-white shadow-sm"
                  }`}
                  style={
                    message.role === "user"
                      ? { backgroundColor: brandColor }
                      : { border: `1px solid ${brandColor}10` }
                  }
                >
                  <p className={`text-sm ${message.role === "user" ? "text-white" : "text-gray-700"}`}>
                    {message.content}
                  </p>
                  {message.role === "assistant" && message.actions && message.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.actions.map((action) => (
                        <button
                          key={action.key}
                          type="button"
                          onClick={() => handleActionClick(action)}
                          className="px-2 py-1 text-[11px] rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isSending && (
              <div className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: `${brandColor}20` }}
                >
                  <Bot className="w-4 h-4" style={{ color: brandColor }} />
                </div>
                <div
                  className="rounded-2xl rounded-tl-md px-4 py-3 bg-white shadow-sm"
                  style={{ border: `1px solid ${brandColor}10` }}
                >
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: brandColor, animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: brandColor, animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: brandColor, animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Conversion shortcuts */}
          <div className="px-4 py-2 border-t border-gray-100 bg-white">
            <div className="flex flex-wrap gap-1.5">
              {conversionActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => handleActionClick(action)}
                  className="px-2.5 py-1 text-[11px] rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* HITL quick actions */}
          {showHitlQuickActions && (
            <div className="px-4 py-2 border-t border-gray-100 bg-white">
              <div className="flex flex-wrap gap-1.5">
                {hitlRuntimeState === "pending" && (
                  <button
                    type="button"
                    onClick={() => applyHitlQuickAction("takeover")}
                    disabled={isApplyingHitlAction}
                    className="px-2.5 py-1 text-[11px] rounded-full border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-60"
                  >
                    Take over
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => applyHitlQuickAction("resume")}
                  disabled={isApplyingHitlAction}
                  className="px-2.5 py-1 text-[11px] rounded-full border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-60"
                >
                  Resume agent
                </button>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-100">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-gray-100 bg-white"
          >
            {effectiveConfig.collectContactInfo && messages.length === 0 && (
              <div className="mb-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={visitorInfoState.name || ""}
                  onChange={(e) =>
                    setVisitorInfoState((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Name (optional)"
                  className="px-3 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-gray-300"
                />
                <input
                  type="email"
                  value={visitorInfoState.email || ""}
                  onChange={(e) =>
                    setVisitorInfoState((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="Email (optional)"
                  className="px-3 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-gray-300"
                />
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={uiCopy.inputPlaceholder}
                disabled={isSending}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: brandColor }}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>

          {/* Powered by */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-[10px] text-gray-400 text-center">
              Powered by{" "}
              <a
                href="https://l4yercak3.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-600"
              >
                l4yercak3
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        style={{ backgroundColor: brandColor }}
        aria-label={isOpen ? uiCopy.closeAria : effectiveConfig.bubbleText}
        title={effectiveConfig.bubbleText}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="flex items-center gap-1.5 px-2">
            <MessageSquare className="w-5 h-5 text-white" />
            {effectiveConfig.bubbleText && (
              <span className="text-[11px] font-medium text-white leading-none max-w-[72px] truncate">
                {effectiveConfig.bubbleText}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}

export default ChatWidget;
export type ChatWidgetType = typeof ChatWidget;
