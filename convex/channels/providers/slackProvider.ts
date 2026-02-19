/**
 * SLACK CHANNEL PROVIDER
 *
 * Slack provider implementation for channel runtime parity.
 */

import type {
  ChannelProvider,
  ChannelProviderCapabilities,
  ProviderCredentials,
  NormalizedInboundMessage,
  OutboundMessage,
  SendResult,
} from "../types";

const SLACK_SIGNATURE_VERSION = "v0";
const SLACK_REPLAY_WINDOW_SECONDS = 60 * 5;
const SLACK_API_BASE = "https://slack.com/api";
const SLACK_TS_PATTERN = /^\d{10}\.\d+$/;

const capabilities: ChannelProviderCapabilities = {
  supportedChannels: ["slack"],
  supportsInbound: true,
  supportsOutbound: true,
  supportsWebhooks: true,
  supportsAttachments: true,
  supportsTemplates: false,
  supportsConversationThreading: true,
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function buildSignatureBaseString(body: string, timestamp: number): string {
  return `${SLACK_SIGNATURE_VERSION}:${timestamp}:${body}`;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function computeSlackSignature(
  signingSecret: string,
  body: string,
  timestamp: number
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(buildSignatureBaseString(body, timestamp))
  );
  return `${SLACK_SIGNATURE_VERSION}=${toHex(new Uint8Array(signatureBuffer))}`;
}

export function buildSlackConversationIdentifier(
  channelId: string,
  threadTs: string
): string {
  return `slack:${channelId}:${threadTs}`;
}

export function buildSlackTopLevelConversationIdentifier(
  channelId: string,
  senderId?: string
): string {
  const normalizedChannelId = channelId.trim();
  const normalizedSenderId = senderId?.trim();
  if (!normalizedSenderId) {
    return `slack:${normalizedChannelId}`;
  }
  return `slack:${normalizedChannelId}:user:${normalizedSenderId}`;
}

export function parseSlackConversationIdentifier(recipientIdentifier: string): {
  channelId: string;
  defaultThreadTs?: string;
} | null {
  const normalized = recipientIdentifier.trim();
  if (!normalized) return null;

  if (normalized.startsWith("slack:")) {
    const segments = normalized.split(":");
    const channelId = segments[1];
    if (channelId) {
      const threadCandidate = segments[2];
      const defaultThreadTs =
        threadCandidate && SLACK_TS_PATTERN.test(threadCandidate)
          ? threadCandidate
          : undefined;
      return {
        channelId,
        defaultThreadTs,
      };
    }
  }

  // Fallback for direct channel IDs (e.g. C123ABC, D456XYZ).
  if (/^[CDG][A-Z0-9]+$/i.test(normalized)) {
    return { channelId: normalized };
  }

  return null;
}

export async function verifySlackRequestSignature(args: {
  body: string;
  signatureHeader?: string | null;
  timestampHeader?: string | null;
  signingSecret?: string;
  signingSecrets?: string[];
  nowMs?: number;
  replayWindowSeconds?: number;
}): Promise<{
  valid: boolean;
  reason?: string;
  timestampSeconds?: number;
}> {
  const signingSecrets = Array.from(
    new Set(
      [
        args.signingSecret,
        ...(args.signingSecrets || []),
      ]
        .map((secret) => secret?.trim())
        .filter((secret): secret is string => Boolean(secret))
    )
  );
  if (signingSecrets.length === 0) {
    return { valid: false, reason: "missing_signing_secret" };
  }

  const signature = asString(args.signatureHeader);
  const timestampRaw = asString(args.timestampHeader);
  if (!signature || !timestampRaw) {
    return { valid: false, reason: "missing_signature_headers" };
  }

  const timestampSeconds = Number.parseInt(timestampRaw, 10);
  if (!Number.isFinite(timestampSeconds)) {
    return { valid: false, reason: "invalid_signature_timestamp" };
  }

  const nowSeconds = Math.floor((args.nowMs ?? Date.now()) / 1000);
  const replayWindow = args.replayWindowSeconds ?? SLACK_REPLAY_WINDOW_SECONDS;
  if (Math.abs(nowSeconds - timestampSeconds) > replayWindow) {
    return {
      valid: false,
      reason: "stale_signature_timestamp",
      timestampSeconds,
    };
  }

  for (const signingSecret of signingSecrets) {
    const expectedSignature = await computeSlackSignature(
      signingSecret,
      args.body,
      timestampSeconds
    );
    if (timingSafeEqual(expectedSignature, signature)) {
      return { valid: true, timestampSeconds };
    }
  }

  return {
    valid: false,
    reason: "signature_mismatch",
    timestampSeconds,
  };
}

function normalizeSlackMessageText(
  text: string | undefined,
  eventType: string | undefined
): string | undefined {
  const base = text?.trim();
  if (!base) return undefined;

  if (eventType === "app_mention") {
    const mentionStripped = base.replace(/<@[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return mentionStripped || base;
  }

  return base;
}

function parseSlackInboundPayload(
  rawPayload: Record<string, unknown>,
  credentials: ProviderCredentials
): NormalizedInboundMessage | null {
  if (rawPayload.type !== "event_callback") return null;

  const event = rawPayload.event as Record<string, unknown> | undefined;
  if (!event) return null;

  const eventType = asString(event.type);
  if (eventType !== "app_mention" && eventType !== "message") {
    return null;
  }

  const subtype = asString(event.subtype);
  if (subtype && subtype !== "thread_broadcast") {
    return null;
  }

  // Ignore bot-originated events to prevent feedback loops.
  if (asString(event.bot_id)) {
    return null;
  }

  const channelId = asString(event.channel);
  const eventTs = asString(event.ts);
  const explicitThreadTs = asString(event.thread_ts);
  const threadTs =
    explicitThreadTs && SLACK_TS_PATTERN.test(explicitThreadTs)
      ? explicitThreadTs
      : undefined;
  const senderId = asString(event.user);
  const text = normalizeSlackMessageText(asString(event.text), eventType);

  if (!channelId || !eventTs || !senderId || !text) {
    return null;
  }

  if (credentials.slackBotUserId && senderId === credentials.slackBotUserId) {
    return null;
  }

  const externalContactIdentifier = threadTs
    ? buildSlackConversationIdentifier(channelId, threadTs)
    : buildSlackTopLevelConversationIdentifier(channelId, senderId);

  return {
    organizationId: "",
    channel: "slack",
    externalContactIdentifier,
    message: text,
    messageType: "text",
    metadata: {
      providerId: "slack",
      providerMessageId: asString(event.client_msg_id) || eventTs,
      providerEventId: asString(rawPayload.event_id),
      providerConversationId: threadTs,
      senderName: senderId,
      slackResponseMode: threadTs ? "thread" : "top_level",
      slackInvocationType: eventType === "app_mention" ? "mention" : "message",
      slackChannelId: channelId,
      slackUserId: senderId,
      raw: rawPayload,
    },
  };
}

export const slackProvider: ChannelProvider = {
  id: "slack",
  name: "Slack",
  capabilities,

  normalizeInbound(
    rawPayload: Record<string, unknown>,
    credentials: ProviderCredentials
  ): NormalizedInboundMessage | null {
    return parseSlackInboundPayload(rawPayload, credentials);
  },

  async sendMessage(
    credentials: ProviderCredentials,
    message: OutboundMessage
  ): Promise<SendResult> {
    const token = credentials.slackBotToken;
    if (!token) {
      return {
        success: false,
        error: "Slack bot token not configured",
        retryable: false,
      };
    }

    const destination = parseSlackConversationIdentifier(
      message.recipientIdentifier
    );
    if (!destination) {
      return {
        success: false,
        error: "Invalid Slack recipient identifier",
        retryable: false,
      };
    }

    const threadTs =
      message.metadata?.providerConversationId || destination.defaultThreadTs;
    const payload: Record<string, unknown> = {
      channel: destination.channelId,
      text: message.content,
    };
    if (threadTs) {
      payload.thread_ts = threadTs;
    }

    try {
      const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const responseJson = (await response
        .json()
        .catch(() => ({}))) as Record<string, unknown>;
      const retryAfterRaw = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterRaw
        ? Number.parseInt(retryAfterRaw, 10)
        : Number.NaN;
      const retryAfterMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : undefined;

      const slackOk = responseJson.ok === true;
      const slackError = asString(responseJson.error);
      const normalizedStatus =
        response.status === 200 && slackError === "ratelimited"
          ? 429
          : response.status;

      if (!response.ok || !slackOk) {
        const retryableErrorCodes = new Set([
          "ratelimited",
          "internal_error",
          "fatal_error",
          "request_timeout",
          "service_unavailable",
        ]);
        return {
          success: false,
          error: slackError || `Slack API ${normalizedStatus}`,
          retryable:
            normalizedStatus === 429 ||
            normalizedStatus >= 500 ||
            (slackError ? retryableErrorCodes.has(slackError) : false),
          statusCode: normalizedStatus,
          retryAfterMs,
        };
      }

      return {
        success: true,
        providerMessageId:
          asString(responseJson.ts) || asString(responseJson.message_ts),
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        retryable: true,
      };
    }
  },

  verifyWebhook(
    _body: string,
    headers: Record<string, string>,
    credentials: ProviderCredentials
  ): boolean {
    // Full signature validation is done at the HTTP boundary with raw body.
    // Keep lightweight guardrails here so provider contract remains coherent.
    if (!credentials.slackSigningSecret) return false;
    return Boolean(
      asString(headers["x-slack-signature"]) &&
      asString(headers["x-slack-request-timestamp"])
    );
  },

  async testConnection(
    credentials: ProviderCredentials
  ): Promise<{ success: boolean; accountName?: string; error?: string }> {
    const token = credentials.slackBotToken;
    if (!token) {
      return { success: false, error: "Missing Slack bot token" };
    }

    try {
      const response = await fetch(`${SLACK_API_BASE}/auth.test`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await response
        .json()
        .catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok || data.ok !== true) {
        return {
          success: false,
          error: asString(data.error) || `Slack API ${response.status}`,
        };
      }

      const team = asString(data.team);
      return {
        success: true,
        accountName: team || credentials.slackTeamId,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};
