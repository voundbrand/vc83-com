/**
 * CHANNEL ROUTER
 *
 * Routes outbound messages to the correct provider for a given org + channel.
 * Reads channel_provider_binding objects from the ontology to determine routing.
 *
 * Binding object (type="channel_provider_binding") customProperties:
 * {
 *   channel: "whatsapp",
 *   providerId: "chatwoot",
 *   priority: 1,
 *   enabled: true,
 * }
 */

import { query, internalQuery, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { getProvider } from "./registry";
import { withRetry, CHANNEL_RETRY_POLICIES } from "../ai/retryPolicy";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { internal: internalApi } = require("../_generated/api") as {
  internal: Record<string, Record<string, Record<string, unknown>>>;
};
import type {
  ChannelProvider,
  ChannelType,
  ProviderId,
  OutboundMessage,
  SendResult,
  ProviderCredentialField,
  ProviderCredentials,
} from "./types";

export function providerSupportsChannel(
  provider: ChannelProvider,
  channel: string
): boolean {
  return provider.capabilities.supportedChannels.includes(channel as ChannelType);
}

export function credentialFieldRequiresDecryption(
  credentials: ProviderCredentials,
  field: ProviderCredentialField
): boolean {
  if (credentials.credentialSource !== "oauth_connection") {
    return false;
  }
  return (
    Array.isArray(credentials.encryptedFields) &&
    credentials.encryptedFields.includes(field)
  );
}

/**
 * Get the active provider binding for an org + channel.
 * Returns the highest-priority enabled binding.
 */
export const getChannelBinding = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
  },
  handler: async (ctx, args) => {
    const bindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "channel_provider_binding")
      )
      .collect();

    const matching = bindings
      .filter((b) => {
        const props = b.customProperties as Record<string, unknown>;
        return props?.channel === args.channel && props?.enabled === true;
      })
      .sort((a, b) => {
        const ap =
          ((a.customProperties as Record<string, unknown>)?.priority as number) || 99;
        const bp =
          ((b.customProperties as Record<string, unknown>)?.priority as number) || 99;
        return ap - bp;
      });

    return matching[0] ?? null;
  },
});

/**
 * Get provider credentials for an org.
 * Most providers: stored as type="{providerId}_settings" in the objects table.
 * WhatsApp: stored in oauthConnections table (per-org OAuth).
 */
export const getProviderCredentials = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    providerId: v.string(),
  },
  handler: async (ctx, args) => {
    // WhatsApp Direct uses oauthConnections, not objects table
    if (args.providerId === "whatsapp") {
      const connection = await ctx.db
        .query("oauthConnections")
        .withIndex("by_org_and_provider", (q) =>
          q.eq("organizationId", args.organizationId).eq("provider", "whatsapp")
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      if (!connection) return null;

      const metadata = connection.customProperties as Record<string, unknown>;
      return {
        providerId: "whatsapp",
        credentialSource: "oauth_connection",
        encryptedFields: ["whatsappAccessToken"],
        whatsappPhoneNumberId: metadata?.phoneNumberId as string,
        whatsappAccessToken: connection.accessToken, // Encrypted — decrypted in sendMessage action
        whatsappWabaId: metadata?.wabaId as string,
        whatsappOrganizationId: args.organizationId,
        webhookSecret: process.env.META_APP_SECRET,
      } as ProviderCredentials;
    }

    // Slack uses oauthConnections; optional env fallback is gated by policy.
    if (args.providerId === "slack") {
      const connection = await ctx.db
        .query("oauthConnections")
        .withIndex("by_org_and_provider", (q) =>
          q.eq("organizationId", args.organizationId).eq("provider", "slack")
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      if (connection) {
        const metadata = connection.customProperties as Record<string, unknown>;
        return {
          providerId: "slack",
          credentialSource: "oauth_connection",
          encryptedFields: ["slackBotToken"],
          // Stored encrypted in oauthConnections; decrypted at send time.
          slackBotToken: connection.accessToken,
          slackTeamId: connection.providerAccountId,
          slackBotUserId: metadata?.botUserId as string | undefined,
          slackAppId: metadata?.appId as string | undefined,
          slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
        } as ProviderCredentials;
      }

      const tokenPolicy = process.env.SLACK_BOT_TOKEN_POLICY || "oauth_connection_only";
      if (
        tokenPolicy === "oauth_or_env_fallback" &&
        process.env.SLACK_BOT_TOKEN
      ) {
        return {
          providerId: "slack",
          credentialSource: "env_fallback",
          slackBotToken: process.env.SLACK_BOT_TOKEN,
          slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
        } as ProviderCredentials;
      }

      return null;
    }

    // Default: query objects table for per-org settings
    const settingsType = `${args.providerId}_settings`;
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", settingsType)
      )
      .first();

    if (settings) {
      return {
        providerId: args.providerId,
        credentialSource: "object_settings",
        ...(settings.customProperties as Record<string, unknown>),
      } as ProviderCredentials;
    }

    // Fallback: platform-owned Infobip account (env vars)
    if (args.providerId === "infobip") {
      const apiKey = process.env.INFOBIP_API_KEY;
      const baseUrl = process.env.INFOBIP_BASE_URL;
      const globalSenderId = process.env.INFOBIP_SMS_SENDER_ID;
      if (apiKey && baseUrl && globalSenderId) {
        // Look up CPaaS X application + entity IDs for multi-tenant isolation
        const applicationId = process.env.INFOBIP_APPLICATION_ID || undefined;

        const entityObj = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("type", "infobip_entity")
          )
          .first();
        const entityId = (entityObj?.customProperties as Record<string, unknown>)
          ?.entityId as string | undefined;

        // Check for per-org sender config (platform_sms_config)
        const smsConfig = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("type", "platform_sms_config")
          )
          .first();

        let orgSenderId = globalSenderId;
        if (smsConfig) {
          const smsProps = smsConfig.customProperties as Record<string, unknown>;
          if (smsProps?.senderType === "alphanumeric" && smsProps?.alphanumericSender) {
            orgSenderId = smsProps.alphanumericSender as string;
          } else if (
            smsProps?.senderType === "vln" &&
            smsProps?.vlnStatus === "active" &&
            smsProps?.vlnNumber
          ) {
            orgSenderId = smsProps.vlnNumber as string;
          }
        }

        return {
          providerId: "infobip",
          credentialSource: "platform_fallback",
          infobipApiKey: apiKey,
          infobipBaseUrl: baseUrl,
          infobipSmsSenderId: orgSenderId,
          infobipApplicationId: applicationId,
          infobipEntityId: entityId,
        } as ProviderCredentials;
      }
    }

    return null;
  },
});

/**
 * Send a message through the correct provider for an org + channel.
 */
export const sendMessage = internalAction({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
    recipientIdentifier: v.string(),
    content: v.string(),
    contentHtml: v.optional(v.string()),
    subject: v.optional(v.string()),
    providerConversationId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SendResult> => {
    // 1. Find the provider binding for this channel
    const binding = await (ctx.runQuery as Function)(
      internalApi.channels.router.getChannelBinding,
      {
        organizationId: args.organizationId,
        channel: args.channel,
      }
    ) as Record<string, unknown> | null;

    // Platform fallbacks when no per-org binding exists
    let providerId: ProviderId;
    if (!binding) {
      if (
        args.channel === "sms" &&
        process.env.INFOBIP_API_KEY &&
        process.env.INFOBIP_BASE_URL &&
        process.env.INFOBIP_SMS_SENDER_ID
      ) {
        providerId = "infobip";
      } else if (
        args.channel === "telegram" &&
        process.env.TELEGRAM_BOT_TOKEN
      ) {
        // Platform bot fallback — telegramProvider.sendMessage reads TELEGRAM_BOT_TOKEN from env
        providerId = "telegram";
      } else if (args.channel === "slack") {
        // Slack can resolve credentials from active OAuth connection or env fallback policy.
        providerId = "slack";
      } else {
        return {
          success: false,
          error: `No provider configured for channel: ${args.channel}`,
        };
      }
    } else {
      providerId = ((binding as Record<string, unknown>).customProperties as Record<string, unknown>)
        ?.providerId as ProviderId;
    }

    const provider = getProvider(providerId);
    if (!provider) {
      return { success: false, error: `Provider not found: ${providerId}` };
    }
    if (!providerSupportsChannel(provider, args.channel)) {
      return {
        success: false,
        error: `Provider ${providerId} does not support channel: ${args.channel}`,
      };
    }

    // 2. Get credentials
    let credentials = await (ctx.runQuery as Function)(
      internalApi.channels.router.getProviderCredentials,
      { organizationId: args.organizationId, providerId }
    ) as ProviderCredentials | null;

    if (!credentials) {
      return {
        success: false,
        error: `No credentials for provider: ${providerId}`,
      };
    }

    // 2b. Decrypt WhatsApp access token (stored encrypted in oauthConnections)
    if (
      providerId === "whatsapp" &&
      credentials.whatsappAccessToken &&
      credentialFieldRequiresDecryption(credentials, "whatsappAccessToken")
    ) {
      const decryptedToken = await (ctx.runAction as Function)(
        internalApi.oauth.encryption.decryptToken,
        { encrypted: credentials.whatsappAccessToken }
      ) as string;
      credentials = { ...credentials, whatsappAccessToken: decryptedToken };
    }

    // 2c. Decrypt Slack bot token when sourced from oauthConnections.
    if (
      providerId === "slack" &&
      credentials.slackBotToken &&
      credentialFieldRequiresDecryption(credentials, "slackBotToken")
    ) {
      const decryptedToken = await (ctx.runAction as Function)(
        internalApi.oauth.encryption.decryptToken,
        { encrypted: credentials.slackBotToken }
      ) as string;
      credentials = { ...credentials, slackBotToken: decryptedToken };
    }

    // 3. Determine if this is a platform-owned send (no per-org binding)
    const isPlatformSms = !binding && args.channel === "sms";

    // 3b. Lazy provision CPaaS X entity for platform SMS (first send triggers provisioning)
    if (isPlatformSms && !credentials.infobipEntityId) {
      try {
        await (ctx.runAction as Function)(
          internalApi.channels.infobipCpaasX.provisionOrgEntity,
          { organizationId: args.organizationId }
        );
        // Re-fetch credentials to include the new entityId
        credentials = await (ctx.runQuery as Function)(
          internalApi.channels.router.getProviderCredentials,
          { organizationId: args.organizationId, providerId }
        ) as ProviderCredentials;
        if (!credentials) {
          return { success: false, error: "Credentials lost after entity provisioning" };
        }
      } catch (e) {
        // Entity provisioning failure should not block SMS delivery
        console.error("[Router] CPaaS X entity provisioning failed (non-blocking):", e);
      }
    }

    // 3c. Ensure platform application exists (lazy, one-time)
    if (isPlatformSms && !credentials.infobipApplicationId) {
      try {
        await (ctx.runAction as Function)(
          internalApi.channels.infobipCpaasX.ensurePlatformApplication,
          {}
        );
        // Re-fetch credentials to include applicationId
        credentials = await (ctx.runQuery as Function)(
          internalApi.channels.router.getProviderCredentials,
          { organizationId: args.organizationId, providerId }
        ) as ProviderCredentials;
        if (!credentials) {
          return { success: false, error: "Credentials lost after application provisioning" };
        }
      } catch (e) {
        console.error("[Router] CPaaS X application provisioning failed (non-blocking):", e);
      }
    }

    // 4. Send through provider with retry
    const message: OutboundMessage = {
      channel: args.channel as ChannelType,
      recipientIdentifier: args.recipientIdentifier,
      content: args.content,
      contentHtml: args.contentHtml,
      subject: args.subject,
      metadata: {
        providerConversationId: args.providerConversationId,
      },
    };

    const retryPolicy = CHANNEL_RETRY_POLICIES[args.channel] || CHANNEL_RETRY_POLICIES.telegram;
    let result: SendResult;

    try {
      const retryResult = await withRetry(
        async () => {
          const sendResult = await provider.sendMessage(credentials, message);
          if (!sendResult.success) {
            throw buildProviderSendError(sendResult);
          }
          return sendResult;
        },
        retryPolicy
      );
      result = retryResult.result;

      if (retryResult.attempts > 1) {
        console.warn(
          `[Router] ${args.channel} send succeeded on attempt ${retryResult.attempts}`
        );
      }
    } catch (e) {
      // All retries exhausted — check if it's a markdown formatting issue
      if (isMarkdownParseError(e)) {
        try {
          const plainResult = await provider.sendMessage(credentials, {
            ...message,
            content: stripMarkdown(message.content),
            contentHtml: undefined,
          });
          if (plainResult.success) {
            result = plainResult;
          } else {
            result = { success: false, error: plainResult.error || "Plain text fallback also failed" };
          }
        } catch {
          result = {
            success: false,
            error: `All retries + plain text fallback failed: ${e instanceof Error ? e.message : String(e)}`,
          };
        }
      } else {
        result = {
          success: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    // 5. Deduct credits for platform SMS (per-org enterprise pays Infobip directly)
    if (isPlatformSms && result.success) {
      try {
        const smsCreditDeduction = await (ctx.runMutation as Function)(
          internalApi.credits.index.deductCreditsInternalMutation,
          {
            organizationId: args.organizationId,
            amount: 2, // sms_outbound cost
            action: "sms_outbound",
            description: `SMS to ${args.recipientIdentifier.slice(0, 6)}...`,
            softFailOnExhausted: true,
          }
        );

        if (!smsCreditDeduction.success) {
          console.warn("[Router] SMS credit deduction skipped:", {
            organizationId: args.organizationId,
            errorCode: smsCreditDeduction.errorCode,
            message: smsCreditDeduction.message,
            creditsRequired: smsCreditDeduction.creditsRequired,
            creditsAvailable: smsCreditDeduction.creditsAvailable,
          });
        }
      } catch (e) {
        // Credit deduction failure shouldn't block SMS delivery
        console.error("[Router] SMS credit deduction failed:", e);
      }
    }

    return result;
  },
});

/**
 * Get all configured channel bindings for an org.
 * Used by the agent config UI to show which channels have providers.
 */
// ============================================================================
// ERROR HELPERS
// ============================================================================

/**
 * Detect if an error is a markdown/formatting parse error from a provider.
 * Some providers reject messages with unsupported markdown syntax.
 */
function isMarkdownParseError(error: unknown): boolean {
  const message = String((error as Error)?.message || error || "").toLowerCase();
  return (
    message.includes("parse") ||
    message.includes("markdown") ||
    message.includes("formatting") ||
    message.includes("bad request: can't parse")
  );
}

function buildProviderSendError(
  sendResult: SendResult
): Error & {
  status?: number;
  statusCode?: number;
  retryAfterMs?: number;
  retryable?: boolean;
} {
  const error = new Error(sendResult.error || "Send returned failure") as Error & {
    status?: number;
    statusCode?: number;
    retryAfterMs?: number;
    retryable?: boolean;
  };
  if (typeof sendResult.statusCode === "number") {
    error.status = sendResult.statusCode;
    error.statusCode = sendResult.statusCode;
  }
  if (typeof sendResult.retryAfterMs === "number") {
    error.retryAfterMs = sendResult.retryAfterMs;
  }
  if (typeof sendResult.retryable === "boolean") {
    error.retryable = sendResult.retryable;
  }
  return error;
}

/**
 * Strip markdown formatting to plain text as a delivery fallback.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")  // bold
    .replace(/\*(.*?)\*/g, "$1")       // italic
    .replace(/__(.*?)__/g, "$1")       // bold alt
    .replace(/_(.*?)_/g, "$1")         // italic alt
    .replace(/~~(.*?)~~/g, "$1")       // strikethrough
    .replace(/`{3}[\s\S]*?`{3}/g, "")  // code blocks
    .replace(/`(.*?)`/g, "$1")         // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/^#{1,6}\s+/gm, "")       // headings
    .replace(/^[-*+]\s+/gm, "- ")      // list items
    .replace(/^\d+\.\s+/gm, "")        // numbered lists
    .trim();
}

export const getConfiguredChannels = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const bindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "channel_provider_binding")
      )
      .collect();

    return bindings
      .filter((b) => {
        const props = b.customProperties as Record<string, unknown>;
        return props?.enabled === true;
      })
      .map((b) => {
        const props = b.customProperties as Record<string, unknown>;
        return {
          channel: props?.channel as string,
          providerId: props?.providerId as string,
        };
      });
  },
});
