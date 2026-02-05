/**
 * INFOBIP SMS CHANNEL PROVIDER
 *
 * Direct Infobip API integration for outbound SMS.
 * Each org connects their own Infobip account via API key.
 * Credentials are stored in objects table as type="infobip_settings".
 *
 * Supports:
 * - Inbound: Not yet (Phase 2)
 * - Outbound: Send SMS via Infobip SMS API v3
 * - Webhook verification: Not yet (Phase 2)
 *
 * Infobip API Reference: https://www.infobip.com/docs/api
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
  supportedChannels: ["sms"],
  supportsInbound: true,
  supportsOutbound: true,
  supportsWebhooks: true,
  supportsAttachments: false,
  supportsTemplates: false,
  supportsConversationThreading: false,
};

/**
 * Convert a phone number to E.164 format.
 * - Strip all non-digit characters except leading +
 * - If starts with 0 and no country code, prefix with +49 (Germany default for DACH market)
 * - If starts with digit but not 0 or +, prefix with +
 * - Return as-is if already has +
 */
function toE164(phone: string): string {
  // Preserve leading + if present
  const hasPlus = phone.startsWith("+");
  // Strip all non-digit characters
  const digits = phone.replace(/[^\d]/g, "");

  if (!digits) return phone;

  if (hasPlus) {
    // Already in international format
    return `+${digits}`;
  }

  if (digits.startsWith("0")) {
    // Local number — assume Germany (+49), strip leading 0
    return `+49${digits.substring(1)}`;
  }

  // Starts with a digit but no leading 0 or + — assume missing +
  return `+${digits}`;
}

export const infobipProvider: ChannelProvider = {
  id: "infobip",
  name: "Infobip SMS",
  capabilities,

  /**
   * Normalize Infobip inbound SMS (MO_JSON_2 format) or delivery report.
   *
   * Inbound payload: { results: [{ from, to, text, messageId, receivedAt, ... }], messageCount }
   * Delivery report:  { results: [{ messageId, to, status: { groupId, groupName }, ... }] }
   *
   * We only normalize actual inbound messages (those with `text`).
   * Delivery reports are handled separately by the webhook processor.
   */
  normalizeInbound(
    rawPayload: Record<string, unknown>,
    _credentials: ProviderCredentials
  ): NormalizedInboundMessage | null {
    const results = rawPayload.results as Array<Record<string, unknown>> | undefined;
    if (!results?.length) return null;

    const msg = results[0];

    // Must have `text` to be an inbound message (delivery reports have `status` but no `text`)
    const text = msg.text as string | undefined;
    if (!text) return null;

    const from = msg.from as string | undefined;
    if (!from) return null;

    return {
      organizationId: "", // Resolved by webhook handler via sender ID lookup
      channel: "sms",
      externalContactIdentifier: from,
      message: text,
      messageType: "text",
      metadata: {
        providerId: "infobip",
        providerMessageId: (msg.messageId as string) || undefined,
        raw: rawPayload,
      },
    };
  },

  async sendMessage(
    credentials: ProviderCredentials,
    message: OutboundMessage
  ): Promise<SendResult> {
    const { infobipApiKey, infobipBaseUrl, infobipSmsSenderId } = credentials;
    if (!infobipApiKey || !infobipBaseUrl || !infobipSmsSenderId) {
      return { success: false, error: "Infobip credentials incomplete" };
    }

    const { infobipApplicationId, infobipEntityId } = credentials;

    const messagePayload: Record<string, unknown> = {
      destinations: [{ to: toE164(message.recipientIdentifier) }],
      from: infobipSmsSenderId,
      text: message.content,
    };

    // Include CPaaS X identifiers when available (multi-tenant isolation)
    if (infobipApplicationId) {
      messagePayload.applicationId = infobipApplicationId;
    }
    if (infobipEntityId) {
      messagePayload.entityId = infobipEntityId;
    }

    const payload = {
      messages: [messagePayload],
    };

    try {
      const response = await fetch(`${infobipBaseUrl}/sms/3/messages`, {
        method: "POST",
        headers: {
          Authorization: `App ${infobipApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        return {
          success: false,
          error: `Infobip API ${response.status}: ${errText.substring(0, 200)}`,
          retryable: response.status >= 500,
        };
      }

      const data = (await response.json()) as {
        messages?: Array<{
          messageId?: string;
          status?: { groupId?: number; description?: string };
        }>;
      };

      const firstMessage = data.messages?.[0];
      const groupId = firstMessage?.status?.groupId;

      if (groupId === 1 || groupId === 3) {
        // PENDING (1) or DELIVERED (3) — success
        return {
          success: true,
          providerMessageId: firstMessage?.messageId,
        };
      }

      if (groupId === 4) {
        // EXPIRED — retryable
        return {
          success: false,
          error:
            firstMessage?.status?.description || "Message expired (retryable)",
          retryable: true,
        };
      }

      if (groupId === 2 || groupId === 5) {
        // UNDELIVERABLE (2) or REJECTED (5) — permanent failure
        return {
          success: false,
          error:
            firstMessage?.status?.description || "Message rejected by Infobip",
          retryable: false,
        };
      }

      // Unknown groupId — treat as success if we got a messageId
      if (firstMessage?.messageId) {
        return { success: true, providerMessageId: firstMessage.messageId };
      }

      return {
        success: false,
        error: `Unexpected status groupId: ${groupId}`,
        retryable: true,
      };
    } catch (error) {
      return { success: false, error: String(error), retryable: true };
    }
  },

  verifyWebhook(
    _body: string,
    _headers: Record<string, string>,
    _credentials: ProviderCredentials
  ): boolean {
    // Phase 2: webhook signature verification
    return true;
  },

  async testConnection(
    credentials: ProviderCredentials
  ): Promise<{ success: boolean; accountName?: string; error?: string }> {
    const { infobipApiKey, infobipBaseUrl } = credentials;
    if (!infobipApiKey || !infobipBaseUrl) {
      return { success: false, error: "Missing Infobip credentials" };
    }

    try {
      const resp = await fetch(`${infobipBaseUrl}/account/1/balance`, {
        headers: { Authorization: `App ${infobipApiKey}` },
      });

      if (!resp.ok) {
        return { success: false, error: `HTTP ${resp.status}` };
      }

      const data = (await resp.json()) as {
        balance?: number;
        currency?: string;
      };
      return {
        success: true,
        accountName: `Infobip (Balance: ${data.balance} ${data.currency})`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};
