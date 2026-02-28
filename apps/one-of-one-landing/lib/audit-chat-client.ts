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
}

interface NativeGuestConfigResponse {
  agentId?: string;
  apiBaseUrl?: string;
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
  deviceFingerprint?: string;
  attribution?: CampaignAttribution;
}

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
    normalized.includes("session token channel mismatch")
  );
}

const STORAGE_PREFIX = "l4yercak3_native_guest_";
const SESSION_TOKEN_KEY = `${STORAGE_PREFIX}session_token`;
const CLAIM_TOKEN_KEY = `${STORAGE_PREFIX}claim_token`;
const MESSAGES_KEY = `${STORAGE_PREFIX}messages`;
const DEVICE_FINGERPRINT_KEY = `${STORAGE_PREFIX}device_fingerprint`;
const MAX_STORED_MESSAGES = 80;
export const LANDING_AUDIT_STATE_EVENT = "ooo-native-guest-state";

function isBrowser(): boolean {
  return typeof window !== "undefined";
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
      return { agentId, apiBaseUrl };
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
}): Promise<LandingAuditSendResult> {
  const trimmedMessage = args.message.trim();
  if (!trimmedMessage) {
    throw new Error("Message cannot be empty");
  }

  let resolvedConfig = args.config;
  if (!resolvedConfig.agentId) {
    const bootstrapConfig = await resolveRuntimeConfigFromBootstrap({
      initialConfig: args.config,
    });
    if (bootstrapConfig) {
      resolvedConfig = bootstrapConfig;
    }
  }

  if (!resolvedConfig.agentId) {
    throw new Error(
      "Audit chat is not configured. Set NEXT_PUBLIC_ONE_OF_ONE_AUDIT_AGENT_ID or NEXT_PUBLIC_NATIVE_GUEST_AGENT_ID, or expose /api/native-guest/config."
    );
  }

  const performSend = async (payload: NativeGuestRequestPayload) => {
    const response = await fetch(`${resolvedConfig.apiBaseUrl}/api/v1/native-guest/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as NativeGuestMessageResponse;
    return { response, body };
  };

  const normalizedSessionToken =
    typeof args.sessionToken === "string" && args.sessionToken.length > 0
      ? args.sessionToken
      : undefined;
  const deviceFingerprint = getNativeGuestDeviceFingerprint();
  const attribution = getCampaignAttribution();

  let { response, body: payload } = await performSend({
    agentId: resolvedConfig.agentId,
    sessionToken: normalizedSessionToken,
    message: trimmedMessage,
    deviceFingerprint,
    attribution,
  });

  const staleSessionError = !response.ok && isSessionContextErrorMessage(payload.error);
  if (staleSessionError && normalizedSessionToken) {
    persistLandingAuditTokens({ sessionToken: null, claimToken: null });
    const retryResult = await performSend({
      agentId: resolvedConfig.agentId,
      message: trimmedMessage,
      deviceFingerprint,
      attribution,
    });
    response = retryResult.response;
    payload = retryResult.body;
  }

  // If context is still invalid (or agent routing changed), force bootstrap refresh and retry once.
  if (!response.ok && isSessionContextErrorMessage(payload.error)) {
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
      const retryResult = await performSend({
        agentId: refreshedAgentId,
        message: trimmedMessage,
        deviceFingerprint,
        attribution,
      });
      response = retryResult.response;
      payload = retryResult.body;
    }
  }

  if (!response.ok) {
    const detail = payload.error || "Failed to send audit message";
    throw new Error(`${detail} (HTTP ${response.status})`);
  }

  const assistantMessage =
    (typeof payload.response === "string" && payload.response.trim()) ||
    (typeof payload.message === "string" && payload.message.trim()) ||
    "Message received.";

  return {
    assistantMessage,
    sessionToken:
      typeof payload.sessionToken === "string" && payload.sessionToken.length > 0
        ? payload.sessionToken
        : args.sessionToken || null,
    claimToken:
      typeof payload.claimToken === "string" && payload.claimToken.length > 0
        ? payload.claimToken
        : null,
  };
}
