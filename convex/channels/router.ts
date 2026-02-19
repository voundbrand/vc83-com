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
 *   providerConnectionId: "oauthConnections:...",
 *   providerInstallationId: "team_or_waba_or_bot_identity",
 *   providerProfileId: "app_profile_identity",
 *   providerProfileType: "organization" | "platform",
 *   routeKey: "provider:installation:route",
 *   allowPlatformFallback: false,
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
  ChannelProviderBindingContract,
  ChannelType,
  ProviderId,
  OutboundMessage,
  ProviderProfileType,
  SendResult,
  ProviderCredentialField,
  ProviderCredentials,
} from "./types";

const ENCRYPTED_CHANNEL_FIELDS = new Set<ProviderCredentialField>([
  "whatsappAccessToken",
  "slackBotToken",
  "telegramBotToken",
  "telegramWebhookSecret",
  "chatwootApiToken",
  "manychatApiKey",
  "resendApiKey",
]);

function normalizeEncryptedFields(
  value: unknown
): ProviderCredentialField[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value.filter(
    (field): field is ProviderCredentialField =>
      typeof field === "string" &&
      ENCRYPTED_CHANNEL_FIELDS.has(field as ProviderCredentialField)
  );

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeProviderProfileType(value: unknown): ProviderProfileType | undefined {
  return value === "platform" || value === "organization" ? value : undefined;
}

interface ProviderRoutingIdentityHints {
  providerId: ProviderId;
  providerConnectionId?: string;
  providerAccountId?: string;
  providerInstallationId?: string;
  providerProfileId?: string;
  providerProfileType?: ProviderProfileType;
  routeKey?: string;
  allowPlatformFallback?: boolean;
}

function normalizeBindingRoutingIdentity(
  binding: Record<string, unknown> | null
): ProviderRoutingIdentityHints | null {
  if (!binding) {
    return null;
  }

  const props = (binding.customProperties || {}) as ChannelProviderBindingContract &
    Record<string, unknown>;
  const providerId = normalizeOptionalString(props.providerId);
  if (!providerId) {
    return null;
  }

  const providerConnectionId = normalizeOptionalString(
    props.providerConnectionId ?? props.oauthConnectionId
  );
  const providerInstallationId = normalizeOptionalString(
    props.providerInstallationId ?? props.installationId
  );
  const providerProfileId = normalizeOptionalString(
    props.providerProfileId ?? props.appProfileId
  );
  const providerProfileType = normalizeProviderProfileType(
    props.providerProfileType ?? props.profileType
  );

  return {
    providerId: providerId as ProviderId,
    providerConnectionId,
    providerAccountId: normalizeOptionalString(props.providerAccountId),
    providerInstallationId,
    providerProfileId,
    providerProfileType,
    routeKey: normalizeOptionalString(props.routeKey ?? props.bindingRouteKey),
    allowPlatformFallback: normalizeOptionalBoolean(
      props.allowPlatformFallback ??
        props.allowPlatformCredentialFallback ??
        props.enablePlatformFallback
    ),
  };
}

export interface CredentialBoundaryBindingHints {
  providerConnectionId?: string;
  providerInstallationId?: string;
  providerProfileType?: ProviderProfileType;
  routeKey?: string;
}

export function shouldAllowPlatformCredentialFallback(args: {
  hasBinding: boolean;
  providerId: ProviderId;
  bindingProfileType?: ProviderProfileType;
  bindingAllowPlatformFallback?: boolean;
  slackTokenPolicy?: string;
}): boolean {
  if (args.hasBinding) {
    return (
      args.bindingProfileType === "platform" &&
      args.bindingAllowPlatformFallback === true
    );
  }

  if (args.providerId === "infobip" || args.providerId === "telegram") {
    return true;
  }

  if (args.providerId === "slack") {
    const tokenPolicy =
      args.slackTokenPolicy ??
      process.env.SLACK_BOT_TOKEN_POLICY ??
      "oauth_connection_only";
    return tokenPolicy === "oauth_or_env_fallback";
  }

  return false;
}

export function validateCredentialBoundary(args: {
  binding: CredentialBoundaryBindingHints | null;
  credentials: ProviderCredentials;
}): { ok: boolean; reason?: string } {
  const binding = args.binding;
  if (!binding) {
    return { ok: true };
  }

  const bindingProfileType = normalizeProviderProfileType(binding.providerProfileType);
  const credentialProfileType = normalizeProviderProfileType(
    args.credentials.providerProfileType
  );
  const credentialSource = args.credentials.credentialSource;

  if (bindingProfileType === "organization") {
    if (credentialProfileType === "platform") {
      return {
        ok: false,
        reason: "organization binding resolved to platform credential profile",
      };
    }
    if (
      credentialSource === "platform_fallback" ||
      credentialSource === "env_fallback"
    ) {
      return {
        ok: false,
        reason: "organization binding attempted platform credential fallback",
      };
    }
  }

  if (
    bindingProfileType === "platform" &&
    credentialProfileType === "organization"
  ) {
    return {
      ok: false,
      reason: "platform binding resolved to organization credential profile",
    };
  }

  const bindingConnectionId = normalizeOptionalString(binding.providerConnectionId);
  const credentialConnectionId = normalizeOptionalString(
    args.credentials.providerConnectionId
  );
  if (
    bindingConnectionId &&
    credentialConnectionId &&
    bindingConnectionId !== credentialConnectionId
  ) {
    return {
      ok: false,
      reason: `providerConnectionId mismatch (${bindingConnectionId} != ${credentialConnectionId})`,
    };
  }

  const bindingInstallationId = normalizeOptionalString(
    binding.providerInstallationId
  );
  const credentialInstallationId = normalizeOptionalString(
    args.credentials.providerInstallationId
  );
  if (
    bindingInstallationId &&
    credentialInstallationId &&
    bindingInstallationId !== credentialInstallationId
  ) {
    return {
      ok: false,
      reason: `providerInstallationId mismatch (${bindingInstallationId} != ${credentialInstallationId})`,
    };
  }

  const bindingRouteKey = normalizeOptionalString(binding.routeKey);
  const credentialRouteKey = normalizeOptionalString(args.credentials.bindingRouteKey);
  if (bindingRouteKey && credentialRouteKey && bindingRouteKey !== credentialRouteKey) {
    return {
      ok: false,
      reason: `routeKey mismatch (${bindingRouteKey} != ${credentialRouteKey})`,
    };
  }

  return { ok: true };
}

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
  if (
    credentials.credentialSource !== "oauth_connection" &&
    credentials.credentialSource !== "object_settings"
  ) {
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
    providerConnectionId: v.optional(v.string()),
    providerAccountId: v.optional(v.string()),
    providerInstallationId: v.optional(v.string()),
    providerProfileId: v.optional(v.string()),
    providerProfileType: v.optional(
      v.union(v.literal("platform"), v.literal("organization"))
    ),
    routeKey: v.optional(v.string()),
    allowPlatformFallback: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const requestedProviderProfileType = normalizeProviderProfileType(
      args.providerProfileType
    );
    const allowPlatformFallback = args.allowPlatformFallback === true;

    const matchesRequestedProfileType = (connection: Record<string, unknown>) => {
      if (!requestedProviderProfileType) {
        return true;
      }

      const metadata = (connection.customProperties || {}) as Record<string, unknown>;
      const connectionProfileType =
        normalizeProviderProfileType(connection.providerProfileType) ||
        normalizeProviderProfileType(metadata.providerProfileType) ||
        normalizeProviderProfileType(metadata.profileType);

      if (!connectionProfileType) {
        return requestedProviderProfileType === "organization";
      }

      return connectionProfileType === requestedProviderProfileType;
    };

    const resolveActiveOAuthConnection = async (
      provider: "slack" | "whatsapp"
    ) => {
      const activeConnections = await ctx.db
        .query("oauthConnections")
        .withIndex("by_org_and_provider", (q) =>
          q.eq("organizationId", args.organizationId).eq("provider", provider)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      const scopedActiveConnections = activeConnections.filter((connection) =>
        matchesRequestedProfileType(connection as unknown as Record<string, unknown>)
      );

      if (scopedActiveConnections.length === 0) {
        return null;
      }

      const providerConnectionId = normalizeOptionalString(args.providerConnectionId);
      if (providerConnectionId) {
        const byConnectionId = scopedActiveConnections.find(
          (connection) => String(connection._id) === providerConnectionId
        );
        if (byConnectionId) {
          return byConnectionId;
        }
      }

      const providerAccountId = normalizeOptionalString(args.providerAccountId);
      if (providerAccountId) {
        const byProviderAccount = scopedActiveConnections.find(
          (connection) => connection.providerAccountId === providerAccountId
        );
        if (byProviderAccount) {
          return byProviderAccount;
        }
      }

      const providerInstallationId = normalizeOptionalString(
        args.providerInstallationId
      );
      if (providerInstallationId) {
        const byInstallation = scopedActiveConnections.find((connection) => {
          const connectionRecord = connection as Record<string, unknown>;
          const metadata = (connection.customProperties || {}) as Record<
            string,
            unknown
          >;
          return (
            normalizeOptionalString(connectionRecord.providerInstallationId) ===
              providerInstallationId ||
            normalizeOptionalString(metadata.providerInstallationId) ===
              providerInstallationId ||
            normalizeOptionalString(metadata.installationId) ===
              providerInstallationId
          );
        });
        if (byInstallation) {
          return byInstallation;
        }
      }

      return scopedActiveConnections[0] ?? null;
    };

    const resolveConnectionIdentity = (
      connection: Record<string, unknown>,
      metadata: Record<string, unknown>,
      profileTypeFallback: ProviderProfileType
    ) => {
      const providerConnectionId =
        normalizeOptionalString(connection._id) ||
        normalizeOptionalString(args.providerConnectionId);
      const providerAccountId =
        normalizeOptionalString(connection.providerAccountId) ||
        normalizeOptionalString(args.providerAccountId);
      const providerInstallationId =
        normalizeOptionalString(connection.providerInstallationId) ||
        normalizeOptionalString(metadata.providerInstallationId) ||
        normalizeOptionalString(metadata.installationId) ||
        normalizeOptionalString(args.providerInstallationId) ||
        providerAccountId ||
        providerConnectionId;
      const providerProfileId =
        normalizeOptionalString(connection.providerProfileId) ||
        normalizeOptionalString(metadata.providerProfileId) ||
        normalizeOptionalString(metadata.appProfileId) ||
        normalizeOptionalString(args.providerProfileId);
      const providerProfileType =
        normalizeProviderProfileType(connection.providerProfileType) ||
        normalizeProviderProfileType(metadata.providerProfileType) ||
        normalizeProviderProfileType(metadata.profileType) ||
        normalizeProviderProfileType(args.providerProfileType) ||
        profileTypeFallback;
      const providerSegment =
        normalizeOptionalString(connection.provider) ||
        normalizeOptionalString(args.providerId) ||
        "provider";
      const routeKey =
        normalizeOptionalString(connection.providerRouteKey) ||
        normalizeOptionalString(metadata.providerRouteKey) ||
        normalizeOptionalString(metadata.routeKey) ||
        normalizeOptionalString(args.routeKey) ||
        (providerInstallationId
          ? `${providerSegment}:${providerInstallationId}`
          : undefined);

      return {
        providerConnectionId,
        providerAccountId,
        providerInstallationId,
        providerProfileId,
        providerProfileType,
        routeKey,
      };
    };

    // WhatsApp Direct uses oauthConnections, not objects table
    if (args.providerId === "whatsapp") {
      const connection = await resolveActiveOAuthConnection("whatsapp");

      if (!connection) return null;

      const connectionRecord = connection as Record<string, unknown>;
      const metadata = (connection.customProperties || {}) as Record<
        string,
        unknown
      >;
      const identity = resolveConnectionIdentity(
        connectionRecord,
        metadata,
        "organization"
      );
      return {
        providerId: "whatsapp",
        credentialSource: "oauth_connection",
        encryptedFields: ["whatsappAccessToken"],
        providerConnectionId: identity.providerConnectionId,
        providerAccountId: identity.providerAccountId,
        providerInstallationId: identity.providerInstallationId,
        providerProfileId: identity.providerProfileId,
        providerProfileType: identity.providerProfileType,
        bindingRouteKey: identity.routeKey,
        whatsappPhoneNumberId: metadata?.phoneNumberId as string,
        whatsappAccessToken: connection.accessToken, // Encrypted — decrypted in sendMessage action
        whatsappWabaId: metadata?.wabaId as string,
        whatsappOrganizationId: args.organizationId,
        webhookSecret: process.env.META_APP_SECRET,
      } as ProviderCredentials;
    }

    // Slack uses oauthConnections; optional env fallback is gated by policy.
    if (args.providerId === "slack") {
      const connection = await resolveActiveOAuthConnection("slack");

      if (connection) {
        const connectionRecord = connection as Record<string, unknown>;
        const metadata = (connection.customProperties || {}) as Record<
          string,
          unknown
        >;
        const identity = resolveConnectionIdentity(
          connectionRecord,
          metadata,
          "organization"
        );
        return {
          providerId: "slack",
          credentialSource: "oauth_connection",
          encryptedFields: ["slackBotToken"],
          providerConnectionId: identity.providerConnectionId,
          providerAccountId: identity.providerAccountId,
          providerInstallationId: identity.providerInstallationId,
          providerProfileId: identity.providerProfileId,
          providerProfileType: identity.providerProfileType,
          bindingRouteKey: identity.routeKey,
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
        allowPlatformFallback &&
        requestedProviderProfileType !== "organization" &&
        tokenPolicy === "oauth_or_env_fallback" &&
        process.env.SLACK_BOT_TOKEN
      ) {
        return {
          providerId: "slack",
          credentialSource: "env_fallback",
          providerProfileId:
            normalizeOptionalString(args.providerProfileId) || "platform:slack:env",
          providerProfileType: "platform",
          bindingRouteKey:
            normalizeOptionalString(args.routeKey) || "slack:platform_env",
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
      const props = settings.customProperties as Record<string, unknown>;
      const encryptedFields = normalizeEncryptedFields(props.encryptedFields);
      const providerProfileId =
        normalizeOptionalString(args.providerProfileId) ||
        normalizeOptionalString(props.providerProfileId) ||
        normalizeOptionalString(props.appProfileId);
      const providerProfileType =
        normalizeProviderProfileType(args.providerProfileType) ||
        normalizeProviderProfileType(props.providerProfileType) ||
        normalizeProviderProfileType(props.profileType) ||
        "organization";
      if (
        requestedProviderProfileType &&
        providerProfileType !== requestedProviderProfileType
      ) {
        return null;
      }
      const providerInstallationId =
        normalizeOptionalString(args.providerInstallationId) ||
        normalizeOptionalString(props.providerInstallationId) ||
        normalizeOptionalString(props.installationId) ||
        normalizeOptionalString(args.providerAccountId);
      const providerConnectionId =
        normalizeOptionalString(args.providerConnectionId) ||
        normalizeOptionalString(props.providerConnectionId) ||
        normalizeOptionalString(props.oauthConnectionId);
      const providerAccountId =
        normalizeOptionalString(args.providerAccountId) ||
        normalizeOptionalString(props.providerAccountId);
      const routeKey =
        normalizeOptionalString(args.routeKey) ||
        normalizeOptionalString(props.routeKey) ||
        normalizeOptionalString(props.bindingRouteKey);
      return {
        providerId: args.providerId,
        credentialSource: "object_settings",
        ...props,
        encryptedFields,
        providerConnectionId,
        providerAccountId,
        providerInstallationId,
        providerProfileId,
        providerProfileType,
        bindingRouteKey: routeKey,
      } as ProviderCredentials;
    }

    if (
      args.providerId === "telegram" &&
      allowPlatformFallback &&
      requestedProviderProfileType !== "organization" &&
      process.env.TELEGRAM_BOT_TOKEN
    ) {
      return {
        providerId: "telegram",
        credentialSource: "platform_fallback",
        providerProfileId:
          normalizeOptionalString(args.providerProfileId) ||
          "platform:telegram:env",
        providerProfileType: "platform",
        providerInstallationId:
          normalizeOptionalString(args.providerInstallationId) ||
          "platform:telegram",
        bindingRouteKey:
          normalizeOptionalString(args.routeKey) || "telegram:platform",
        telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
        telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
        webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
      } as ProviderCredentials;
    }

    // Fallback: platform-owned Infobip account (env vars)
    if (args.providerId === "infobip" && allowPlatformFallback) {
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
          providerProfileId:
            normalizeOptionalString(args.providerProfileId) ||
            "platform:infobip",
          providerProfileType: "platform",
          providerInstallationId:
            normalizeOptionalString(args.providerInstallationId) ||
            "platform:infobip",
          bindingRouteKey:
            normalizeOptionalString(args.routeKey) || "infobip:platform",
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
    const bindingIdentity = normalizeBindingRoutingIdentity(binding);

    const hasBinding = Boolean(binding);

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
      if (!bindingIdentity?.providerId) {
        return {
          success: false,
          error: `Channel binding missing provider identity for channel: ${args.channel}`,
        };
      }
      providerId = bindingIdentity.providerId;
    }

    const allowPlatformFallback = shouldAllowPlatformCredentialFallback({
      hasBinding,
      providerId,
      bindingProfileType: bindingIdentity?.providerProfileType,
      bindingAllowPlatformFallback: bindingIdentity?.allowPlatformFallback,
    });
    const requestedProviderProfileType: ProviderProfileType | undefined =
      bindingIdentity?.providerProfileType ||
      (!binding && (providerId === "infobip" || providerId === "telegram")
        ? "platform"
        : undefined);

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
      {
        organizationId: args.organizationId,
        providerId,
        providerConnectionId: bindingIdentity?.providerConnectionId,
        providerAccountId: bindingIdentity?.providerAccountId,
        providerInstallationId: bindingIdentity?.providerInstallationId,
        providerProfileId: bindingIdentity?.providerProfileId,
        providerProfileType: requestedProviderProfileType,
        routeKey: bindingIdentity?.routeKey,
        allowPlatformFallback,
      }
    ) as ProviderCredentials | null;

    if (!credentials) {
      return {
        success: false,
        error: `No credentials for provider: ${providerId}`,
      };
    }

    const credentialBoundary = validateCredentialBoundary({
      binding: bindingIdentity
        ? {
            providerConnectionId: bindingIdentity.providerConnectionId,
            providerInstallationId: bindingIdentity.providerInstallationId,
            providerProfileType: bindingIdentity.providerProfileType,
            routeKey: bindingIdentity.routeKey,
          }
        : null,
      credentials,
    });
    if (!credentialBoundary.ok) {
      return {
        success: false,
        error: `Credential boundary violation for provider ${providerId}: ${credentialBoundary.reason}`,
      };
    }

    // 2b. Decrypt credential fields only at send-time boundary.
    const decryptCredentialField = async (
      field: ProviderCredentialField,
      value: string | undefined
    ): Promise<string | undefined> => {
      if (
        !value ||
        !credentialFieldRequiresDecryption(
          credentials as ProviderCredentials,
          field
        )
      ) {
        return value;
      }

      const decrypted = await (ctx.runAction as Function)(
        internalApi.oauth.encryption.decryptToken,
        { encrypted: value }
      ) as string;
      return decrypted;
    };

    if (providerId === "whatsapp") {
      credentials = {
        ...credentials,
        whatsappAccessToken: await decryptCredentialField(
          "whatsappAccessToken",
          credentials.whatsappAccessToken
        ),
      };
    }

    if (providerId === "slack") {
      credentials = {
        ...credentials,
        slackBotToken: await decryptCredentialField(
          "slackBotToken",
          credentials.slackBotToken
        ),
      };
    }

    if (providerId === "telegram") {
      const encryptedWebhookSecret =
        credentials.telegramWebhookSecret || credentials.webhookSecret;
      const decryptedWebhookSecret = await decryptCredentialField(
        "telegramWebhookSecret",
        encryptedWebhookSecret
      );
      credentials = {
        ...credentials,
        telegramBotToken: await decryptCredentialField(
          "telegramBotToken",
          credentials.telegramBotToken
        ),
        telegramWebhookSecret: decryptedWebhookSecret,
        webhookSecret: decryptedWebhookSecret,
      };
    }

    if (providerId === "chatwoot") {
      credentials = {
        ...credentials,
        chatwootApiToken: await decryptCredentialField(
          "chatwootApiToken",
          credentials.chatwootApiToken
        ),
      };
    }

    if (providerId === "manychat") {
      credentials = {
        ...credentials,
        manychatApiKey: await decryptCredentialField(
          "manychatApiKey",
          credentials.manychatApiKey
        ),
      };
    }

    if (providerId === "resend") {
      credentials = {
        ...credentials,
        resendApiKey: await decryptCredentialField(
          "resendApiKey",
          credentials.resendApiKey
        ),
      };
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
          {
            organizationId: args.organizationId,
            providerId,
            providerConnectionId: bindingIdentity?.providerConnectionId,
            providerAccountId: bindingIdentity?.providerAccountId,
            providerInstallationId: bindingIdentity?.providerInstallationId,
            providerProfileId: bindingIdentity?.providerProfileId,
            providerProfileType: requestedProviderProfileType,
            routeKey: bindingIdentity?.routeKey,
            allowPlatformFallback,
          }
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
          {
            organizationId: args.organizationId,
            providerId,
            providerConnectionId: bindingIdentity?.providerConnectionId,
            providerAccountId: bindingIdentity?.providerAccountId,
            providerInstallationId: bindingIdentity?.providerInstallationId,
            providerProfileId: bindingIdentity?.providerProfileId,
            providerProfileType: requestedProviderProfileType,
            routeKey: bindingIdentity?.routeKey,
            allowPlatformFallback,
          }
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
        const routingIdentity = normalizeBindingRoutingIdentity(
          b as Record<string, unknown>
        );
        return {
          channel: props?.channel as string,
          providerId: props?.providerId as string,
          providerConnectionId: routingIdentity?.providerConnectionId,
          providerAccountId: routingIdentity?.providerAccountId,
          providerInstallationId: routingIdentity?.providerInstallationId,
          providerProfileId: routingIdentity?.providerProfileId,
          providerProfileType: routingIdentity?.providerProfileType,
          routeKey: routingIdentity?.routeKey,
          allowPlatformFallback: routingIdentity?.allowPlatformFallback,
        };
      });
  },
});
