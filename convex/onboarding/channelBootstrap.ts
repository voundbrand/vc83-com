import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { internal: internalApi } = require("../_generated/api") as {
  internal: Record<string, Record<string, Record<string, unknown>>>;
};

const SUPPORTED_CHANNELS = new Set(["telegram", "whatsapp", "slack", "sms"]);
const EXPLICIT_BETA_CODE_PATTERN =
  /\b(?:beta|invite|access)\s*(?:code)?\s*[:#=/-]?\s*([a-z0-9]+(?:-[a-z0-9]+)*)\b/i;
const TOKEN_BETA_CODE_PATTERN = /\b[a-z0-9]+(?:-[a-z0-9]+)*\b/gi;
const NORMALIZED_BETA_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
export const CHANNEL_FIRST_MESSAGE_SLA_MS = 60 * 1000;

type SupportedMessagingChannel = "telegram" | "whatsapp" | "slack" | "sms";

type BetaCodeValidationResult = {
  isValid: boolean;
  reason?: string;
  channelTag?: string | null;
  sourceDetail?: string | null;
};

type ChannelConnectionContext = {
  connectionKey: string;
  connectionSource:
    | "oauth_connection"
    | "channel_binding"
    | "platform_sms_config"
    | "infobip_settings"
    | "telegram_mapping";
  connectedAt?: number;
  providerConnectionId?: string;
  providerAccountId?: string;
  routeKey?: string;
} | null;

type OAuthConnectionDoc = {
  _id: Id<"oauthConnections">;
  organizationId: Id<"organizations">;
  provider: string;
  providerAccountId?: string;
  status: string;
  connectedAt?: number;
  updatedAt?: number;
};

function normalizeSupportedChannel(value: string): SupportedMessagingChannel | null {
  const normalized = value.trim().toLowerCase();
  if (!SUPPORTED_CHANNELS.has(normalized)) {
    return null;
  }
  return normalized as SupportedMessagingChannel;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCodeCandidate(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeEpochMs(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (value <= 0) {
    return undefined;
  }
  if (value < 1_000_000_000_000) {
    return Math.floor(value * 1000);
  }
  return Math.floor(value);
}

function isLikelyBetaCode(candidate: string): boolean {
  if (!NORMALIZED_BETA_CODE_PATTERN.test(candidate)) {
    return false;
  }

  const compact = candidate.replace(/-/g, "");
  if (compact.length < 6 || compact.length > 48) {
    return false;
  }

  if (!/[A-Z]/.test(compact) || !/[0-9]/.test(compact)) {
    return false;
  }

  if (!candidate.includes("-") && compact.length < 8) {
    return false;
  }

  return true;
}

function isObjectEnabled(status: unknown, enabledFlag: unknown): boolean {
  if (enabledFlag === false) {
    return false;
  }
  const normalizedStatus = normalizeOptionalString(status)?.toLowerCase();
  return normalizedStatus !== "inactive" && normalizedStatus !== "archived";
}

function resolveConnectedAtFromOAuthConnection(connection: OAuthConnectionDoc): number | undefined {
  return normalizeEpochMs(connection.connectedAt) || normalizeEpochMs(connection.updatedAt);
}

function selectMostRecentOAuthConnection(connections: OAuthConnectionDoc[]): OAuthConnectionDoc | null {
  if (connections.length === 0) {
    return null;
  }
  return [...connections].sort((a, b) => {
    const aConnectedAt = resolveConnectedAtFromOAuthConnection(a) || 0;
    const bConnectedAt = resolveConnectedAtFromOAuthConnection(b) || 0;
    return bConnectedAt - aConnectedAt;
  })[0];
}

export function extractBetaCodeCandidateFromMessage(message: string): string | null {
  const normalizedMessage = message.trim();
  if (normalizedMessage.length === 0) {
    return null;
  }

  const explicitMatch = normalizedMessage.match(EXPLICIT_BETA_CODE_PATTERN);
  if (explicitMatch?.[1]) {
    const explicitCandidate = normalizeCodeCandidate(explicitMatch[1]);
    if (isLikelyBetaCode(explicitCandidate)) {
      return explicitCandidate;
    }
  }

  const tokenMatches = normalizedMessage.match(TOKEN_BETA_CODE_PATTERN) || [];
  for (const token of tokenMatches) {
    const candidate = normalizeCodeCandidate(token);
    if (isLikelyBetaCode(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function calculateChannelFirstMessageLatencyMs(args: {
  connectedAt?: number;
  occurredAt: number;
}): number | null {
  const connectedAt = normalizeEpochMs(args.connectedAt);
  const occurredAt = normalizeEpochMs(args.occurredAt);
  if (!connectedAt || !occurredAt) {
    return null;
  }
  return Math.max(0, occurredAt - connectedAt);
}

export const resolveChannelConnectionContext = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
    providerConnectionId: v.optional(v.string()),
    providerAccountId: v.optional(v.string()),
    routeKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ChannelConnectionContext> => {
    const channel = normalizeSupportedChannel(args.channel);
    if (!channel) {
      return null;
    }

    const providerConnectionId = normalizeOptionalString(args.providerConnectionId);
    const providerAccountId = normalizeOptionalString(args.providerAccountId);
    const routeKey = normalizeOptionalString(args.routeKey);

    if (channel === "slack" || channel === "whatsapp") {
      if (providerConnectionId) {
        try {
          const byId = (await ctx.db.get(
            providerConnectionId as Id<"oauthConnections">
          )) as OAuthConnectionDoc | null;
          if (
            byId &&
            byId.organizationId === args.organizationId &&
            byId.provider === channel &&
            byId.status === "active"
          ) {
            return {
              connectionKey: `oauth:${String(byId._id)}`,
              connectionSource: "oauth_connection",
              connectedAt: resolveConnectedAtFromOAuthConnection(byId),
              providerConnectionId: String(byId._id),
              providerAccountId: normalizeOptionalString(byId.providerAccountId),
              routeKey,
            };
          }
        } catch {
          // Ignore malformed IDs and fall through to indexed lookup.
        }
      }

      const activeConnections = (await ctx.db
        .query("oauthConnections")
        .withIndex("by_org_and_provider", (q) =>
          q.eq("organizationId", args.organizationId).eq("provider", channel)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect()) as OAuthConnectionDoc[];

      const accountFiltered =
        providerAccountId
          ? activeConnections.filter(
              (connection) =>
                normalizeOptionalString(connection.providerAccountId) === providerAccountId
            )
          : activeConnections;
      const selected = selectMostRecentOAuthConnection(accountFiltered);
      if (selected) {
        return {
          connectionKey: `oauth:${String(selected._id)}`,
          connectionSource: "oauth_connection",
          connectedAt: resolveConnectedAtFromOAuthConnection(selected),
          providerConnectionId: String(selected._id),
          providerAccountId: normalizeOptionalString(selected.providerAccountId),
          routeKey,
        };
      }
    }

    const channelBindings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "channel_provider_binding")
      )
      .collect();
    const matchingBinding = [...channelBindings]
      .filter((binding) => {
        const props =
          binding.customProperties && typeof binding.customProperties === "object"
            ? (binding.customProperties as Record<string, unknown>)
            : {};
        const bindingChannel = normalizeOptionalString(props.channel)?.toLowerCase();
        const bindingEnabled = isObjectEnabled(binding.status, props.enabled);
        return bindingChannel === channel && bindingEnabled;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];

    if (matchingBinding) {
      const props =
        matchingBinding.customProperties && typeof matchingBinding.customProperties === "object"
          ? (matchingBinding.customProperties as Record<string, unknown>)
          : {};
      const bindingRouteKey = normalizeOptionalString(props.routeKey) || routeKey;
      return {
        connectionKey: `binding:${String(matchingBinding._id)}`,
        connectionSource: "channel_binding",
        connectedAt: normalizeEpochMs(matchingBinding.createdAt),
        routeKey: bindingRouteKey,
      };
    }

    if (channel === "sms") {
      const smsConfigs = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "platform_sms_config")
        )
        .collect();
      const activeSmsConfig = [...smsConfigs]
        .filter((config) => {
          const props =
            config.customProperties && typeof config.customProperties === "object"
              ? (config.customProperties as Record<string, unknown>)
              : {};
          return isObjectEnabled(config.status, props.enabled);
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];

      if (activeSmsConfig) {
        return {
          connectionKey: `platform_sms_config:${String(activeSmsConfig._id)}`,
          connectionSource: "platform_sms_config",
          connectedAt: normalizeEpochMs(activeSmsConfig.createdAt),
          routeKey,
        };
      }

      const infobipConfigs = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "infobip_settings")
        )
        .collect();
      const activeInfobip = [...infobipConfigs]
        .filter((config) => {
          const props =
            config.customProperties && typeof config.customProperties === "object"
              ? (config.customProperties as Record<string, unknown>)
              : {};
          return isObjectEnabled(config.status, props.enabled);
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];

      if (activeInfobip) {
        return {
          connectionKey: `infobip_settings:${String(activeInfobip._id)}`,
          connectionSource: "infobip_settings",
          connectedAt: normalizeEpochMs(activeInfobip.createdAt),
          routeKey,
        };
      }
    }

    if (channel === "telegram") {
      const mapping = await ctx.db
        .query("telegramMappings")
        .withIndex("by_chat_id", (q) =>
          q.eq("telegramChatId", args.externalContactIdentifier)
        )
        .first();
      if (
        mapping &&
        mapping.organizationId === args.organizationId &&
        mapping.status === "active"
      ) {
        return {
          connectionKey: `telegram_mapping:${String(mapping._id)}`,
          connectionSource: "telegram_mapping",
          connectedAt: normalizeEpochMs(mapping.createdAt),
          routeKey,
        };
      }
    }

    return null;
  },
});

export const recordBetaCodeBootstrapAudit = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
    sessionId: v.optional(v.id("agentSessions")),
    detectedCode: v.string(),
    validationStatus: v.union(v.literal("valid"), v.literal("invalid"), v.literal("error")),
    reason: v.optional(v.string()),
    channelTag: v.optional(v.union(v.string(), v.null())),
    sourceDetail: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      action: "onboarding.channel.beta_code_bootstrap",
      resource: "channelBootstrap",
      resourceId: `${args.channel}:${args.externalContactIdentifier}`,
      metadata: {
        channel: args.channel,
        externalContactIdentifier: args.externalContactIdentifier,
        sessionId: args.sessionId,
        detectedCode: args.detectedCode,
        validationStatus: args.validationStatus,
        reason: args.reason,
        channelTag: args.channelTag,
        sourceDetail: args.sourceDetail,
        recordedAt: now,
      },
      success: args.validationStatus === "valid",
      createdAt: now,
    });
  },
});

export const processInboundFirstMessageBootstrap = internalAction({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
    sessionId: v.optional(v.id("agentSessions")),
    message: v.string(),
    isFirstInboundMessage: v.boolean(),
    providerConnectionId: v.optional(v.string()),
    providerAccountId: v.optional(v.string()),
    routeKey: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const channel = normalizeSupportedChannel(args.channel);
    if (!channel) {
      return {
        supported: false,
        attemptedValidation: false,
        latencyMetric: {
          tracked: false,
          reason: "unsupported_channel",
        },
      };
    }

    const occurredAt = normalizeEpochMs(args.occurredAt) || Date.now();
    let latencyMetric: Record<string, unknown> = {
      tracked: false,
      reason: "missing_connection_context",
    };

    try {
      const connectionContext = (await (ctx.runQuery as Function)(
        internalApi.onboarding.channelBootstrap.resolveChannelConnectionContext,
        {
          organizationId: args.organizationId,
          channel,
          externalContactIdentifier: args.externalContactIdentifier,
          providerConnectionId: args.providerConnectionId,
          providerAccountId: args.providerAccountId,
          routeKey: args.routeKey,
        }
      )) as ChannelConnectionContext;

      if (connectionContext?.connectionKey) {
        const latencyMs = calculateChannelFirstMessageLatencyMs({
          connectedAt: connectionContext.connectedAt,
          occurredAt,
        });
        const withinSla =
          typeof latencyMs === "number" ? latencyMs <= CHANNEL_FIRST_MESSAGE_SLA_MS : undefined;

        const latencyEvent = await (ctx.runMutation as Function)(
          internalApi.onboarding.funnelEvents.emitFunnelEvent,
          {
            eventName: "onboarding.funnel.channel_first_message_latency",
            channel,
            organizationId: args.organizationId,
            eventKey:
              `onboarding.funnel.channel_first_message_latency:` +
              `${channel}:${connectionContext.connectionKey}`,
            metadata: {
              channel,
              externalContactIdentifier: args.externalContactIdentifier,
              connectionKey: connectionContext.connectionKey,
              connectionSource: connectionContext.connectionSource,
              connectedAt: connectionContext.connectedAt,
              occurredAt,
              latencyMs,
              withinSla,
              slaTargetMs: CHANNEL_FIRST_MESSAGE_SLA_MS,
              providerConnectionId:
                connectionContext.providerConnectionId || args.providerConnectionId,
              providerAccountId:
                connectionContext.providerAccountId || args.providerAccountId,
              routeKey: connectionContext.routeKey || args.routeKey,
            },
          }
        ) as { deduped?: boolean } | null;

        latencyMetric = {
          tracked: true,
          deduped: latencyEvent?.deduped === true,
          connectionKey: connectionContext.connectionKey,
          connectionSource: connectionContext.connectionSource,
          connectedAt: connectionContext.connectedAt,
          occurredAt,
          latencyMs,
          withinSla,
          slaTargetMs: CHANNEL_FIRST_MESSAGE_SLA_MS,
        };
      }
    } catch (latencyError) {
      latencyMetric = {
        tracked: false,
        reason: "latency_tracking_error",
        error: String(latencyError),
      };
    }

    if (!args.isFirstInboundMessage) {
      return {
        supported: true,
        attemptedValidation: false,
        latencyMetric,
      };
    }

    const detectedCode = extractBetaCodeCandidateFromMessage(args.message);
    if (!detectedCode) {
      return {
        supported: true,
        attemptedValidation: false,
        latencyMetric,
      };
    }

    try {
      const validation = (await (ctx.runQuery as Function)(
        internalApi.betaCodes.validateBetaCodeInternal,
        { code: detectedCode }
      )) as BetaCodeValidationResult;
      const validationStatus = validation?.isValid ? "valid" : "invalid";

      await (ctx.runMutation as Function)(
        internalApi.onboarding.channelBootstrap.recordBetaCodeBootstrapAudit,
        {
          organizationId: args.organizationId,
          channel,
          externalContactIdentifier: args.externalContactIdentifier,
          sessionId: args.sessionId,
          detectedCode,
          validationStatus,
          reason: validation?.reason,
          channelTag: validation?.channelTag ?? null,
          sourceDetail: validation?.sourceDetail ?? null,
        }
      );

      return {
        supported: true,
        attemptedValidation: true,
        detectedCode,
        validation: {
          isValid: validation?.isValid === true,
          reason: validation?.reason,
          channelTag: validation?.channelTag ?? undefined,
          sourceDetail: validation?.sourceDetail ?? undefined,
        },
        latencyMetric,
      };
    } catch (error) {
      const reason = String(error);
      await (ctx.runMutation as Function)(
        internalApi.onboarding.channelBootstrap.recordBetaCodeBootstrapAudit,
        {
          organizationId: args.organizationId,
          channel,
          externalContactIdentifier: args.externalContactIdentifier,
          sessionId: args.sessionId,
          detectedCode,
          validationStatus: "error",
          reason,
          channelTag: null,
          sourceDetail: null,
        }
      );

      return {
        supported: true,
        attemptedValidation: true,
        detectedCode,
        validation: {
          isValid: false,
          reason: "validation_error",
        },
        latencyMetric,
      };
    }
  },
});
