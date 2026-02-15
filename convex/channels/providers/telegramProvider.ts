/**
 * TELEGRAM CHANNEL PROVIDER
 *
 * Telegram Bot API integration for the platform System Bot.
 * The bot is platform-owned (single token in env), not per-org.
 *
 * Supports:
 * - Inbound: Normalize Telegram webhook payloads
 * - Outbound: Send text replies via Bot API
 * - No webhook signature verification needed (Telegram uses secret_token header)
 */

import type {
  ChannelProvider,
  ChannelProviderCapabilities,
  ProviderCredentials,
  NormalizedInboundMessage,
  OutboundMessage,
  SendResult,
} from "../types";

const TELEGRAM_API = "https://api.telegram.org";

const capabilities: ChannelProviderCapabilities = {
  supportedChannels: ["telegram"],
  supportsInbound: true,
  supportsOutbound: true,
  supportsWebhooks: true,
  supportsAttachments: true, // Voice notes, images, documents via media tools
  supportsTemplates: false,
  supportsConversationThreading: false,
};

/**
 * Parse Telegram webhook update into a normalized inbound message.
 * Telegram sends: { update_id, message: { message_id, from, chat, date, text } }
 */
function parseTelegramUpdate(
  rawPayload: Record<string, unknown>
): NormalizedInboundMessage | null {
  const msg = rawPayload.message as Record<string, unknown> | undefined;
  if (!msg) return null;

  const text = msg.text as string | undefined;
  const hasMedia = msg.voice || msg.photo || msg.document || msg.audio;
  if (!text && !hasMedia) return null;

  const from = msg.from as Record<string, unknown> | undefined;
  const chat = msg.chat as Record<string, unknown> | undefined;

  const chatId = String(chat?.id || "");
  if (!chatId) return null;

  const senderName = [from?.first_name, from?.last_name]
    .filter(Boolean)
    .join(" ");

  // Determine message type based on content (Step 9: Rich Media)
  let messageType: "text" | "image" | "audio" | "video" | "file" = "text";
  if (msg.voice || msg.audio) messageType = "audio";
  else if (msg.photo) messageType = "image";
  else if (msg.document) messageType = "file";

  return {
    organizationId: "", // Resolved by webhook handler via telegramResolver
    channel: "telegram",
    externalContactIdentifier: chatId,
    message: text || (hasMedia ? "[media message]" : ""),
    messageType,
    metadata: {
      providerId: "telegram",
      providerMessageId: String(msg.message_id || ""),
      senderName: senderName || undefined,
      raw: rawPayload,
    },
  };
}

/**
 * Escape underscores inside URLs so Telegram's Markdown parser
 * doesn't interpret them as italic markers.
 * Matches http/https URLs and replaces _ with \_ only within the URL.
 */
function escapeTelegramMarkdownUrls(text: string): string {
  return text.replace(
    /https?:\/\/[^\s)]+/g,
    (url) => url.replace(/_/g, "\\_")
  );
}

export const telegramProvider: ChannelProvider = {
  id: "telegram",
  name: "Telegram Bot",
  capabilities,

  normalizeInbound(rawPayload, _credentials): NormalizedInboundMessage | null {
    return parseTelegramUpdate(rawPayload);
  },

  async sendMessage(credentials, message): Promise<SendResult> {
    const botToken =
      credentials.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return { success: false, error: "Telegram bot token not configured" };
    }

    const sendUrl = `${TELEGRAM_API}/bot${botToken}/sendMessage`;
    const chatId = message.recipientIdentifier;

    try {
      // Try with Markdown first for nice formatting
      const mdResponse = await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: escapeTelegramMarkdownUrls(message.content),
          parse_mode: "Markdown",
        }),
      });

      if (mdResponse.ok) {
        const data = (await mdResponse.json()) as {
          result?: { message_id?: number };
        };
        return {
          success: true,
          providerMessageId: String(data.result?.message_id || ""),
        };
      }

      // Check if it's a Markdown parse error (400) — retry as plain text
      const errData = (await mdResponse.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const errDesc = (errData.description as string) || "";

      if (
        mdResponse.status === 400 &&
        (errDesc.toLowerCase().includes("parse") ||
          errDesc.toLowerCase().includes("can't"))
      ) {
        const plainResponse = await fetch(sendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: message.content }),
        });

        if (plainResponse.ok) {
          const data = (await plainResponse.json()) as {
            result?: { message_id?: number };
          };
          return {
            success: true,
            providerMessageId: String(data.result?.message_id || ""),
          };
        }

        const plainErr = (await plainResponse
          .json()
          .catch(() => ({}))) as Record<string, unknown>;
        return {
          success: false,
          error:
            (plainErr.description as string) ||
            `Telegram API ${plainResponse.status}`,
          retryable: plainResponse.status >= 500,
        };
      }

      // Non-parse error
      return {
        success: false,
        error: errDesc || `Telegram API ${mdResponse.status}`,
        retryable: mdResponse.status >= 500,
      };
    } catch (error) {
      return { success: false, error: String(error), retryable: true };
    }
  },

  verifyWebhook(
    _body: string,
    headers: Record<string, string>,
    credentials: ProviderCredentials
  ): boolean {
    // Telegram supports a secret_token header for webhook verification.
    // If configured, verify it matches.
    const secret = credentials.webhookSecret;
    if (!secret) return true; // No secret configured, skip verification

    const headerToken = headers["x-telegram-bot-api-secret-token"];
    return headerToken === secret;
  },

  async testConnection(credentials): Promise<{
    success: boolean;
    accountName?: string;
    error?: string;
  }> {
    const botToken =
      credentials.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return { success: false, error: "Missing Telegram bot token" };
    }

    try {
      const resp = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`);

      if (!resp.ok) {
        return { success: false, error: `HTTP ${resp.status}` };
      }

      const data = (await resp.json()) as {
        result?: { username?: string; first_name?: string };
      };
      return {
        success: true,
        accountName: data.result?.username
          ? `@${data.result.username}`
          : data.result?.first_name,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};
