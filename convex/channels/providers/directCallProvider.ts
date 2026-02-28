/**
 * DIRECT OUTBOUND TELEPHONY PROVIDER
 *
 * Generic HTTP adapter for appointment outbound calling.
 * Designed as an additive provider that can be bound per organization via
 * `direct_settings` in the objects table.
 */

import type {
  ChannelProvider,
  ChannelProviderCapabilities,
  ProviderCredentials,
  NormalizedInboundMessage,
  OutboundMessage,
  SendResult,
} from "../types";

const capabilities: ChannelProviderCapabilities = {
  supportedChannels: ["phone_call"],
  supportsInbound: true,
  supportsOutbound: true,
  supportsWebhooks: true,
  supportsAttachments: false,
  supportsTemplates: false,
  supportsConversationThreading: false,
};

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function extractObject(
  value: unknown
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

async function safeReadJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const payload = (await response.json()) as unknown;
    return extractObject(payload);
  } catch {
    return null;
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function resolveBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function buildRetryableHttpFailure(response: Response, errorText: string): SendResult {
  const sanitizedError =
    errorText.trim().length > 0
      ? errorText.trim().slice(0, 400)
      : `Direct call provider HTTP ${response.status}`;
  return {
    success: false,
    error: sanitizedError,
    statusCode: response.status,
    retryable: response.status === 429 || response.status >= 500,
  };
}

export const directCallProvider: ChannelProvider = {
  id: "direct",
  name: "Direct Telephony",
  capabilities,

  normalizeInbound(
    rawPayload: Record<string, unknown>,
    _credentials: ProviderCredentials
  ): NormalizedInboundMessage | null {
    const callId =
      normalizeOptionalString(rawPayload.callId) ||
      normalizeOptionalString(rawPayload.providerCallId) ||
      normalizeOptionalString(rawPayload.id);
    const to =
      normalizeOptionalString(rawPayload.to) ||
      normalizeOptionalString(rawPayload.recipient) ||
      normalizeOptionalString(rawPayload.phoneNumber);
    const transcriptText =
      normalizeOptionalString(rawPayload.transcriptText) ||
      normalizeOptionalString(rawPayload.transcript);

    if (!to || !callId || !transcriptText) {
      return null;
    }

    return {
      organizationId: "",
      channel: "phone_call",
      externalContactIdentifier: to,
      message: transcriptText,
      messageType: "text",
      metadata: {
        providerId: "direct",
        providerMessageId: callId,
        providerEventId: normalizeOptionalString(rawPayload.eventId),
        raw: rawPayload,
      },
    };
  },

  async sendMessage(
    credentials: ProviderCredentials,
    message: OutboundMessage
  ): Promise<SendResult> {
    const baseUrl = normalizeOptionalString(credentials.directCallBaseUrl);
    const apiKey = normalizeOptionalString(credentials.directCallApiKey);

    if (!baseUrl || !apiKey) {
      return {
        success: false,
        error: "Direct telephony provider credentials are incomplete",
        retryable: false,
      };
    }

    const endpoint = `${baseUrl.replace(/\/$/, "")}/calls/outbound`;
    const metadata = (message.metadata || {}) as Record<string, unknown>;
    const idempotencyKey = normalizeOptionalString(metadata.idempotencyKey);

    const payload: Record<string, unknown> = {
      to: message.recipientIdentifier,
      from: normalizeOptionalString(credentials.directCallFromNumber),
      script: message.content,
      metadata: {
        ...metadata,
      },
    };

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await safeReadJson(response);
      if (!response.ok) {
        const text = await safeReadText(response);
        const fromBody =
          normalizeOptionalString(json?.error) ||
          normalizeOptionalString(json?.message);
        return buildRetryableHttpFailure(response, fromBody ?? text);
      }

      const providerCallId =
        normalizeOptionalString(json?.callId) ||
        normalizeOptionalString(json?.providerCallId) ||
        normalizeOptionalString(json?.id);
      const outcome =
        normalizeOptionalString(json?.outcome) ||
        normalizeOptionalString(json?.status) ||
        "queued";

      if (!providerCallId) {
        return {
          success: false,
          error: "Direct telephony response missing call identifier",
          retryable: true,
        };
      }

      return {
        success: true,
        providerMessageId: providerCallId,
        telephony: {
          providerCallId,
          outcome,
          voicemailDetected: resolveBoolean(json?.voicemailDetected),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryable: true,
      };
    }
  },

  verifyWebhook(
    _body: string,
    headers: Record<string, string>,
    credentials: ProviderCredentials
  ): boolean {
    const expectedSecret =
      normalizeOptionalString(credentials.directCallWebhookSecret) ||
      normalizeOptionalString(process.env.DIRECT_CALL_WEBHOOK_SECRET);
    if (!expectedSecret) {
      return false;
    }

    const presented =
      normalizeOptionalString(headers["x-direct-call-secret"]) ||
      normalizeOptionalString(headers["x-telephony-webhook-secret"]) ||
      normalizeOptionalString(headers.authorization)?.replace(/^Bearer\s+/i, "");
    return presented === expectedSecret;
  },

  async testConnection(
    credentials: ProviderCredentials
  ): Promise<{ success: boolean; accountName?: string; error?: string }> {
    const baseUrl = normalizeOptionalString(credentials.directCallBaseUrl);
    const apiKey = normalizeOptionalString(credentials.directCallApiKey);

    if (!baseUrl || !apiKey) {
      return {
        success: false,
        error: "Direct telephony provider credentials are incomplete",
      };
    }

    const endpoint = `${baseUrl.replace(/\/$/, "")}/health`;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        accountName: "Direct Telephony",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

