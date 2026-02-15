/**
 * TELEGRAM BOT SETUP — Per-Org Bot Deployment Pipeline
 *
 * Validates a @BotFather token, registers a webhook with Telegram,
 * and stores credentials in the objects table so the channel router
 * uses the per-org bot for outbound delivery.
 */

import { internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Lazy API import — same pattern as agencySubOrgBootstrap.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../_generated/api").internal;
  }
  return _apiCache;
}

/**
 * Validate a Telegram bot token by calling getMe.
 * Returns bot info or null if invalid.
 */
export const validateBotToken = internalAction({
  args: {
    token: v.string(),
  },
  handler: async (_ctx, args): Promise<{ id: number; username: string; first_name: string } | null> => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${args.token}/getMe`);
      const data = await res.json();
      if (data.ok && data.result) {
        return {
          id: data.result.id,
          username: data.result.username,
          first_name: data.result.first_name,
        };
      }
      console.error("[TelegramBotSetup] getMe failed:", data.description);
      return null;
    } catch (error) {
      console.error("[TelegramBotSetup] getMe error:", error);
      return null;
    }
  },
});

/**
 * Register a webhook URL with Telegram for a bot token.
 */
export const registerWebhookWithTelegram = internalAction({
  args: {
    token: v.string(),
    webhookUrl: v.string(),
    secretToken: v.string(),
  },
  handler: async (_ctx, args): Promise<{ success: boolean; description?: string }> => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${args.token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: args.webhookUrl,
          secret_token: args.secretToken,
          allowed_updates: ["message", "callback_query", "my_chat_member"],
        }),
      });
      const data = await res.json();
      return {
        success: data.ok === true,
        description: data.description,
      };
    } catch (error) {
      console.error("[TelegramBotSetup] setWebhook error:", error);
      return { success: false, description: String(error) };
    }
  },
});

/**
 * Store telegram_settings and channel_provider_binding in the objects table.
 * Upserts both entries using by_org_type index.
 */
export const storeTelegramSettings = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    telegramBotToken: v.string(),
    telegramBotUsername: v.string(),
    webhookSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Upsert telegram_settings
    const existingSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "telegram_settings")
      )
      .first();

    const settingsProps = {
      telegramBotToken: args.telegramBotToken,
      telegramBotUsername: args.telegramBotUsername,
      webhookSecret: args.webhookSecret,
    };

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        customProperties: settingsProps,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "telegram_settings",
        name: "Telegram Bot Settings",
        status: "active",
        customProperties: settingsProps,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Upsert channel_provider_binding for telegram
    const existingBinding = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "channel_provider_binding")
      )
      .collect();

    const telegramBinding = existingBinding.find((b) => {
      const props = b.customProperties as Record<string, unknown>;
      return props?.channel === "telegram";
    });

    if (!telegramBinding) {
      await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "channel_provider_binding",
        name: "Telegram Channel Binding",
        status: "active",
        customProperties: {
          channel: "telegram",
          providerId: "telegram",
          priority: 1,
          enabled: true,
        },
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Orchestrate full bot deployment:
 * 1. Validate token (getMe)
 * 2. Generate webhook secret
 * 3. Build webhook URL
 * 4. Register webhook with Telegram
 * 5. Store credentials
 */
export const deployBot = internalAction({
  args: {
    organizationId: v.id("organizations"),
    botToken: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Validate the bot token
    const botInfo = await ctx.runAction(
      getInternal().channels.telegramBotSetup.validateBotToken,
      { token: args.botToken }
    );

    if (!botInfo) {
      return {
        success: false,
        error: "Invalid bot token. Make sure you copied the full token from @BotFather.",
      };
    }

    // 2. Generate random webhook secret (32-char hex = 16 bytes)
    const secretBytes = new Uint8Array(16);
    crypto.getRandomValues(secretBytes);
    const webhookSecret = Array.from(secretBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 3. Build webhook URL
    const siteUrl = process.env.NEXT_PUBLIC_API_ENDPOINT_URL || "https://aromatic-akita-723.convex.site";
    const webhookUrl = `${siteUrl}/telegram-webhook?org=${args.organizationId}`;

    // 4. Register webhook with Telegram
    const webhookResult = await ctx.runAction(
      getInternal().channels.telegramBotSetup.registerWebhookWithTelegram,
      {
        token: args.botToken,
        webhookUrl,
        secretToken: webhookSecret,
      }
    );

    if (!webhookResult.success) {
      return {
        success: false,
        error: `Failed to register webhook: ${webhookResult.description}`,
      };
    }

    // 5. Store credentials
    await ctx.runMutation(
      getInternal().channels.telegramBotSetup.storeTelegramSettings,
      {
        organizationId: args.organizationId,
        telegramBotToken: args.botToken,
        telegramBotUsername: botInfo.username,
        webhookSecret,
      }
    );

    return {
      success: true,
      botUsername: botInfo.username,
      botName: botInfo.first_name,
      webhookUrl,
      message: `Bot @${botInfo.username} deployed! Customers can now message @${botInfo.username} directly. The deep link will also redirect to this bot.`,
    };
  },
});

/**
 * Register the platform bot's webhook with Telegram.
 * Call once during deployment or via admin action.
 * After this, the platform bot receives updates via webhook (no polling needed).
 */
export const registerPlatformWebhook = internalAction({
  args: {},
  handler: async () => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const siteUrl =
      process.env.NEXT_PUBLIC_API_ENDPOINT_URL ||
      "https://aromatic-akita-723.convex.site";
    if (!botToken) {
      throw new Error("Missing TELEGRAM_BOT_TOKEN env var");
    }

    const webhookUrl = `${siteUrl}/telegram-webhook`;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;

    const body: Record<string, unknown> = {
      url: webhookUrl,
      allowed_updates: ["message", "callback_query", "my_chat_member"],
      drop_pending_updates: false,
    };
    if (secret) {
      body.secret_token = secret;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const result = (await response.json()) as {
      ok: boolean;
      description?: string;
    };
    if (!result.ok) {
      throw new Error(
        `Platform webhook registration failed: ${result.description}`
      );
    }

    console.log(`[Telegram] Platform webhook registered: ${webhookUrl}`);
    return { success: true, webhookUrl };
  },
});
