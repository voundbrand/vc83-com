/**
 * CHATWOOT CHANNEL PROVIDER
 *
 * Self-hosted Chatwoot integration (one instance, multi-tenant via accounts).
 * Each org gets a Chatwoot account with per-channel inboxes.
 *
 * Chatwoot handles: WhatsApp, Email, Webchat, Instagram, Facebook Messenger,
 * SMS, and Telegram — all through a unified inbox.
 */

import type {
  ChannelProvider,
  ChannelProviderCapabilities,
  ProviderCredentials,
  NormalizedInboundMessage,
  OutboundMessage,
  SendResult,
  ChannelType,
} from "../types";

const capabilities: ChannelProviderCapabilities = {
  supportedChannels: [
    "whatsapp",
    "email",
    "webchat",
    "instagram",
    "facebook_messenger",
    "sms",
    "telegram",
  ],
  supportsInbound: true,
  supportsOutbound: true,
  supportsWebhooks: true,
  supportsAttachments: true,
  supportsTemplates: false,
  supportsConversationThreading: true,
};

// Chatwoot channel_type → our ChannelType
const CHATWOOT_CHANNEL_MAP: Record<string, ChannelType> = {
  "Channel::Whatsapp": "whatsapp",
  "Channel::Email": "email",
  "Channel::WebWidget": "webchat",
  "Channel::Api": "webchat",
  "Channel::Instagram": "instagram",
  "Channel::FacebookPage": "facebook_messenger",
  "Channel::Sms": "sms",
  "Channel::Telegram": "telegram",
};

function resolveIdentifier(
  channel: ChannelType,
  sender: Record<string, unknown>
): string {
  const phone = sender.phone_number as string | undefined;
  const email = sender.email as string | undefined;
  const id = sender.id;

  if (["whatsapp", "sms"].includes(channel) && phone) {
    return phone;
  }
  if (channel === "email" && email) {
    return email;
  }
  return id?.toString() || "unknown";
}

export const chatwootProvider: ChannelProvider = {
  id: "chatwoot",
  name: "Chatwoot",
  capabilities,

  normalizeInbound(rawPayload, _credentials): NormalizedInboundMessage | null {
    const event = rawPayload.event as string;
    if (event !== "message_created") return null;

    const messageType = rawPayload.message_type as string;
    if (messageType !== "incoming") return null;

    const conversation = rawPayload.conversation as Record<string, unknown> | undefined;
    const sender = rawPayload.sender as Record<string, unknown> | undefined;
    const content = rawPayload.content as string | undefined;

    if (!content || !sender || !conversation) return null;

    const inbox = conversation.inbox as Record<string, unknown> | undefined;
    const inboxChannelType = (inbox?.channel_type as string) || "";
    const channel = CHATWOOT_CHANNEL_MAP[inboxChannelType] || "webchat";
    const externalContactIdentifier = resolveIdentifier(channel, sender);

    const attachments = (
      (rawPayload.attachments as Array<Record<string, unknown>>) || []
    ).map((a) => ({
      type: (a.file_type as string) || "file",
      url: a.data_url as string,
      name: a.file_name as string,
    }));

    return {
      organizationId: "", // Resolved by webhook handler via account ID lookup
      channel,
      externalContactIdentifier,
      message: content,
      messageType: attachments.length > 0 ? "file" : "text",
      metadata: {
        providerId: "chatwoot",
        providerMessageId: (rawPayload.id as number)?.toString(),
        providerConversationId: (conversation.id as number)?.toString(),
        senderName: sender.name as string,
        senderAvatar: sender.thumbnail as string,
        attachments: attachments.length > 0 ? attachments : undefined,
        skipOutbound: true, // Webhook handler sends reply back itself
        raw: rawPayload,
      },
    };
  },

  async sendMessage(credentials, message): Promise<SendResult> {
    const { chatwootUrl, chatwootApiToken, chatwootAccountId } = credentials;
    if (!chatwootUrl || !chatwootApiToken || !chatwootAccountId) {
      return { success: false, error: "Chatwoot credentials incomplete" };
    }

    const conversationId = message.metadata?.providerConversationId;
    if (!conversationId) {
      return { success: false, error: "No Chatwoot conversation ID for reply" };
    }

    try {
      const url = `${chatwootUrl}/api/v1/accounts/${chatwootAccountId}/conversations/${conversationId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_access_token: chatwootApiToken,
        },
        body: JSON.stringify({
          content: message.content,
          message_type: "outgoing",
          content_type: "text",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Chatwoot API ${response.status}: ${errorText}`,
          retryable: response.status >= 500,
        };
      }

      const data = await response.json();
      return { success: true, providerMessageId: data.id?.toString() };
    } catch (error) {
      return { success: false, error: String(error), retryable: true };
    }
  },

  verifyWebhook(
    _body: string,
    headers: Record<string, string>,
    credentials: ProviderCredentials
  ): boolean {
    const secret = credentials.webhookSecret;
    if (!secret) return true; // No secret configured = accept all (dev mode)

    const received = headers["x-chatwoot-webhook-token"] || "";
    return received === secret;
  },

  async testConnection(credentials): Promise<{
    success: boolean;
    accountName?: string;
    error?: string;
  }> {
    const { chatwootUrl, chatwootApiToken, chatwootAccountId } = credentials;
    if (!chatwootUrl || !chatwootApiToken) {
      return { success: false, error: "Missing Chatwoot URL or API token" };
    }

    try {
      const url = `${chatwootUrl}/api/v1/accounts/${chatwootAccountId}`;
      const response = await fetch(url, {
        headers: { api_access_token: chatwootApiToken },
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { success: true, accountName: data.name };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};
