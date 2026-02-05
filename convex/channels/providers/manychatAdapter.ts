/**
 * MANYCHAT CHANNEL PROVIDER (Adapter)
 *
 * Wraps existing ManyChat integration into the ChannelProvider interface.
 * The actual ManyChat API logic lives in convex/integrations/manychat.ts.
 * This adapter normalizes it for the channel abstraction.
 *
 * ManyChat handles: Facebook Messenger, Instagram, WhatsApp, SMS, Telegram.
 */

import type {
  ChannelProvider,
  ChannelProviderCapabilities,
  ProviderCredentials,
  NormalizedInboundMessage,
  OutboundMessage,
  SendResult,
} from "../types";

const MANYCHAT_API_BASE = "https://api.manychat.com/fb";

const capabilities: ChannelProviderCapabilities = {
  supportedChannels: [
    "facebook_messenger",
    "instagram",
    "whatsapp",
    "sms",
    "telegram",
  ],
  supportsInbound: true,
  supportsOutbound: true,
  supportsWebhooks: true,
  supportsAttachments: false,
  supportsTemplates: true,
  supportsConversationThreading: false,
};

export const manychatProvider: ChannelProvider = {
  id: "manychat",
  name: "ManyChat",
  capabilities,

  normalizeInbound(rawPayload, _credentials): NormalizedInboundMessage | null {
    const subscriberId = rawPayload.subscriber_id as string;
    const message =
      (rawPayload.last_input_text as string) ||
      (rawPayload.message as string) ||
      (rawPayload.text as string);
    const channel = (rawPayload.channel as string) || "facebook_messenger";

    if (!subscriberId || !message) return null;

    return {
      organizationId: "", // Resolved by webhook handler
      channel: channel as NormalizedInboundMessage["channel"],
      externalContactIdentifier: subscriberId,
      message,
      messageType: "text",
      metadata: {
        providerId: "manychat",
        providerMessageId: rawPayload.message_id as string,
        senderName: rawPayload.first_name as string,
        skipOutbound: true, // ManyChat webhook handler sends reply itself
        raw: rawPayload,
      },
    };
  },

  async sendMessage(credentials, message): Promise<SendResult> {
    const apiKey = credentials.manychatApiKey || credentials.apiKey;
    if (!apiKey) {
      return { success: false, error: "ManyChat API key not configured" };
    }

    try {
      const response = await fetch(`${MANYCHAT_API_BASE}/sending/sendContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          subscriber_id: message.recipientIdentifier,
          data: {
            version: "v2",
            content: {
              messages: [{ type: "text", text: message.content }],
            },
          },
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `ManyChat API: ${response.status}`,
          retryable: response.status >= 500,
        };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error), retryable: true };
    }
  },

  verifyWebhook(_body, _headers, _credentials): boolean {
    // ManyChat verification handled at the Next.js route level (Bearer token)
    return true;
  },

  async testConnection(credentials) {
    const apiKey = credentials.manychatApiKey || credentials.apiKey;
    if (!apiKey) return { success: false, error: "No API key" };

    try {
      const response = await fetch(`${MANYCHAT_API_BASE}/page/getInfo`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
      const data = await response.json();
      return { success: true, accountName: data.data?.name };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};
