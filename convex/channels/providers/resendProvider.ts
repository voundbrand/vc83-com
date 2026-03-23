/**
 * RESEND CHANNEL PROVIDER
 *
 * Minimal outbound email provider for org-scoped channel routing.
 */

import type {
  ChannelProvider,
  ChannelProviderCapabilities,
  ProviderCredentials,
  NormalizedInboundMessage,
  OutboundMessage,
  SendResult,
} from "../types";

const RESEND_API_BASE_URL = "https://api.resend.com";

const capabilities: ChannelProviderCapabilities = {
  supportedChannels: ["email"],
  supportsInbound: false,
  supportsOutbound: true,
  supportsWebhooks: false,
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderPlainTextAsHtml(text: string): string {
  return `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;">${escapeHtml(text)}</div>`;
}

function resolveSenderEmail(credentials: ProviderCredentials): string | undefined {
  const raw = credentials as ProviderCredentials & {
    senderEmail?: string;
  };
  return (
    normalizeOptionalString(credentials.resendSenderEmail) ||
    normalizeOptionalString(raw.senderEmail)
  );
}

function resolveReplyToEmail(credentials: ProviderCredentials): string | undefined {
  const raw = credentials as ProviderCredentials & {
    replyToEmail?: string;
  };
  return (
    normalizeOptionalString(credentials.resendReplyToEmail) ||
    normalizeOptionalString(raw.replyToEmail)
  );
}

export const resendProvider: ChannelProvider = {
  id: "resend",
  name: "Resend",
  capabilities,

  normalizeInbound(
    _rawPayload: Record<string, unknown>,
    _credentials: ProviderCredentials,
  ): NormalizedInboundMessage | null {
    return null;
  },

  async sendMessage(
    credentials: ProviderCredentials,
    message: OutboundMessage,
  ): Promise<SendResult> {
    const apiKey = normalizeOptionalString(credentials.resendApiKey);
    const from = resolveSenderEmail(credentials);

    if (!apiKey || !from) {
      return {
        success: false,
        error: "Resend credentials incomplete",
      };
    }

    if (message.channel !== "email") {
      return {
        success: false,
        error: `Resend does not support channel: ${message.channel}`,
      };
    }

    const subject =
      normalizeOptionalString(message.subject) || "Notification";
    const text = message.content;
    const html =
      normalizeOptionalString(message.contentHtml) || renderPlainTextAsHtml(text);
    const replyTo = resolveReplyToEmail(credentials);

    try {
      const response = await fetch(`${RESEND_API_BASE_URL}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(message.metadata?.idempotencyKey
            ? { "Idempotency-Key": message.metadata.idempotencyKey }
            : {}),
        },
        body: JSON.stringify({
          from,
          to: [message.recipientIdentifier],
          subject,
          html,
          text,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          success: false,
          error:
            payload && typeof payload === "object"
              ? `Resend API ${response.status}: ${JSON.stringify(payload)}`
              : `Resend API ${response.status}`,
          retryable: response.status >= 500 || response.status === 429,
          statusCode: response.status,
        };
      }

      return {
        success: true,
        providerMessageId:
          payload && typeof payload === "object"
            ? normalizeOptionalString((payload as Record<string, unknown>).id)
            : undefined,
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
    _headers: Record<string, string>,
    _credentials: ProviderCredentials,
  ): boolean {
    return false;
  },

  async testConnection(credentials: ProviderCredentials): Promise<{
    success: boolean;
    accountName?: string;
    error?: string;
  }> {
    const apiKey = normalizeOptionalString(credentials.resendApiKey);
    if (!apiKey) {
      return {
        success: false,
        error: "Missing Resend API key",
      };
    }

    try {
      const response = await fetch(`${RESEND_API_BASE_URL}/domains`, {
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
        accountName: "Resend",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
