/**
 * WHATSAPP DIRECT CHANNEL PROVIDER
 *
 * Direct Meta WhatsApp Cloud API integration (no Chatwoot middleman).
 * Each org connects their own WhatsApp Business Account via OAuth.
 * Credentials are stored in oauthConnections (not the objects table).
 *
 * Supports:
 * - Inbound: Normalize Meta webhook payloads
 * - Outbound: Send text replies (24h window) and template messages
 * - Webhook verification: HMAC SHA256 via separate internalAction
 */

import type {
  ChannelProvider,
  ChannelProviderCapabilities,
  ProviderCredentials,
  NormalizedInboundMessage,
  OutboundMessage,
  SendResult,
} from "../types";

const META_GRAPH_URL = "https://graph.facebook.com/v18.0";

const capabilities: ChannelProviderCapabilities = {
  supportedChannels: ["whatsapp"],
  supportsInbound: true,
  supportsOutbound: true,
  supportsWebhooks: true,
  supportsAttachments: true,
  supportsTemplates: true,
  supportsConversationThreading: false,
};

/**
 * Parse Meta webhook payload into a normalized inbound message.
 * Meta sends: { object, entry: [{ id, changes: [{ value: { messages, contacts, metadata } }] }] }
 */
function parseMetaWebhookPayload(
  rawPayload: Record<string, unknown>
): NormalizedInboundMessage | null {
  if (rawPayload.object !== "whatsapp_business_account") return null;

  const entries = rawPayload.entry as Array<Record<string, unknown>> | undefined;
  if (!entries?.length) return null;

  const changes = entries[0].changes as Array<Record<string, unknown>> | undefined;
  if (!changes?.length) return null;

  const change = changes[0];
  if (change.field !== "messages") return null;

  const value = change.value as Record<string, unknown>;
  if (!value) return null;

  const messages = value.messages as Array<Record<string, unknown>> | undefined;
  if (!messages?.length) return null;

  // Only handle first message in batch
  const msg = messages[0];
  const msgType = msg.type as string;

  // Extract sender info from contacts array
  const contacts = value.contacts as Array<Record<string, unknown>> | undefined;
  const senderProfile = contacts?.[0]?.profile as Record<string, unknown> | undefined;
  const senderName = senderProfile?.name as string | undefined;

  // Extract message content based on type
  let messageText = "";
  let normalizedType: NormalizedInboundMessage["messageType"] = "text";

  if (msgType === "text") {
    const textObj = msg.text as Record<string, unknown> | undefined;
    messageText = (textObj?.body as string) || "";
    normalizedType = "text";
  } else if (msgType === "image") {
    const imageObj = msg.image as Record<string, unknown> | undefined;
    messageText = (imageObj?.caption as string) || "[Image]";
    normalizedType = "image";
  } else if (msgType === "audio") {
    messageText = "[Audio message]";
    normalizedType = "audio";
  } else if (msgType === "video") {
    const videoObj = msg.video as Record<string, unknown> | undefined;
    messageText = (videoObj?.caption as string) || "[Video]";
    normalizedType = "video";
  } else if (msgType === "document") {
    const docObj = msg.document as Record<string, unknown> | undefined;
    messageText = (docObj?.caption as string) || (docObj?.filename as string) || "[Document]";
    normalizedType = "file";
  } else if (msgType === "location") {
    const locObj = msg.location as Record<string, unknown> | undefined;
    messageText = `[Location: ${locObj?.latitude}, ${locObj?.longitude}]`;
    normalizedType = "location";
  } else {
    // Unsupported message type (reaction, sticker, etc.)
    return null;
  }

  if (!messageText) return null;

  return {
    organizationId: "", // Resolved by webhook handler via phoneNumberId lookup
    channel: "whatsapp",
    externalContactIdentifier: msg.from as string, // Phone number in international format
    message: messageText,
    messageType: normalizedType,
    metadata: {
      providerId: "whatsapp",
      providerMessageId: msg.id as string,
      senderName,
      raw: rawPayload,
    },
  };
}

export const whatsappProvider: ChannelProvider = {
  id: "whatsapp",
  name: "WhatsApp (Direct)",
  capabilities,

  normalizeInbound(rawPayload, _credentials): NormalizedInboundMessage | null {
    return parseMetaWebhookPayload(rawPayload);
  },

  async sendMessage(credentials, message): Promise<SendResult> {
    const { whatsappPhoneNumberId, whatsappAccessToken } = credentials;
    if (!whatsappPhoneNumberId || !whatsappAccessToken) {
      return { success: false, error: "WhatsApp credentials incomplete" };
    }

    // Build message payload — template or text reply
    const templateName = message.metadata?.templateName;
    let payload: Record<string, unknown>;

    if (templateName) {
      // Template message (works anytime, required outside 24h window)
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: message.recipientIdentifier,
        type: "template",
        template: {
          name: templateName,
          language: { code: "de" },
          components: message.metadata?.templateParams?.length
            ? [{
                type: "body",
                parameters: message.metadata.templateParams.map((t) => ({
                  type: "text",
                  text: t,
                })),
              }]
            : undefined,
        },
      };
    } else {
      // Text reply (within 24h conversation window)
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: message.recipientIdentifier,
        type: "text",
        text: { preview_url: false, body: message.content },
      };
    }

    try {
      const response = await fetch(
        `${META_GRAPH_URL}/${whatsappPhoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${whatsappAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = (errData as Record<string, Record<string, string>>)?.error?.message
          || `Meta API ${response.status}`;
        return {
          success: false,
          error: errMsg,
          retryable: response.status >= 500,
        };
      }

      const data = await response.json() as Record<string, Array<Record<string, string>>>;
      return { success: true, providerMessageId: data.messages?.[0]?.id };
    } catch (error) {
      return { success: false, error: String(error), retryable: true };
    }
  },

  verifyWebhook(
    _body: string,
    _headers: Record<string, string>,
    _credentials: ProviderCredentials
  ): boolean {
    // HMAC verification is done in the webhook internalAction (requires Node.js crypto).
    // Provider-level verify is a no-op; the action handles it before calling normalizeInbound.
    return true;
  },

  async testConnection(credentials): Promise<{
    success: boolean;
    accountName?: string;
    error?: string;
  }> {
    const { whatsappPhoneNumberId, whatsappAccessToken } = credentials;
    if (!whatsappPhoneNumberId || !whatsappAccessToken) {
      return { success: false, error: "Missing WhatsApp credentials" };
    }

    try {
      const resp = await fetch(
        `${META_GRAPH_URL}/${whatsappPhoneNumberId}?fields=verified_name,display_phone_number`,
        { headers: { Authorization: `Bearer ${whatsappAccessToken}` } }
      );

      if (!resp.ok) {
        return { success: false, error: `HTTP ${resp.status}` };
      }

      const data = await resp.json() as Record<string, string>;
      return {
        success: true,
        accountName: data.verified_name || data.display_phone_number,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};
