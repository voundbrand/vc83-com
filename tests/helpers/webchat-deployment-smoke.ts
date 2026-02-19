import {
  generateWebchatDeploymentSnippets,
  type WebchatDeploymentSnippets,
  type WebchatSnippetBootstrapContract,
} from "@/components/chat-widget/deploymentSnippets";
import type { PublicInboundChannel } from "../../convex/webchatCustomizationContractCore";

export interface WebchatDeploymentSmokeOptions {
  appBaseUrl: string;
  agentId: string;
  channel?: PublicInboundChannel;
  message?: string;
  organizationIdHint?: string;
  visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  fetchImpl?: typeof fetch;
}

export interface WebchatDeploymentSmokeResult {
  channel: PublicInboundChannel;
  bootstrap: WebchatSnippetBootstrapContract;
  snippets: WebchatDeploymentSnippets;
  copiedSnippet: string;
  config: Record<string, unknown>;
  message: {
    sessionToken: string;
    response?: string;
    agentName?: string;
    claimToken?: string | null;
  };
}

function normalizeChannel(channel?: PublicInboundChannel): PublicInboundChannel {
  return channel === "native_guest" ? "native_guest" : "webchat";
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("appBaseUrl is required for webchat deployment smoke checks");
  }
  return trimmed.replace(/\/+$/, "");
}

async function parseJsonOrThrow(response: Response, label: string): Promise<unknown> {
  const text = await response.text();
  if (text.trim().length === 0) {
    if (response.ok) {
      return {};
    }
    throw new Error(`[${label}] ${response.status}: empty response body`);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`[${label}] ${response.status}: non-JSON response body`);
  }
}

function ensureRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label} payload: expected object`);
  }
  return value as Record<string, unknown>;
}

function ensureStringField(payload: Record<string, unknown>, key: string, label: string): string {
  const value = payload[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required ${label} field: ${key}`);
  }
  return value;
}

function ensureBootstrapPayload(
  payload: unknown,
  requestedAgentId: string,
  channel: PublicInboundChannel
): WebchatSnippetBootstrapContract {
  const record = ensureRecord(payload, "bootstrap");
  const resolvedAgentId = ensureStringField(record, "agentId", "bootstrap");
  if (resolvedAgentId !== requestedAgentId) {
    throw new Error(
      `Bootstrap agent mismatch: expected ${requestedAgentId} but got ${resolvedAgentId}`
    );
  }

  const resolvedChannel = ensureStringField(record, "channel", "bootstrap");
  if (resolvedChannel !== channel) {
    throw new Error(`Bootstrap channel mismatch: expected ${channel} but got ${resolvedChannel}`);
  }

  return record as unknown as WebchatSnippetBootstrapContract;
}

function ensureConfigPayload(
  payload: unknown,
  requestedAgentId: string,
  channel: PublicInboundChannel
): Record<string, unknown> {
  const record = ensureRecord(payload, "config");
  const resolvedAgentId = ensureStringField(record, "agentId", "config");
  if (resolvedAgentId !== requestedAgentId) {
    throw new Error(`Config agent mismatch: expected ${requestedAgentId} but got ${resolvedAgentId}`);
  }

  const resolvedChannel = ensureStringField(record, "channel", "config");
  if (resolvedChannel !== channel) {
    throw new Error(`Config channel mismatch: expected ${channel} but got ${resolvedChannel}`);
  }

  return record;
}

function ensureMessagePayload(payload: unknown): {
  sessionToken: string;
  response?: string;
  agentName?: string;
  claimToken?: string | null;
} {
  const record = ensureRecord(payload, "message");
  const sessionToken = ensureStringField(record, "sessionToken", "message");
  const response = record.response;
  const agentName = record.agentName;
  const claimToken = record.claimToken;

  return {
    sessionToken,
    ...(typeof response === "string" ? { response } : {}),
    ...(typeof agentName === "string" ? { agentName } : {}),
    ...(typeof claimToken === "string" || claimToken === null ? { claimToken } : {}),
  };
}

function messageEndpointForChannel(channel: PublicInboundChannel): string {
  return channel === "native_guest" ? "/api/v1/native-guest/message" : "/api/v1/webchat/message";
}

export async function runWebchatDeploymentSmoke(
  options: WebchatDeploymentSmokeOptions
): Promise<WebchatDeploymentSmokeResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required for smoke checks");
  }

  const baseUrl = normalizeBaseUrl(options.appBaseUrl);
  const requestedAgentId = options.agentId.trim();
  if (requestedAgentId.length === 0) {
    throw new Error("agentId is required for webchat deployment smoke checks");
  }

  const channel = normalizeChannel(options.channel);
  const message = options.message?.trim() || "Smoke check ping";

  const bootstrapUrl = `${baseUrl}/api/v1/webchat/bootstrap/${encodeURIComponent(
    requestedAgentId
  )}?channel=${channel}`;
  const bootstrapResponse = await fetchImpl(bootstrapUrl, { method: "GET" });
  const bootstrapPayload = await parseJsonOrThrow(bootstrapResponse, "bootstrap");
  if (!bootstrapResponse.ok) {
    throw new Error(`[bootstrap] ${bootstrapResponse.status}: ${JSON.stringify(bootstrapPayload)}`);
  }
  const bootstrap = ensureBootstrapPayload(bootstrapPayload, requestedAgentId, channel);

  const snippets = generateWebchatDeploymentSnippets(bootstrap, {
    appBaseUrl: baseUrl,
  });
  const copiedSnippet = snippets.script;
  if (!copiedSnippet.includes("data-agent-id")) {
    throw new Error("Snippet copy check failed: script snippet missing data-agent-id");
  }

  const configUrl = `${baseUrl}/api/v1/webchat/config/${encodeURIComponent(
    requestedAgentId
  )}?channel=${channel}`;
  const configResponse = await fetchImpl(configUrl, { method: "GET" });
  const configPayload = await parseJsonOrThrow(configResponse, "config");
  if (!configResponse.ok) {
    throw new Error(`[config] ${configResponse.status}: ${JSON.stringify(configPayload)}`);
  }
  const config = ensureConfigPayload(configPayload, requestedAgentId, channel);

  const messageUrl = `${baseUrl}${messageEndpointForChannel(channel)}`;
  const messageBody = {
    agentId: requestedAgentId,
    message,
    ...(typeof options.organizationIdHint === "string" && options.organizationIdHint.trim().length > 0
      ? { organizationId: options.organizationIdHint.trim() }
      : {}),
    ...(options.visitorInfo ? { visitorInfo: options.visitorInfo } : {}),
  };
  const messageResponse = await fetchImpl(messageUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messageBody),
  });
  const messagePayload = await parseJsonOrThrow(messageResponse, "message");
  if (!messageResponse.ok) {
    throw new Error(`[message] ${messageResponse.status}: ${JSON.stringify(messagePayload)}`);
  }
  const messageResult = ensureMessagePayload(messagePayload);

  return {
    channel,
    bootstrap,
    snippets,
    copiedSnippet,
    config,
    message: messageResult,
  };
}
