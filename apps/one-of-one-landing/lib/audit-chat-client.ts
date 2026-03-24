import { NATIVE_GUEST_ONBOARDING_SURFACE_ONE_OF_ONE_LANDING_AUDIT } from "../../../convex/onboarding/universalOnboardingPolicy";

export interface LandingAuditMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
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

interface NativeGuestMessageResponse {
  sessionToken?: string;
  claimToken?: string | null;
  response?: string;
  message?: string;
  error?: string;
}

export interface LandingAuditRuntimeConfig {
  apiBaseUrl: string;
  agentId: string | null;
  onboardingSurface: string | null;
}

interface NativeGuestConfigResponse {
  agentId?: string;
  apiBaseUrl?: string;
  onboardingSurface?: string;
}

export interface LandingAuditStateSnapshot {
  messages: LandingAuditMessage[];
  sessionToken: string | null;
  claimToken: string | null;
}

export interface LandingAuditSendResult {
  assistantMessage: string;
  sessionToken: string | null;
  claimToken: string | null;
}

interface NativeGuestRequestPayload {
  agentId: string;
  message: string;
  sessionToken?: string;
  onboardingSurface?: string;
  idempotencyKey?: string;
  requestCorrelationId?: string;
  deviceFingerprint?: string;
  attribution?: CampaignAttribution;
}

type NativeGuestAttemptStage =
  | "initial"
  | "retry_without_session"
  | "retry_with_refreshed_agent";

function isSessionContextErrorMessage(message?: string): boolean {
  if (typeof message !== "string" || message.trim().length === 0) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes("agent not found") ||
    normalized.includes("disabled") ||
    normalized.includes("session context invalid") ||
    normalized.includes("session context mismatch") ||
    normalized.includes("session token channel mismatch") ||
    normalized.includes("no session token found for the current audit conversation")
  );
}

function isDuplicateInboundAckMessage(message?: string): boolean {
  if (typeof message !== "string" || message.trim().length === 0) {
    return false;
  }
  return message.toLowerCase().includes("duplicate inbound event acknowledged");
}

function resolveFriendlyNativeGuestErrorMessage(args: {
  status: number;
  detail?: string;
}): string {
  if (args.status === 400) {
    return "We could not process your message right now. Please refresh and try again."
  }
  if (args.status === 429) {
    return "Too many requests right now. Please wait a moment and try again."
  }
  if (args.status >= 500) {
    return "Our audit chat is temporarily unavailable. Please try again in a minute."
  }
  if (args.detail && args.detail.trim().length > 0) {
    return args.detail.trim()
  }
  return "Unable to send your message right now. Please try again."
}

const STORAGE_PREFIX = "l4yercak3_native_guest_";
const SESSION_TOKEN_KEY = `${STORAGE_PREFIX}session_token`;
const CLAIM_TOKEN_KEY = `${STORAGE_PREFIX}claim_token`;
const MESSAGES_KEY = `${STORAGE_PREFIX}messages`;
const DEVICE_FINGERPRINT_KEY = `${STORAGE_PREFIX}device_fingerprint`;
const LANDING_AUDIT_DEBUG_KEY = "ooo_chat_debug";
const LANDING_AUDIT_DEBUG_FORCE_ENABLED = true;
const MAX_STORED_MESSAGES = 80;
export const LANDING_AUDIT_STATE_EVENT = "ooo-native-guest-state";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isEnabledDebugToken(value?: string | null): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

function isLandingAuditDebugEnabled(): boolean {
  if (LANDING_AUDIT_DEBUG_FORCE_ENABLED) {
    return true;
  }
  const envEnabled = isEnabledDebugToken(process.env.NEXT_PUBLIC_OOO_CHAT_DEBUG);
  if (!isBrowser()) {
    return envEnabled;
  }

  const storageEnabled = isEnabledDebugToken(readStorageValue(LANDING_AUDIT_DEBUG_KEY));
  const params = new URLSearchParams(window.location.search);
  const queryEnabled = isEnabledDebugToken(
    params.get("chatDebug")
    || params.get("oooChatDebug")
  );
  return envEnabled || storageEnabled || queryEnabled;
}

function resolveNativeGuestErrorCode(message?: string): string | undefined {
  if (typeof message !== "string" || message.trim().length === 0) {
    return undefined;
  }
  const normalized = message.toLowerCase();
  if (isDuplicateInboundAckMessage(normalized)) {
    return "duplicate_inbound_ack";
  }
  if (isSessionContextErrorMessage(normalized)) {
    return "session_context_invalid";
  }
  if (normalized.includes("rate limit")) {
    return "rate_limited";
  }
  if (normalized.includes("timeout")) {
    return "timeout";
  }
  return "generic_error";
}

function readStorageValue(key: string): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(key);
}

function writeStorageValue(key: string, value: string | null): void {
  if (!isBrowser()) return;
  if (value === null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
}

function emitLandingAuditStateChange(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(LANDING_AUDIT_STATE_EVENT));
}

function normalizeApiBaseUrl(apiBaseUrl?: string): string {
  const configured =
    apiBaseUrl ||
    process.env.NEXT_PUBLIC_API_ENDPOINT_URL ||
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ||
    (isBrowser() ? window.location.origin : "");
  return configured.replace(/\/+$/, "");
}

function getCampaignAttribution(): CampaignAttribution | undefined {
  if (!isBrowser()) return undefined;
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

  const hasSignal = Object.values(attribution).some(
    (value) => typeof value === "string" && value.length > 0
  );
  return hasSignal ? attribution : undefined;
}

function getNativeGuestDeviceFingerprint(): string | undefined {
  if (!isBrowser()) return undefined;
  const existing = readStorageValue(DEVICE_FINGERPRINT_KEY);
  if (existing && existing.length > 0) {
    return existing;
  }

  const created = `ngf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  writeStorageValue(DEVICE_FINGERPRINT_KEY, created);
  return created;
}

function createMessageIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `landing_ng_${crypto.randomUUID()}`;
  }
  return `landing_ng_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function createRequestCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `landing_ng_req_${crypto.randomUUID()}`;
  }
  return `landing_ng_req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function parseMessages(raw: string | null): LandingAuditMessage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LandingAuditMessage[];
  } catch {
    return [];
  }
}

export function resolveLandingAuditRuntimeConfig(): LandingAuditRuntimeConfig {
  const agentId =
    process.env.NEXT_PUBLIC_ONE_OF_ONE_AUDIT_AGENT_ID ||
    process.env.NEXT_PUBLIC_NATIVE_GUEST_AGENT_ID ||
    process.env.NEXT_PUBLIC_PLATFORM_AGENT_ID ||
    null;

  return {
    apiBaseUrl: normalizeApiBaseUrl(),
    agentId: typeof agentId === "string" && agentId.trim().length > 0 ? agentId.trim() : null,
    onboardingSurface: NATIVE_GUEST_ONBOARDING_SURFACE_ONE_OF_ONE_LANDING_AUDIT,
  };
}

async function resolveRuntimeConfigFromBootstrap(args: {
  initialConfig: LandingAuditRuntimeConfig;
}): Promise<LandingAuditRuntimeConfig | null> {
  const targets = new Set<string>();
  if (isBrowser()) {
    targets.add(window.location.origin.replace(/\/+$/, ""));
  }
  if (args.initialConfig.apiBaseUrl.length > 0) {
    targets.add(args.initialConfig.apiBaseUrl);
  }

  for (const baseUrl of targets) {
    try {
      const response = await fetch(`${baseUrl}/api/native-guest/config`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        continue;
      }

      const payload = (await response.json().catch(() => ({}))) as NativeGuestConfigResponse;
      const agentId =
        typeof payload.agentId === "string" && payload.agentId.trim().length > 0
          ? payload.agentId.trim()
          : null;
      if (!agentId) {
        continue;
      }

      const apiBaseUrl = normalizeApiBaseUrl(
        typeof payload.apiBaseUrl === "string" && payload.apiBaseUrl.trim().length > 0
          ? payload.apiBaseUrl.trim()
          : baseUrl
      );
      return {
        agentId,
        apiBaseUrl,
        onboardingSurface:
          typeof payload.onboardingSurface === "string" && payload.onboardingSurface.trim().length > 0
            ? payload.onboardingSurface.trim()
            : args.initialConfig.onboardingSurface,
      };
    } catch {
      continue;
    }
  }

  return null;
}

export function readLandingAuditState(): LandingAuditStateSnapshot {
  return {
    messages: parseMessages(readStorageValue(MESSAGES_KEY)),
    sessionToken: readStorageValue(SESSION_TOKEN_KEY),
    claimToken: readStorageValue(CLAIM_TOKEN_KEY),
  };
}

export function persistLandingAuditMessages(messages: LandingAuditMessage[]): void {
  writeStorageValue(MESSAGES_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
  emitLandingAuditStateChange();
}

export function persistLandingAuditTokens(args: {
  sessionToken?: string | null;
  claimToken?: string | null;
}): void {
  if ("sessionToken" in args) {
    const nextSession =
      typeof args.sessionToken === "string" && args.sessionToken.length > 0
        ? args.sessionToken
        : null;
    writeStorageValue(SESSION_TOKEN_KEY, nextSession);
  }

  if ("claimToken" in args) {
    const nextClaim =
      typeof args.claimToken === "string" && args.claimToken.length > 0
        ? args.claimToken
        : null;
    writeStorageValue(CLAIM_TOKEN_KEY, nextClaim);
  }

  emitLandingAuditStateChange();
}

export async function sendLandingAuditMessage(args: {
  config: LandingAuditRuntimeConfig;
  message: string;
  sessionToken?: string | null;
  language?: "en" | "de";
}): Promise<LandingAuditSendResult> {
  const trimmedMessage = args.message.trim();
  if (!trimmedMessage) {
    throw new Error("Message cannot be empty");
  }

  const normalizedSessionToken =
    typeof args.sessionToken === "string" && args.sessionToken.length > 0
      ? args.sessionToken
      : undefined;
  const debugEnabled = isLandingAuditDebugEnabled();
  const debugLog = (event: string, payload: Record<string, unknown>) => {
    if (!debugEnabled) {
      return;
    }
    console.info(`[LandingAudit][Debug] ${event}`, payload);
  };
  const sendStartedAt = Date.now();
  let attemptCount = 0;
  let retryCount = 0;

  let resolvedConfig = args.config;
  const shouldRefreshFromBootstrap = !normalizedSessionToken || !resolvedConfig.agentId;
  if (shouldRefreshFromBootstrap) {
    debugLog("bootstrap_refresh_start", {
      reason: !normalizedSessionToken ? "missing_session_token_or_agent" : "missing_agent",
      hasSessionToken: Boolean(normalizedSessionToken),
      hasConfiguredAgentId: Boolean(resolvedConfig.agentId),
    });
    const bootstrapConfig = await resolveRuntimeConfigFromBootstrap({
      initialConfig: args.config,
    });
    if (bootstrapConfig) {
      resolvedConfig = bootstrapConfig;
    }
    debugLog("bootstrap_refresh_result", {
      refreshed: Boolean(bootstrapConfig),
      hasResolvedAgentId: Boolean(resolvedConfig.agentId),
      apiBaseUrl: resolvedConfig.apiBaseUrl,
    });
  }

  if (!resolvedConfig.agentId) {
    throw new Error(
      "Audit chat is not configured. Set NEXT_PUBLIC_ONE_OF_ONE_AUDIT_AGENT_ID or NEXT_PUBLIC_NATIVE_GUEST_AGENT_ID, or expose /api/native-guest/config."
    );
  }

  const deviceFingerprint = getNativeGuestDeviceFingerprint();
  const attribution = getCampaignAttribution();
  const idempotencyKey = createMessageIdempotencyKey();
  const requestCorrelationId = createRequestCorrelationId();
  const hasAttribution = Boolean(attribution);

  const performSend = async (
    payload: NativeGuestRequestPayload,
    stage: NativeGuestAttemptStage
  ) => {
    const attemptStartedAt = Date.now();
    attemptCount += 1;
    try {
      const response = await fetch(`${resolvedConfig.apiBaseUrl}/api/v1/native-guest/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as NativeGuestMessageResponse;
      const latencyMs = Math.max(0, Date.now() - attemptStartedAt);
      debugLog("native_guest_attempt", {
        stage,
        ok: response.ok,
        httpStatus: response.status,
        latencyMs,
        requestCorrelationId,
        idempotencyKey,
        agentId: payload.agentId,
        hasSessionTokenInRequest: Boolean(payload.sessionToken),
        hasSessionTokenInResponse:
          typeof body.sessionToken === "string" && body.sessionToken.length > 0,
        errorCode: resolveNativeGuestErrorCode(body.error),
      });
      return { response, body };
    } catch (error) {
      const latencyMs = Math.max(0, Date.now() - attemptStartedAt);
      debugLog("native_guest_attempt_network_error", {
        stage,
        latencyMs,
        requestCorrelationId,
        idempotencyKey,
        agentId: payload.agentId,
        hasSessionTokenInRequest: Boolean(payload.sessionToken),
        errorType: error instanceof Error ? error.name : "unknown_error",
      });
      throw error;
    }
  };

  debugLog("send_start", {
    requestCorrelationId,
    idempotencyKey,
    agentId: resolvedConfig.agentId,
    hasSessionToken: Boolean(normalizedSessionToken),
    hasAttribution,
  });

  let { response, body: payload } = await performSend({
    agentId: resolvedConfig.agentId,
    sessionToken: normalizedSessionToken,
    onboardingSurface: resolvedConfig.onboardingSurface || undefined,
    message: trimmedMessage,
    idempotencyKey,
    requestCorrelationId,
    deviceFingerprint,
    attribution,
  }, "initial");
  if (!response.ok) {
    console.warn("[LandingAudit] native_guest send failed (initial)", {
      status: response.status,
      error: payload.error,
      agentId: resolvedConfig.agentId,
      hasSessionToken: Boolean(normalizedSessionToken),
      requestCorrelationId,
      idempotencyKey,
    });
  }

  const staleSessionError = !response.ok && isSessionContextErrorMessage(payload.error);
  if (staleSessionError && normalizedSessionToken) {
    retryCount += 1;
    persistLandingAuditTokens({ sessionToken: null, claimToken: null });
    const retryResult = await performSend({
      agentId: resolvedConfig.agentId,
      onboardingSurface: resolvedConfig.onboardingSurface || undefined,
      message: trimmedMessage,
      idempotencyKey,
      requestCorrelationId,
      deviceFingerprint,
      attribution,
    }, "retry_without_session");
    response = retryResult.response;
    payload = retryResult.body;
    if (!response.ok) {
      console.warn("[LandingAudit] native_guest send failed (retry_without_session)", {
        status: response.status,
        error: payload.error,
        agentId: resolvedConfig.agentId,
        requestCorrelationId,
        idempotencyKey,
      });
    }
  }

  // If context is still invalid (or agent routing changed), force bootstrap refresh and retry once.
  if (!response.ok && isSessionContextErrorMessage(payload.error)) {
    debugLog("bootstrap_refresh_before_retry", {
      requestCorrelationId,
      idempotencyKey,
      priorErrorCode: resolveNativeGuestErrorCode(payload.error),
    });
    const refreshedConfig = await resolveRuntimeConfigFromBootstrap({
      initialConfig: resolvedConfig,
    });
    const refreshedAgentId = refreshedConfig?.agentId;
    if (refreshedConfig && refreshedAgentId) {
      resolvedConfig = {
        ...refreshedConfig,
        agentId: refreshedAgentId,
      };
      persistLandingAuditTokens({ sessionToken: null, claimToken: null });
      retryCount += 1;
      const retryResult = await performSend({
        agentId: refreshedAgentId,
        onboardingSurface: resolvedConfig.onboardingSurface || undefined,
        message: trimmedMessage,
        idempotencyKey,
        requestCorrelationId,
        deviceFingerprint,
        attribution,
      }, "retry_with_refreshed_agent");
      response = retryResult.response;
      payload = retryResult.body;
      if (!response.ok) {
        console.warn("[LandingAudit] native_guest send failed (retry_with_refreshed_agent)", {
          status: response.status,
          error: payload.error,
          agentId: refreshedAgentId,
          requestCorrelationId,
          idempotencyKey,
        });
      }
    }
  }

  if (!response.ok) {
    if (isDuplicateInboundAckMessage(payload.error)) {
      const duplicateAckMessage = args.language === "de"
        ? "Nachricht erhalten. Wir machen mit Ihrem letzten Schritt weiter."
        : "Message received. Continuing from your latest step.";
      const duplicateSessionToken =
        typeof payload.sessionToken === "string" && payload.sessionToken.length > 0
          ? payload.sessionToken
          : args.sessionToken || null;
      const duplicateClaimToken =
        typeof payload.claimToken === "string" && payload.claimToken.length > 0
          ? payload.claimToken
          : null;
      debugLog("send_complete_duplicate_ack", {
        requestCorrelationId,
        idempotencyKey,
        attemptCount,
        retryCount,
        httpStatus: response.status,
        totalLatencyMs: Math.max(0, Date.now() - sendStartedAt),
        sessionTokenChanged: duplicateSessionToken !== (args.sessionToken || null),
        hasSessionTokenBefore: Boolean(normalizedSessionToken),
        hasSessionTokenAfter: Boolean(duplicateSessionToken),
        hasClaimTokenAfter: Boolean(duplicateClaimToken),
      });
      return {
        assistantMessage: duplicateAckMessage,
        sessionToken: duplicateSessionToken,
        claimToken: duplicateClaimToken,
      };
    }
    const detail = payload.error || "Failed to send audit message";
    debugLog("send_failed", {
      requestCorrelationId,
      idempotencyKey,
      attemptCount,
      retryCount,
      httpStatus: response.status,
      totalLatencyMs: Math.max(0, Date.now() - sendStartedAt),
      errorCode: resolveNativeGuestErrorCode(payload.error),
    });
    throw new Error(resolveFriendlyNativeGuestErrorMessage({
      status: response.status,
      detail,
    }));
  }

  const assistantMessage =
    (typeof payload.response === "string" && payload.response.trim()) ||
    (typeof payload.message === "string" && payload.message.trim()) ||
    "Message received.";
  const finalSessionToken =
    typeof payload.sessionToken === "string" && payload.sessionToken.length > 0
      ? payload.sessionToken
      : args.sessionToken || null;
  const finalClaimToken =
    typeof payload.claimToken === "string" && payload.claimToken.length > 0
      ? payload.claimToken
      : null;

  debugLog("send_complete_success", {
    requestCorrelationId,
    idempotencyKey,
    attemptCount,
    retryCount,
    httpStatus: response.status,
    totalLatencyMs: Math.max(0, Date.now() - sendStartedAt),
    sessionTokenChanged: finalSessionToken !== (args.sessionToken || null),
    hasSessionTokenBefore: Boolean(normalizedSessionToken),
    hasSessionTokenAfter: Boolean(finalSessionToken),
    hasClaimTokenAfter: Boolean(finalClaimToken),
  });

  return {
    assistantMessage,
    sessionToken: finalSessionToken,
    claimToken: finalClaimToken,
  };
}
