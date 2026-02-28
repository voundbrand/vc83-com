/**
 * CHANNEL WEBHOOK PROCESSORS
 *
 * Internal actions that process provider webhooks asynchronously.
 * HTTP routes respond quickly (200), then schedule these for actual processing.
 *
 * Flow: HTTP route → schedule internalAction → normalize → agent pipeline → reply
 */

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getProvider } from "./registry";
import { verifyWhatsAppWebhookSignature } from "./providers/whatsappSignature";
import { resolveSingleTenantContext } from "../integrations/tenantResolver";
import type { ProviderCredentials } from "./types";
import type { Id } from "../_generated/dataModel";
import type { SlackVacationRequestParseResult } from "./providers/slackProvider";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { api, internal: internalApi } = require("../_generated/api") as {
  api: Record<string, Record<string, Record<string, unknown>>>;
  internal: Record<string, Record<string, Record<string, unknown>>>;
};

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeProviderProfileType(
  value: unknown
): "platform" | "organization" | undefined {
  return value === "platform" || value === "organization" ? value : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function uniqueSecretCandidates(values: Array<string | undefined>): string[] {
  const normalized = values
    .map((value) => normalizeOptionalString(value))
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(normalized));
}

type WebhookIngressStatus = "success" | "warning" | "error" | "skipped";
type WebhookIngressOutcome = "accepted" | "warning" | "error" | "skipped";

function normalizeWebhookIngressStatus(value: unknown): WebhookIngressStatus {
  if (value === "warning" || value === "error" || value === "skipped") {
    return value;
  }
  return "success";
}

function resolveWebhookIngressOutcome(status: WebhookIngressStatus): WebhookIngressOutcome {
  if (status === "error") {
    return "error";
  }
  if (status === "skipped") {
    return "skipped";
  }
  if (status === "warning") {
    return "warning";
  }
  return "accepted";
}

function buildIngressEventName(action: string, status: WebhookIngressStatus): string {
  return `ingress.${action}.${status}`;
}

type RecordWebhookIngressOutcomeArgs = {
  organizationId: Id<"organizations">;
  provider: string;
  endpoint: string;
  action: string;
  status: unknown;
  message?: string;
  errorMessage?: string;
  providerEventId?: string;
  providerConnectionId?: string;
  providerAccountId?: string;
  routeKey?: string;
  sessionId?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
  processedAt?: number;
};

async function recordWebhookIngressOutcome(
  ctx: unknown,
  args: RecordWebhookIngressOutcomeArgs
): Promise<void> {
  const eventStatus = normalizeWebhookIngressStatus(args.status);
  try {
    await (ctx as any).runMutation(internalApi.channels.webhooks.recordWebhookEvent, {
      organizationId: args.organizationId,
      provider: args.provider,
      endpoint: args.endpoint,
      eventName: buildIngressEventName(args.action, eventStatus),
      eventStatus,
      outcome: resolveWebhookIngressOutcome(eventStatus),
      message: args.message,
      errorMessage: args.errorMessage,
      providerEventId: args.providerEventId,
      providerConnectionId: args.providerConnectionId,
      providerAccountId: args.providerAccountId,
      routeKey: args.routeKey,
      sessionId: args.sessionId,
      channel: args.channel,
      metadata: args.metadata,
      processedAt: args.processedAt ?? Date.now(),
    });
  } catch (error) {
    console.warn("[Webhook] Failed to persist ingress observability event:", error);
  }
}

async function resolveSlackOrganizationFromConnection(args: {
  ctx: unknown;
  providerConnectionId?: string;
  teamId?: string;
}): Promise<Id<"organizations"> | null> {
  const providerConnectionId = normalizeOptionalString(args.providerConnectionId);
  if (!providerConnectionId) {
    return null;
  }

  const connection = await (args.ctx as any).db.get(
    providerConnectionId as Id<"oauthConnections">
  );
  if (!connection) {
    return null;
  }
  if (connection.provider !== "slack" || connection.status !== "active") {
    return null;
  }

  const connectionTeamId = normalizeOptionalString(connection.providerAccountId);
  if (args.teamId && connectionTeamId && connectionTeamId !== args.teamId) {
    return null;
  }

  return connection.organizationId as Id<"organizations">;
}

/**
 * Resolve organization from a Chatwoot account ID.
 * Looks up chatwoot_settings objects to find which org owns the account.
 */
export const resolveOrgFromChatwootAccount = internalQuery({
  args: { chatwootAccountId: v.number() },
  handler: async (ctx, args) => {
    const allSettings = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "chatwoot_settings"))
      .collect();

    const match = allSettings.find((s) => {
      const props = s.customProperties as Record<string, unknown>;
      return props?.chatwootAccountId === args.chatwootAccountId;
    });

    return match?.organizationId ?? null;
  },
});

/**
 * Resolve organization from a WhatsApp phone_number_id.
 * Looks up oauthConnections to find which org owns the phone number.
 */
export const resolveOrgFromWhatsAppPhoneNumberId = internalQuery({
  args: { phoneNumberId: v.string() },
  handler: async (ctx, args): Promise<{
    organizationId: Id<"organizations">;
    providerConnectionId: string;
    providerAccountId?: string;
    providerInstallationId?: string;
    providerProfileId?: string;
    providerProfileType?: "platform" | "organization";
    routeKey?: string;
  } | null> => {
    const connections = await ctx.db
      .query("oauthConnections")
      .filter((q) => q.eq(q.field("provider"), "whatsapp"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const match = connections.find((c) => {
      const meta = c.customProperties as Record<string, unknown>;
      return meta?.phoneNumberId === args.phoneNumberId;
    });

    if (!match) {
      return null;
    }

    const metadata = (match.customProperties || {}) as Record<string, unknown>;
    const providerInstallationId =
      normalizeOptionalString(match.providerInstallationId) ||
      normalizeOptionalString(metadata.providerInstallationId) ||
      normalizeOptionalString(metadata.installationId);
    const providerAccountId =
      normalizeOptionalString(match.providerAccountId) ||
      normalizeOptionalString(metadata.providerAccountId);
    const routeKey =
      normalizeOptionalString((match as Record<string, unknown>).providerRouteKey) ||
      normalizeOptionalString(metadata.providerRouteKey) ||
      normalizeOptionalString(metadata.routeKey) ||
      (providerInstallationId ? `whatsapp:${providerInstallationId}` : undefined);

    return {
      organizationId: match.organizationId,
      providerConnectionId: String(match._id),
      providerAccountId,
      providerInstallationId,
      providerProfileId:
        normalizeOptionalString(match.providerProfileId) ||
        normalizeOptionalString(metadata.providerProfileId) ||
        normalizeOptionalString(metadata.appProfileId),
      providerProfileType:
        normalizeProviderProfileType(match.providerProfileType) ||
        normalizeProviderProfileType(metadata.providerProfileType) ||
        normalizeProviderProfileType(metadata.profileType),
      routeKey,
    };
  },
});

/**
 * Resolve organization from Slack team ID.
 * Looks up active Slack oauthConnections where providerAccountId is the team ID.
 */
export const resolveOrgFromSlackTeamId = internalQuery({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("oauthConnections")
      .withIndex("by_provider_account", (q) =>
        q.eq("provider", "slack").eq("providerAccountId", args.teamId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (connections.length !== 1) {
      return null;
    }

    return connections[0].organizationId;
  },
});

/**
 * Resolve Slack webhook verification context from team/app identity.
 * Returns installation/profile hints plus scoped signing-secret candidates.
 */
export const resolveSlackWebhookVerificationContext = internalQuery({
  args: {
    teamId: v.optional(v.string()),
    appId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    organizationId: Id<"organizations">;
    teamId?: string;
    providerConnectionId: string;
    providerAccountId?: string;
    providerInstallationId?: string;
    providerProfileId?: string;
    providerProfileType?: "platform" | "organization";
    routeKey?: string;
    signingSecrets: string[];
  } | null> => {
    const teamId = normalizeOptionalString(args.teamId);
    const appId = normalizeOptionalString(args.appId);

    if (!teamId && !appId) {
      return null;
    }

    type SlackOauthConnection = {
      _id: Id<"oauthConnections">;
      organizationId: Id<"organizations">;
      providerAccountId?: string;
      providerInstallationId?: string;
      providerProfileId?: string;
      providerProfileType?: "platform" | "organization";
      customProperties?: unknown;
    };

    let candidates: SlackOauthConnection[] = [];

    if (teamId) {
      const byTeam = await ctx.db
        .query("oauthConnections")
        .withIndex("by_provider_account", (q) =>
          q.eq("provider", "slack").eq("providerAccountId", teamId)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      candidates = byTeam as unknown as SlackOauthConnection[];
    } else {
      const activeConnections = await ctx.db
        .query("oauthConnections")
        .filter((q) => q.eq(q.field("provider"), "slack"))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      candidates = activeConnections as unknown as SlackOauthConnection[];
    }

    if (candidates.length === 0) {
      return null;
    }

    const scopedCandidates = appId
      ? candidates.filter((candidate) => {
          const metadata = (candidate.customProperties || {}) as Record<
            string,
            unknown
          >;
          return normalizeOptionalString(metadata.appId) === appId;
        })
      : candidates;

    if (scopedCandidates.length === 0) {
      return null;
    }

    const contexts = scopedCandidates.map((connection) => {
      const metadata = (connection.customProperties || {}) as Record<
        string,
        unknown
      >;
      const providerProfileId =
        normalizeOptionalString(connection.providerProfileId) ||
        normalizeOptionalString(metadata.providerProfileId) ||
        normalizeOptionalString(metadata.appProfileId);
      const providerProfileType =
        normalizeProviderProfileType(connection.providerProfileType) ||
        normalizeProviderProfileType(metadata.providerProfileType) ||
        normalizeProviderProfileType(metadata.profileType);

      const explicitSecrets = uniqueSecretCandidates([
        normalizeOptionalString(metadata.slackSigningSecret),
        normalizeOptionalString(metadata.signingSecret),
        normalizeOptionalString(metadata.slackSigningSecretPrevious),
        normalizeOptionalString(metadata.signingSecretPrevious),
        ...normalizeStringArray(metadata.slackSigningSecretCandidates),
        ...normalizeStringArray(metadata.signingSecretCandidates),
      ]);

      const allowPlatformEnvFallback =
        providerProfileType === "platform" ||
        (providerProfileId?.startsWith("platform:") ?? false) ||
        providerProfileId === "slack_app:organization_default";

      const signingSecrets = allowPlatformEnvFallback
        ? uniqueSecretCandidates([
            ...explicitSecrets,
            process.env.SLACK_SIGNING_SECRET,
            process.env.SLACK_SIGNING_SECRET_PREVIOUS,
          ])
        : explicitSecrets;

      return {
        organizationId: connection.organizationId,
        teamId: normalizeOptionalString(connection.providerAccountId) || teamId,
        providerConnectionId: String(connection._id),
        providerAccountId:
          normalizeOptionalString(connection.providerAccountId) || teamId,
        providerInstallationId:
          normalizeOptionalString(connection.providerInstallationId) ||
          normalizeOptionalString(metadata.providerInstallationId) ||
          normalizeOptionalString(metadata.installationId),
        providerProfileId,
        providerProfileType,
        routeKey:
          normalizeOptionalString(
            (connection as Record<string, unknown>).providerRouteKey
          ) ||
          normalizeOptionalString(metadata.providerRouteKey) ||
          normalizeOptionalString(metadata.routeKey) ||
          (teamId ? `slack:${teamId}` : undefined),
        signingSecrets,
      };
    });

    const contextsWithSigningSecrets = contexts.filter(
      (context) => context.signingSecrets.length > 0
    );
    const resolution = resolveSingleTenantContext(
      contextsWithSigningSecrets.length > 0
        ? contextsWithSigningSecrets
        : contexts
    );

    if (resolution.status !== "resolved") {
      return null;
    }

    if (resolution.context.signingSecrets.length === 0) {
      return null;
    }

    return resolution.context;
  },
});

export const recordWebhookEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    provider: v.string(),
    endpoint: v.string(),
    eventName: v.string(),
    eventStatus: v.union(
      v.literal("success"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("skipped")
    ),
    outcome: v.union(
      v.literal("accepted"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("skipped")
    ),
    message: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    providerEventId: v.optional(v.string()),
    providerConnectionId: v.optional(v.string()),
    providerAccountId: v.optional(v.string()),
    routeKey: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    channel: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    processedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const processedAt = args.processedAt ?? now;
    const baseProperties: Record<string, unknown> = {
      provider: args.provider,
      endpoint: args.endpoint,
      eventName: args.eventName,
      eventStatus: args.eventStatus,
      outcome: args.outcome,
      processedAt,
    };

    if (args.message) {
      baseProperties.message = args.message;
    }
    if (args.errorMessage) {
      baseProperties.errorMessage = args.errorMessage;
    }
    if (args.providerEventId) {
      baseProperties.providerEventId = args.providerEventId;
    }
    if (args.providerConnectionId) {
      baseProperties.providerConnectionId = args.providerConnectionId;
    }
    if (args.providerAccountId) {
      baseProperties.providerAccountId = args.providerAccountId;
    }
    if (args.routeKey) {
      baseProperties.routeKey = args.routeKey;
    }
    if (args.sessionId) {
      baseProperties.sessionId = args.sessionId;
    }
    if (args.channel) {
      baseProperties.channel = args.channel;
    }
    if (args.metadata) {
      for (const [key, value] of Object.entries(args.metadata)) {
        baseProperties[key] = value;
      }
    }

    await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "webhook_event",
      subtype: args.provider,
      name: args.eventName,
      description: args.message,
      status: args.eventStatus,
      customProperties: baseProperties,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Verify WhatsApp webhook HMAC signature.
 * Runs as internalAction because it needs Node.js crypto (via "use node" in encryption module).
 */
export const verifyWhatsAppSignature = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (_ctx, args): Promise<boolean> => {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error("[WhatsApp] META_APP_SECRET not set; rejecting webhook");
      return false;
    }

    return verifyWhatsAppWebhookSignature({
      payload: args.payload,
      signatureHeader: normalizeOptionalString(args.signature) || undefined,
      appSecret,
    });
  },
});

/**
 * Process an inbound WhatsApp webhook from Meta Cloud API.
 * Resolves org, normalizes payload, feeds into agent pipeline.
 */
export const processWhatsAppWebhook = internalAction({
  args: {
    payload: v.string(),
    phoneNumberId: v.string(),
  },
  handler: async (ctx, args): Promise<{ status: string; message?: string; response?: string }> => {
    const provider = getProvider("whatsapp");
    if (!provider) {
      console.error("[WhatsApp] Provider not registered");
      return { status: "error", message: "WhatsApp provider not registered" };
    }

    // 1. Resolve organization from phone_number_id
    const whatsappRoutingContext = await (ctx.runQuery as Function)(
      internalApi.channels.webhooks.resolveOrgFromWhatsAppPhoneNumberId,
      { phoneNumberId: args.phoneNumberId }
    ) as {
      organizationId: Id<"organizations">;
      providerConnectionId: string;
      providerAccountId?: string;
      providerInstallationId?: string;
      providerProfileId?: string;
      providerProfileType?: "platform" | "organization";
      routeKey?: string;
    } | null;
    const organizationId = whatsappRoutingContext?.organizationId ?? null;

    if (!organizationId) {
      console.error(`[WhatsApp] No org found for phone_number_id ${args.phoneNumberId}`);
      return { status: "error", message: "Unknown WhatsApp phone number" };
    }

    // 2. Normalize inbound message
    let rawPayload: Record<string, unknown>;
    try {
      rawPayload = JSON.parse(args.payload) as Record<string, unknown>;
    } catch {
      await recordWebhookIngressOutcome(ctx, {
        organizationId,
        provider: "whatsapp",
        endpoint: "webhooks/whatsapp",
        action: "normalized",
        status: "error",
        message: "Invalid JSON payload",
        errorMessage: "Invalid JSON payload",
        providerConnectionId: whatsappRoutingContext?.providerConnectionId,
        providerAccountId: whatsappRoutingContext?.providerAccountId,
        routeKey: whatsappRoutingContext?.routeKey,
        metadata: {
          phoneNumberId: args.phoneNumberId,
        },
      });
      return { status: "error", message: "Invalid JSON payload" };
    }

    await recordWebhookIngressOutcome(ctx, {
      organizationId,
      provider: "whatsapp",
      endpoint: "webhooks/whatsapp",
      action: "received",
      status: "success",
      message: "WhatsApp webhook accepted",
      providerConnectionId: whatsappRoutingContext?.providerConnectionId,
      providerAccountId: whatsappRoutingContext?.providerAccountId,
      routeKey: whatsappRoutingContext?.routeKey,
      metadata: {
        phoneNumberId: args.phoneNumberId,
      },
    });

    const normalized = provider.normalizeInbound(rawPayload, {} as ProviderCredentials);

    if (!normalized) {
      // Could be a status update, not a message — silently skip
      await recordWebhookIngressOutcome(ctx, {
        organizationId,
        provider: "whatsapp",
        endpoint: "webhooks/whatsapp",
        action: "normalized",
        status: "skipped",
        message: "Not an inbound text message",
        providerConnectionId: whatsappRoutingContext?.providerConnectionId,
        providerAccountId: whatsappRoutingContext?.providerAccountId,
        routeKey: whatsappRoutingContext?.routeKey,
        metadata: {
          phoneNumberId: args.phoneNumberId,
        },
      });
      return { status: "skipped", message: "Not an inbound text message" };
    }

    // 3. Feed into agent execution pipeline
    // The pipeline's step 13 handles outbound delivery via channels.router.sendMessage,
    // which routes back through whatsappProvider.sendMessage.
    try {
      const result = (await (ctx.runAction as Function)(
        api.ai.agentExecution.processInboundMessage,
        {
          organizationId,
          channel: normalized.channel,
          externalContactIdentifier: normalized.externalContactIdentifier,
          message: normalized.message,
          metadata: {
            ...normalized.metadata,
            providerConnectionId: whatsappRoutingContext?.providerConnectionId,
            providerAccountId: whatsappRoutingContext?.providerAccountId,
            providerInstallationId: whatsappRoutingContext?.providerInstallationId,
            providerProfileId: whatsappRoutingContext?.providerProfileId,
            providerProfileType: whatsappRoutingContext?.providerProfileType,
            routeKey: whatsappRoutingContext?.routeKey,
            channelRef: args.phoneNumberId,
            providerChannelId: args.phoneNumberId,
          },
        }
      )) as { status: string; response?: string; message?: string };

      await recordWebhookIngressOutcome(ctx, {
        organizationId,
        provider: "whatsapp",
        endpoint: "webhooks/whatsapp",
        action: "processed",
        status: result.status,
        message: result.message,
        providerEventId:
          normalizeOptionalString(normalized.metadata.providerEventId) ||
          normalizeOptionalString(normalized.metadata.providerMessageId),
        providerConnectionId: whatsappRoutingContext?.providerConnectionId,
        providerAccountId: whatsappRoutingContext?.providerAccountId,
        routeKey: whatsappRoutingContext?.routeKey,
        channel: normalized.channel,
      });

      return result;
    } catch (error) {
      console.error("[WhatsApp] Agent pipeline error:", error);
      await recordWebhookIngressOutcome(ctx, {
        organizationId,
        provider: "whatsapp",
        endpoint: "webhooks/whatsapp",
        action: "processed",
        status: "error",
        message: "WhatsApp pipeline error",
        errorMessage: String(error),
        providerConnectionId: whatsappRoutingContext?.providerConnectionId,
        providerAccountId: whatsappRoutingContext?.providerAccountId,
        routeKey: whatsappRoutingContext?.routeKey,
      });
      return { status: "error", message: String(error) };
    }
  },
});

/**
 * Process an inbound Chatwoot webhook.
 * Verifies signature, normalizes the payload, feeds into agent pipeline,
 * then sends the agent's reply back through Chatwoot.
 */
export const processChatwootWebhook = internalAction({
  args: {
    payload: v.string(),
    webhookToken: v.string(),
    chatwootAccountId: v.number(),
  },
  handler: async (ctx, args): Promise<{ status: string; message?: string; response?: string }> => {
    const provider = getProvider("chatwoot");
    if (!provider) {
      console.error("[Chatwoot] Provider not registered");
      return { status: "error", message: "Chatwoot provider not registered" };
    }

    // 1. Resolve organization
    const organizationId = await (ctx.runQuery as Function)(
      internalApi.channels.webhooks.resolveOrgFromChatwootAccount,
      { chatwootAccountId: args.chatwootAccountId }
    ) as Id<"organizations"> | null;

    if (!organizationId) {
      console.error(
        `[Chatwoot] No org found for account ${args.chatwootAccountId}`
      );
      return { status: "error", message: "Unknown Chatwoot account" };
    }

    // 2. Get credentials for verification
    const credentials = (await (ctx.runQuery as Function)(
      internalApi.channels.router.getProviderCredentials,
      { organizationId, providerId: "chatwoot" }
    )) as ProviderCredentials | null;

    // 3. Verify webhook signature
    if (credentials) {
      const headers = { "x-chatwoot-webhook-token": args.webhookToken };
      if (!provider.verifyWebhook(args.payload, headers, credentials)) {
        console.error("[Chatwoot] Webhook verification failed");
        return { status: "error", message: "Verification failed" };
      }
    }

    // 4. Normalize inbound message
    const rawPayload = JSON.parse(args.payload);
    const normalized = provider.normalizeInbound(
      rawPayload,
      credentials || ({} as ProviderCredentials)
    );

    if (!normalized) {
      return { status: "skipped", message: "Not an inbound message event" };
    }

    // 5. Feed into agent execution pipeline
    const result = (await (ctx.runAction as Function)(
      api.ai.agentExecution.processInboundMessage,
      {
        organizationId,
        channel: normalized.channel,
        externalContactIdentifier: normalized.externalContactIdentifier,
        message: normalized.message,
        metadata: normalized.metadata,
      }
    )) as { status: string; response?: string; message?: string };

    // 6. Send agent response back through Chatwoot
    if (result.status === "success" && result.response) {
      await (ctx.runAction as Function)(internalApi.channels.router.sendMessage, {
        organizationId,
        channel: normalized.channel,
        recipientIdentifier: normalized.externalContactIdentifier,
        content: result.response,
        providerConversationId:
          normalized.metadata.providerConversationId,
      });
    }

    return result;
  },
});

/**
 * Process an inbound Slack Events API payload.
 * Uses provider normalization, then feeds into the shared agent pipeline.
 */
export function buildSlackEventIdempotencyKey(args: {
  organizationId: string;
  providerEventId?: string;
  nowMs?: number;
}): string {
  if (args.providerEventId) {
    return `slack:${args.organizationId}:${args.providerEventId}`;
  }
  return `slack:${args.organizationId}:${args.nowMs ?? Date.now()}`;
}

export function buildSlackSlashCommandIdempotencyKey(args: {
  organizationId: string;
  providerEventId: string;
}): string {
  return `slack:${args.organizationId}:slash:${args.providerEventId}`;
}

type SlackVacationIntakeStatus = "ready_for_policy_evaluation" | "blocked";
type SlackVacationPolicyPrerequisiteStatus = "resolved" | "missing" | "ambiguous";
type SlackVacationEvaluationVerdict =
  | "approved"
  | "conflict"
  | "denied"
  | "blocked";

type PersistedSlackVacationRequestEnvelope = {
  requestObjectId: string;
  intakeStatus: SlackVacationIntakeStatus;
  policyPrerequisiteStatus: SlackVacationPolicyPrerequisiteStatus;
  failClosed: boolean;
  blockedReasons: string[];
  reusedExisting: boolean;
  evaluationVerdict?: SlackVacationEvaluationVerdict;
  evaluationReasonCodes?: string[];
};

function normalizeSlackVacationSource(
  value: unknown
): SlackVacationRequestParseResult["source"] | undefined {
  if (value === "mention" || value === "message" || value === "slash_command") {
    return value;
  }
  return undefined;
}

function normalizeSlackVacationStatus(
  value: unknown
): SlackVacationRequestParseResult["status"] | undefined {
  if (value === "parsed" || value === "blocked") {
    return value;
  }
  return undefined;
}

function normalizeSlackVacationIntent(
  value: unknown
): SlackVacationRequestParseResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as Record<string, unknown>;
  if (parsed.intent !== "vacation_request") {
    return null;
  }

  const source = normalizeSlackVacationSource(parsed.source);
  const status = normalizeSlackVacationStatus(parsed.status);
  const rawText = normalizeOptionalString(parsed.rawText);
  if (!source || !status || !rawText) {
    return null;
  }

  return {
    intent: "vacation_request",
    parserVersion:
      typeof parsed.parserVersion === "number" && Number.isFinite(parsed.parserVersion)
        ? parsed.parserVersion
        : 1,
    source,
    status,
    rawText,
    requestedStartDate: normalizeOptionalString(parsed.requestedStartDate),
    requestedEndDate: normalizeOptionalString(parsed.requestedEndDate),
    blockedReasons: normalizeStringArray(parsed.blockedReasons),
    commandName: normalizeOptionalString(parsed.commandName),
  };
}

function normalizeSlackVacationIntakeStatus(
  value: unknown
): SlackVacationIntakeStatus | undefined {
  if (value === "ready_for_policy_evaluation" || value === "blocked") {
    return value;
  }
  return undefined;
}

function normalizeSlackVacationPolicyPrerequisiteStatus(
  value: unknown
): SlackVacationPolicyPrerequisiteStatus | undefined {
  if (value === "resolved" || value === "missing" || value === "ambiguous") {
    return value;
  }
  return undefined;
}

function normalizeSlackVacationEvaluationVerdict(
  value: unknown
): SlackVacationEvaluationVerdict | undefined {
  if (
    value === "approved" ||
    value === "conflict" ||
    value === "denied" ||
    value === "blocked"
  ) {
    return value;
  }
  return undefined;
}

function dedupeStringValues(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function buildSlackVacationRequestName(args: {
  requester: string;
  startDate?: string;
  endDate?: string;
}): string {
  const requester = args.requester.trim() || "unknown";
  if (args.startDate && args.endDate) {
    return `Slack vacation request ${requester} ${args.startDate}..${args.endDate}`;
  }
  return `Slack vacation request ${requester} undated`;
}

function slackPolicyMatchesRoute(args: {
  policyObject: Record<string, unknown>;
  providerConnectionId?: string;
  teamId?: string;
  routeKey?: string;
}): boolean {
  const customProperties = args.policyObject.customProperties as
    | Record<string, unknown>
    | undefined;
  const integrations = customProperties?.integrations as
    | Record<string, unknown>
    | undefined;
  const slackIntegration = integrations?.slack as Record<string, unknown> | undefined;
  if (!slackIntegration || typeof slackIntegration !== "object") {
    return true;
  }

  const policyConnectionId = normalizeOptionalString(
    slackIntegration.providerConnectionId
  );
  const policyTeamId = normalizeOptionalString(slackIntegration.teamId);
  const policyRouteKey = normalizeOptionalString(slackIntegration.routeKey);

  if (
    policyConnectionId &&
    args.providerConnectionId &&
    policyConnectionId !== args.providerConnectionId
  ) {
    return false;
  }
  if (policyTeamId && args.teamId && policyTeamId !== args.teamId) {
    return false;
  }
  if (policyRouteKey && args.routeKey && policyRouteKey !== args.routeKey) {
    return false;
  }

  return true;
}

async function persistSlackVacationRequestEnvelopeIfPresent(
  ctx: unknown,
  args: {
    organizationId: Id<"organizations">;
    normalizedMetadata: Record<string, unknown>;
    externalContactIdentifier: string;
    message: string;
    idempotencyKey: string;
    providerEventId?: string;
    providerMessageId?: string;
    providerConversationId?: string;
    providerConnectionId?: string;
    providerAccountId?: string;
    providerInstallationId?: string;
    providerProfileId?: string;
    providerProfileType?: "platform" | "organization";
    routeKey?: string;
    receivedAt?: number;
    fallbackTeamId?: string;
    fallbackUserName?: string;
  }
): Promise<PersistedSlackVacationRequestEnvelope | null> {
  const vacationIntent = normalizeSlackVacationIntent(
    args.normalizedMetadata.slackVacationRequest
  );
  if (!vacationIntent) {
    return null;
  }

  const teamId =
    normalizeOptionalString(args.fallbackTeamId) ||
    normalizeOptionalString(args.normalizedMetadata.slackTeamId) ||
    normalizeOptionalString(args.providerAccountId);
  const channelId = normalizeOptionalString(args.normalizedMetadata.slackChannelId);
  const userId = normalizeOptionalString(args.normalizedMetadata.slackUserId);
  const requesterDisplayName =
    normalizeOptionalString(args.fallbackUserName) ||
    normalizeOptionalString(args.normalizedMetadata.senderName) ||
    userId ||
    "unknown";
  const blockedReasons = new Set<string>(
    vacationIntent.status === "blocked" ? vacationIntent.blockedReasons : []
  );

  if (!teamId) {
    blockedReasons.add("missing_slack_team_id");
  }
  if (!channelId) {
    blockedReasons.add("missing_slack_channel_id");
  }
  if (!userId) {
    blockedReasons.add("missing_slack_user_id");
  }
  if (!args.providerConnectionId) {
    blockedReasons.add("missing_provider_connection_id");
  }
  if (!args.providerAccountId) {
    blockedReasons.add("missing_provider_account_id");
  }
  if (teamId && args.providerAccountId && teamId !== args.providerAccountId) {
    blockedReasons.add("provider_account_team_mismatch");
  }
  if (!args.routeKey) {
    blockedReasons.add("missing_route_key");
  }

  const existingRequests = (await (ctx as any).runQuery(
    internalApi.channels.router.listObjectsByOrgTypeInternal,
    {
      organizationId: args.organizationId,
      type: "vacation_request",
    }
  )) as Array<Record<string, unknown>>;
  const existing = existingRequests.find((request) => {
    const props = request.customProperties as Record<string, unknown> | undefined;
    const existingIdempotencyKey = normalizeOptionalString(props?.idempotencyKey);
    const existingSource = normalizeOptionalString(props?.source);
    return existingSource === "slack" && existingIdempotencyKey === args.idempotencyKey;
  });

  if (existing) {
    const props = existing.customProperties as Record<string, unknown> | undefined;
    const intakeStatus =
      normalizeSlackVacationIntakeStatus(props?.intakeStatus) || "blocked";
    const policyPrerequisiteStatus =
      normalizeSlackVacationPolicyPrerequisiteStatus(
        props?.policyPrerequisiteStatus
      ) || "missing";
    return {
      requestObjectId: String(existing._id),
      intakeStatus,
      policyPrerequisiteStatus,
      failClosed: props?.failClosed === true || intakeStatus === "blocked",
      blockedReasons: dedupeStringValues(
        normalizeStringArray(props?.blockedReasons)
      ),
      reusedExisting: true,
      evaluationVerdict: normalizeSlackVacationEvaluationVerdict(
        props?.policyEvaluationVerdict
      ),
      evaluationReasonCodes: dedupeStringValues(
        normalizeStringArray(props?.policyEvaluationReasonCodes)
      ),
    };
  }

  const policies = (await (ctx as any).runQuery(
    internalApi.channels.router.listObjectsByOrgTypeInternal,
    {
      organizationId: args.organizationId,
      type: "vacation_policy",
    }
  )) as Array<Record<string, unknown>>;
  const activePolicies = policies.filter(
    (policy) => normalizeOptionalString(policy.status) === "active"
  );
  const matchedPolicies = activePolicies.filter((policy) =>
    slackPolicyMatchesRoute({
      policyObject: policy,
      providerConnectionId: args.providerConnectionId,
      teamId,
      routeKey: args.routeKey,
    })
  );

  let policyPrerequisiteStatus: SlackVacationPolicyPrerequisiteStatus = "resolved";
  if (activePolicies.length === 0 || matchedPolicies.length === 0) {
    policyPrerequisiteStatus = "missing";
    blockedReasons.add("missing_matching_vacation_policy");
  } else if (matchedPolicies.length > 1) {
    policyPrerequisiteStatus = "ambiguous";
    blockedReasons.add("ambiguous_matching_vacation_policy");
  }

  const resolvedPolicyObjectId =
    policyPrerequisiteStatus === "resolved" ? matchedPolicies[0]?._id : undefined;
  let evaluationVerdict: SlackVacationEvaluationVerdict | undefined;
  let evaluationReasonCodes: string[] = [];
  let evaluationSnapshot: Record<string, unknown> | undefined;
  if (
    resolvedPolicyObjectId &&
    vacationIntent.requestedStartDate &&
    vacationIntent.requestedEndDate
  ) {
    const evaluation = (await (ctx as any).runAction(
      internalApi.bookingOntology.evaluatePharmacistVacationRequestInternal,
      {
        organizationId: args.organizationId,
        policyObjectId: resolvedPolicyObjectId,
        requestedStartDate: vacationIntent.requestedStartDate,
        requestedEndDate: vacationIntent.requestedEndDate,
        requesterSlackUserId: userId,
      }
    )) as Record<string, unknown>;
    evaluationVerdict = normalizeSlackVacationEvaluationVerdict(evaluation.verdict);
    evaluationReasonCodes = dedupeStringValues(
      normalizeStringArray(evaluation.reasonCodes)
    );
    evaluationSnapshot = (evaluation.evaluationSnapshot ||
      undefined) as Record<string, unknown> | undefined;
    for (const reason of normalizeStringArray(evaluation.blockedReasons)) {
      blockedReasons.add(reason);
    }
  } else if (policyPrerequisiteStatus === "resolved") {
    blockedReasons.add("missing_requested_date_range");
  }

  const blockedReasonList = dedupeStringValues(Array.from(blockedReasons));
  const intakeStatus: SlackVacationIntakeStatus =
    blockedReasonList.length > 0 ? "blocked" : "ready_for_policy_evaluation";
  const resolvedPolicyObjectIdString = resolvedPolicyObjectId
    ? String(resolvedPolicyObjectId)
    : undefined;
  const now = Date.now();
  const requestObjectId = (await (ctx as any).runMutation(
    internalApi.channels.router.insertObjectInternal,
    {
      organizationId: args.organizationId,
      type: "vacation_request",
      subtype: "pharmacist_pto_v1",
      name: buildSlackVacationRequestName({
        requester: requesterDisplayName,
        startDate: vacationIntent.requestedStartDate,
        endDate: vacationIntent.requestedEndDate,
      }),
      status: "pending",
      customProperties: {
        source: "slack",
        envelopeVersion: 1,
        idempotencyKey: args.idempotencyKey,
        parser: vacationIntent,
        sourceMetadata: {
          teamId,
          channelId,
          eventId: args.providerEventId,
          messageTs: args.providerMessageId,
          threadTs: args.providerConversationId,
        },
        requester: {
          slackUserId: userId,
          displayName: requesterDisplayName,
          externalId:
            teamId && userId ? `slack:${teamId}:${userId}` : undefined,
        },
        requestedStartDate: vacationIntent.requestedStartDate,
        requestedEndDate: vacationIntent.requestedEndDate,
        intakeStatus,
        failClosed: intakeStatus === "blocked",
        blockedReasons: blockedReasonList,
        policyPrerequisiteStatus,
        policyObjectId: resolvedPolicyObjectIdString,
        policyCandidateObjectIds:
          policyPrerequisiteStatus === "resolved" && resolvedPolicyObjectIdString
            ? [resolvedPolicyObjectIdString]
            : matchedPolicies.map((policy) => String(policy._id)),
        policyEvaluationVerdict: evaluationVerdict,
        policyEvaluationReasonCodes: evaluationReasonCodes,
        evaluationSnapshot,
        ingress: {
          receivedAt: args.receivedAt ?? now,
          externalContactIdentifier: args.externalContactIdentifier,
          message: args.message,
          providerEventId: args.providerEventId,
          providerMessageId: args.providerMessageId,
          providerConversationId: args.providerConversationId,
          providerConnectionId: args.providerConnectionId,
          providerAccountId: args.providerAccountId,
          providerInstallationId: args.providerInstallationId,
          providerProfileId: args.providerProfileId,
          providerProfileType: args.providerProfileType,
          routeKey: args.routeKey,
        },
      },
      createdAt: now,
      updatedAt: now,
    }
  )) as Id<"objects">;

  return {
    requestObjectId: String(requestObjectId),
    intakeStatus,
    policyPrerequisiteStatus,
    failClosed: intakeStatus === "blocked",
    blockedReasons: blockedReasonList,
    reusedExisting: false,
    evaluationVerdict,
    evaluationReasonCodes,
  };
}

export const processSlackEvent = internalAction({
  args: {
    payload: v.string(),
    eventId: v.optional(v.string()),
    teamId: v.optional(v.string()),
    providerConnectionId: v.optional(v.string()),
    providerAccountId: v.optional(v.string()),
    providerInstallationId: v.optional(v.string()),
    providerProfileId: v.optional(v.string()),
    providerProfileType: v.optional(
      v.union(v.literal("platform"), v.literal("organization"))
    ),
    routeKey: v.optional(v.string()),
    retryNum: v.optional(v.number()),
    retryReason: v.optional(v.string()),
    signatureTimestamp: v.optional(v.number()),
    receivedAt: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ status: string; message?: string; response?: string }> => {
    const provider = getProvider("slack");
    if (!provider) {
      console.error("[Slack] Provider not registered");
      return { status: "error", message: "Slack provider not registered" };
    }

    let rawPayload: Record<string, unknown>;
    try {
      rawPayload = JSON.parse(args.payload) as Record<string, unknown>;
    } catch {
      return { status: "error", message: "Invalid JSON payload" };
    }

    if (rawPayload.type !== "event_callback") {
      return { status: "skipped", message: "Unsupported Slack payload type" };
    }

    const teamId =
      args.teamId ||
      (rawPayload.team_id as string | undefined) ||
      (rawPayload.authorizations as Array<Record<string, unknown>> | undefined)?.[0]
        ?.team_id as string | undefined;
    if (!teamId) {
      return { status: "error", message: "Missing Slack team ID" };
    }

    let organizationId = await resolveSlackOrganizationFromConnection({
      ctx,
      providerConnectionId: args.providerConnectionId,
      teamId,
    });
    if (!organizationId) {
      organizationId = (await (ctx.runQuery as Function)(
        internalApi.channels.webhooks.resolveOrgFromSlackTeamId,
        { teamId }
      )) as Id<"organizations"> | null;
    }

    if (!organizationId) {
      console.error(`[Slack] No org found for team ${teamId}`);
      return { status: "error", message: "Unknown Slack workspace" };
    }

    const credentials = (await (ctx.runQuery as Function)(
      internalApi.channels.router.getProviderCredentials,
      {
        organizationId,
        providerId: "slack",
        providerConnectionId: args.providerConnectionId,
        providerAccountId:
          args.providerAccountId || teamId,
        providerInstallationId: args.providerInstallationId,
        providerProfileId: args.providerProfileId,
        providerProfileType: args.providerProfileType,
        routeKey: args.routeKey,
      }
    )) as ProviderCredentials | null;

    const normalized = provider.normalizeInbound(
      rawPayload,
      credentials || ({} as ProviderCredentials)
    );
    if (!normalized) {
      await recordWebhookIngressOutcome(ctx, {
        organizationId,
        provider: "slack",
        endpoint: "integrations/slack/events",
        action: "normalized",
        status: "skipped",
        message: "Not an inbound Slack message event",
        providerEventId:
          args.eventId || (rawPayload.event_id as string | undefined) || undefined,
        providerConnectionId: args.providerConnectionId,
        providerAccountId: args.providerAccountId || teamId,
        routeKey: args.routeKey,
      });
      return { status: "skipped", message: "Not an inbound Slack message event" };
    }

    const providerEventId =
      args.eventId ||
      (rawPayload.event_id as string | undefined) ||
      normalized.metadata.providerEventId ||
      normalized.metadata.providerMessageId;
    const idempotencyKey = buildSlackEventIdempotencyKey({
      organizationId,
      providerEventId,
      nowMs: Date.now(),
    });
    const resolvedProviderConnectionId =
      args.providerConnectionId ||
      normalizeOptionalString(credentials?.providerConnectionId);
    const resolvedProviderAccountId =
      args.providerAccountId ||
      normalizeOptionalString(credentials?.providerAccountId) ||
      teamId;
    const resolvedProviderInstallationId =
      args.providerInstallationId ||
      normalizeOptionalString(credentials?.providerInstallationId);
    const resolvedProviderProfileId =
      args.providerProfileId ||
      normalizeOptionalString(credentials?.providerProfileId);
    const resolvedProviderProfileType =
      args.providerProfileType ||
      normalizeProviderProfileType(credentials?.providerProfileType);
    const resolvedRouteKey =
      args.routeKey ||
      normalizeOptionalString(credentials?.bindingRouteKey) ||
      (resolvedProviderAccountId ? `slack:${resolvedProviderAccountId}` : undefined);

    const vacationRequestEnvelope =
      await persistSlackVacationRequestEnvelopeIfPresent(ctx, {
        organizationId,
        normalizedMetadata: normalized.metadata as Record<string, unknown>,
        externalContactIdentifier: normalized.externalContactIdentifier,
        message: normalized.message,
        idempotencyKey,
        providerEventId,
        providerMessageId: normalizeOptionalString(normalized.metadata.providerMessageId),
        providerConversationId: normalizeOptionalString(
          normalized.metadata.providerConversationId
        ),
        providerConnectionId: resolvedProviderConnectionId,
        providerAccountId: resolvedProviderAccountId,
        providerInstallationId: resolvedProviderInstallationId,
        providerProfileId: resolvedProviderProfileId,
        providerProfileType: resolvedProviderProfileType,
        routeKey: resolvedRouteKey,
        receivedAt: args.receivedAt,
        fallbackTeamId: teamId,
      });

    try {
      const result = (await (ctx.runAction as Function)(
        api.ai.agentExecution.processInboundMessage,
        {
          organizationId,
          channel: normalized.channel,
          externalContactIdentifier: normalized.externalContactIdentifier,
          message: normalized.message,
          metadata: {
            ...normalized.metadata,
            providerEventId,
            idempotencyKey,
            providerConnectionId: resolvedProviderConnectionId,
            providerAccountId: resolvedProviderAccountId,
            providerInstallationId: resolvedProviderInstallationId,
            providerProfileId: resolvedProviderProfileId,
            providerProfileType: resolvedProviderProfileType,
            routeKey: resolvedRouteKey,
            slackTeamId: teamId,
            slackRetryNum: args.retryNum,
            slackRetryReason: args.retryReason,
            slackSignatureTimestamp: args.signatureTimestamp,
            slackReceivedAt: args.receivedAt,
            slackVacationRequestObjectId: vacationRequestEnvelope?.requestObjectId,
            slackVacationRequestIntakeStatus: vacationRequestEnvelope?.intakeStatus,
            slackVacationRequestPolicyPrerequisiteStatus:
              vacationRequestEnvelope?.policyPrerequisiteStatus,
            slackVacationRequestFailClosed: vacationRequestEnvelope?.failClosed,
            slackVacationRequestBlockedReasons:
              vacationRequestEnvelope?.blockedReasons,
            slackVacationRequestReusedExisting:
              vacationRequestEnvelope?.reusedExisting,
            slackVacationRequestEvaluationVerdict:
              vacationRequestEnvelope?.evaluationVerdict,
            slackVacationRequestEvaluationReasonCodes:
              vacationRequestEnvelope?.evaluationReasonCodes,
          },
        }
      )) as { status: string; response?: string; message?: string };

      await recordWebhookIngressOutcome(ctx, {
        organizationId,
        provider: "slack",
        endpoint: "integrations/slack/events",
        action: "processed",
        status: result.status,
        message: result.message,
        providerEventId,
        providerConnectionId: resolvedProviderConnectionId,
        providerAccountId: resolvedProviderAccountId,
        routeKey: resolvedRouteKey,
        channel: normalized.channel,
        metadata: vacationRequestEnvelope
          ? {
              vacationRequestObjectId: vacationRequestEnvelope.requestObjectId,
              vacationRequestIntakeStatus: vacationRequestEnvelope.intakeStatus,
              vacationRequestPolicyPrerequisiteStatus:
                vacationRequestEnvelope.policyPrerequisiteStatus,
              vacationRequestFailClosed: vacationRequestEnvelope.failClosed,
              vacationRequestBlockedReasons:
                vacationRequestEnvelope.blockedReasons,
              vacationRequestReusedExisting:
                vacationRequestEnvelope.reusedExisting,
              vacationRequestEvaluationVerdict:
                vacationRequestEnvelope.evaluationVerdict,
              vacationRequestEvaluationReasonCodes:
                vacationRequestEnvelope.evaluationReasonCodes,
            }
          : undefined,
      });

      return result;
    } catch (error) {
      console.error("[Slack] Agent pipeline error:", error);
      await recordWebhookIngressOutcome(ctx, {
        organizationId,
        provider: "slack",
        endpoint: "integrations/slack/events",
        action: "processed",
        status: "error",
        message: "Slack pipeline error",
        errorMessage: String(error),
        providerEventId,
        providerConnectionId: resolvedProviderConnectionId,
        providerAccountId: resolvedProviderAccountId,
        routeKey: resolvedRouteKey,
      });
      return { status: "error", message: String(error) };
    }
  },
});

type SlackHitlQuickAction = {
  action: "takeover" | "resume";
  sessionId: Id<"agentSessions">;
  reason: string;
  note?: string;
};

function parseSlackHitlQuickAction(text?: string): SlackHitlQuickAction | null {
  const normalizedText = text?.trim();
  if (!normalizedText) {
    return null;
  }

  const tokens = normalizedText.split(/\s+/);
  if (tokens.length < 3 || tokens[0].toLowerCase() !== "hitl") {
    return null;
  }

  const actionToken = tokens[1].toLowerCase();
  if (actionToken !== "takeover" && actionToken !== "resume") {
    return null;
  }

  const sessionIdToken = tokens[2]?.trim();
  if (!sessionIdToken) {
    return null;
  }

  const note = tokens.slice(3).join(" ").trim();
  return {
    action: actionToken,
    sessionId: sessionIdToken as Id<"agentSessions">,
    reason:
      actionToken === "takeover"
        ? "slack_takeover_slash_command"
        : "slack_resume_slash_command",
    note: note.length > 0 ? note : undefined,
  };
}

function resolveSlackQuickActionMessage(args: {
  action: "takeover" | "resume";
  status?: string;
}): string {
  if (args.action === "takeover") {
    if (args.status === "taken_over" || args.status === "noop_already_taken_over") {
      return "Takeover is active for this conversation.";
    }
    if (args.status === "invalid_takeover_state") {
      return "Takeover is only valid while escalation is pending.";
    }
    return "Unable to take over this conversation.";
  }

  if (
    args.status === "resumed_after_dismissal" ||
    args.status === "resumed_after_resolution" ||
    args.status === "noop_already_resumed"
  ) {
    return "Agent resumed autonomous handling for this conversation.";
  }
  if (args.status === "invalid_resume_state") {
    return "Resume is only valid for escalated or takeover conversations.";
  }
  return "Unable to resume this conversation.";
}

async function postSlackSlashCommandResponse(responseUrl: string | undefined, text: string): Promise<void> {
  if (!responseUrl || responseUrl.trim().length === 0) {
    return;
  }

  try {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_type: "ephemeral",
        text,
      }),
    });
  } catch (error) {
    console.warn("[Slack] Failed to post slash command response:", error);
  }
}

/**
 * Process an inbound Slack slash command payload.
 * Slash commands are always formatted as top-level channel replies.
 */
export const processSlackSlashCommand = internalAction({
  args: {
    teamId: v.string(),
    channelId: v.string(),
    userId: v.string(),
    userName: v.optional(v.string()),
    command: v.string(),
    text: v.optional(v.string()),
    triggerId: v.optional(v.string()),
    responseUrl: v.optional(v.string()),
    providerConnectionId: v.optional(v.string()),
    providerAccountId: v.optional(v.string()),
    providerInstallationId: v.optional(v.string()),
    providerProfileId: v.optional(v.string()),
    providerProfileType: v.optional(
      v.union(v.literal("platform"), v.literal("organization"))
    ),
    routeKey: v.optional(v.string()),
    retryNum: v.optional(v.number()),
    retryReason: v.optional(v.string()),
    signatureTimestamp: v.optional(v.number()),
    receivedAt: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ status: string; message?: string; response?: string }> => {
    const provider = getProvider("slack");
    if (!provider) {
      console.error("[Slack] Provider not registered");
      return { status: "error", message: "Slack provider not registered" };
    }

    let organizationId = await resolveSlackOrganizationFromConnection({
      ctx,
      providerConnectionId: args.providerConnectionId,
      teamId: args.teamId,
    });
    if (!organizationId) {
      organizationId = (await (ctx.runQuery as Function)(
        internalApi.channels.webhooks.resolveOrgFromSlackTeamId,
        { teamId: args.teamId }
      )) as Id<"organizations"> | null;
    }

    if (!organizationId) {
      console.error(`[Slack] No org found for team ${args.teamId}`);
      return { status: "error", message: "Unknown Slack workspace" };
    }

    const credentials = (await (ctx.runQuery as Function)(
      internalApi.channels.router.getProviderCredentials,
      {
        organizationId,
        providerId: "slack",
        providerConnectionId: args.providerConnectionId,
        providerAccountId: args.providerAccountId || args.teamId,
        providerInstallationId: args.providerInstallationId,
        providerProfileId: args.providerProfileId,
        providerProfileType: args.providerProfileType,
        routeKey: args.routeKey,
      }
    )) as ProviderCredentials | null;

    if (!credentials) {
      await recordWebhookIngressOutcome(ctx, {
        organizationId,
        provider: "slack",
        endpoint: "integrations/slack/commands",
        action: "normalized",
        status: "error",
        message: "Slack credentials unavailable",
        providerConnectionId: args.providerConnectionId,
        providerAccountId: args.providerAccountId || args.teamId,
        routeKey: args.routeKey,
      });
      return { status: "error", message: "Slack credentials unavailable" };
    }

    const providerEventId =
      args.triggerId ||
      `slash:${args.teamId}:${args.channelId}:${args.userId}:${args.receivedAt ?? Date.now()}`;
    const idempotencyKey = buildSlackSlashCommandIdempotencyKey({
      organizationId,
      providerEventId,
    });
    const quickAction = parseSlackHitlQuickAction(args.text);

    if (quickAction) {
      try {
        const quickActionResult = (await (ctx.runMutation as Function)(
          internalApi.ai.escalation.handleProviderQuickActionInternal,
          {
            sessionId: quickAction.sessionId,
            action: quickAction.action,
            source: "slack",
            actorExternalId: `slack:${args.teamId}:${args.userId}`,
            actorLabel: args.userName || args.userId,
            reason: quickAction.reason,
            note: quickAction.note,
          },
        )) as { success?: boolean; status?: string };

        const quickActionMessage = resolveSlackQuickActionMessage({
          action: quickAction.action,
          status: quickActionResult?.status,
        });
        await postSlackSlashCommandResponse(args.responseUrl, quickActionMessage);

        await recordWebhookIngressOutcome(ctx, {
          organizationId,
          provider: "slack",
          endpoint: "integrations/slack/commands",
          action: "processed",
          status: quickActionResult?.success ? "success" : "error",
          message: quickActionMessage,
          providerEventId,
          providerConnectionId: args.providerConnectionId,
          providerAccountId: args.providerAccountId || args.teamId,
          routeKey: args.routeKey,
          channel: "slack",
        });

        return {
          status: quickActionResult?.success ? "success" : "error",
          message: quickActionMessage,
        };
      } catch (error) {
        const fallbackMessage =
          "Unable to process HITL quick action. Use `hitl <takeover|resume> <sessionId>`.";
        await postSlackSlashCommandResponse(args.responseUrl, fallbackMessage);
        console.error("[Slack] HITL quick action failed:", error);
        await recordWebhookIngressOutcome(ctx, {
          organizationId,
          provider: "slack",
          endpoint: "integrations/slack/commands",
          action: "processed",
          status: "error",
          message: fallbackMessage,
          errorMessage: String(error),
          providerEventId,
          providerConnectionId: args.providerConnectionId,
          providerAccountId: args.providerAccountId || args.teamId,
          routeKey: args.routeKey,
          channel: "slack",
        });
        return {
          status: "error",
          message: String(error),
        };
      }
    }

    try {
      const normalized = provider.normalizeInbound(
        {
          type: "slash_command",
          team_id: args.teamId,
          channel_id: args.channelId,
          user_id: args.userId,
          user_name: args.userName,
          command: args.command,
          text: args.text,
          trigger_id: providerEventId,
          event_id: providerEventId,
          response_url: args.responseUrl,
        },
        credentials
      );
      if (!normalized) {
        await recordWebhookIngressOutcome(ctx, {
          organizationId,
          provider: "slack",
          endpoint: "integrations/slack/commands",
          action: "normalized",
          status: "error",
          message: "Unable to normalize Slack slash command payload",
          providerEventId,
          providerConnectionId: args.providerConnectionId,
          providerAccountId: args.providerAccountId || args.teamId,
          routeKey: args.routeKey,
        });
        return {
          status: "error",
          message: "Unable to normalize Slack slash command payload",
        };
      }

      const resolvedProviderConnectionId =
        args.providerConnectionId ||
        normalizeOptionalString(credentials.providerConnectionId);
      const resolvedProviderAccountId =
        args.providerAccountId ||
        normalizeOptionalString(credentials.providerAccountId) ||
        args.teamId;
      const resolvedProviderInstallationId =
        args.providerInstallationId ||
        normalizeOptionalString(credentials.providerInstallationId);
      const resolvedProviderProfileId =
        args.providerProfileId ||
        normalizeOptionalString(credentials.providerProfileId);
      const resolvedProviderProfileType =
        args.providerProfileType ||
        normalizeProviderProfileType(credentials.providerProfileType);
      const resolvedRouteKey =
        args.routeKey ||
        normalizeOptionalString(credentials.bindingRouteKey) ||
        (resolvedProviderAccountId
          ? `slack:${resolvedProviderAccountId}`
          : undefined);

      const vacationRequestEnvelope =
        await persistSlackVacationRequestEnvelopeIfPresent(ctx, {
          organizationId,
          normalizedMetadata: normalized.metadata as Record<string, unknown>,
          externalContactIdentifier: normalized.externalContactIdentifier,
          message: normalized.message,
          idempotencyKey,
          providerEventId,
          providerMessageId: normalizeOptionalString(
            normalized.metadata.providerMessageId
          ),
          providerConversationId: normalizeOptionalString(
            normalized.metadata.providerConversationId
          ),
          providerConnectionId: resolvedProviderConnectionId,
          providerAccountId: resolvedProviderAccountId,
          providerInstallationId: resolvedProviderInstallationId,
          providerProfileId: resolvedProviderProfileId,
          providerProfileType: resolvedProviderProfileType,
          routeKey: resolvedRouteKey,
          receivedAt: args.receivedAt,
          fallbackTeamId: args.teamId,
          fallbackUserName: args.userName,
        });

      const result = (await (ctx.runAction as Function)(
        api.ai.agentExecution.processInboundMessage,
        {
          organizationId,
          channel: normalized.channel,
          externalContactIdentifier: normalized.externalContactIdentifier,
          message: normalized.message,
          metadata: {
            ...normalized.metadata,
            providerEventId,
            providerMessageId:
              normalizeOptionalString(normalized.metadata.providerMessageId) ||
              providerEventId,
            idempotencyKey,
            slackCommand: normalizeOptionalString(normalized.metadata.slackCommand),
            slackCommandText: normalizeOptionalString(
              normalized.metadata.slackCommandText
            ) || "",
            slackUserId:
              normalizeOptionalString(normalized.metadata.slackUserId) || args.userId,
            slackChannelId:
              normalizeOptionalString(normalized.metadata.slackChannelId) ||
              args.channelId,
            slackTeamId: args.teamId,
            providerConnectionId: resolvedProviderConnectionId,
            providerAccountId: resolvedProviderAccountId,
            providerInstallationId: resolvedProviderInstallationId,
            providerProfileId: resolvedProviderProfileId,
            providerProfileType: resolvedProviderProfileType,
            routeKey: resolvedRouteKey,
            slackRetryNum: args.retryNum,
            slackRetryReason: args.retryReason,
            slackSignatureTimestamp: args.signatureTimestamp,
            slackReceivedAt: args.receivedAt,
            slackResponseUrl: args.responseUrl,
            slackVacationRequestObjectId: vacationRequestEnvelope?.requestObjectId,
            slackVacationRequestIntakeStatus: vacationRequestEnvelope?.intakeStatus,
            slackVacationRequestPolicyPrerequisiteStatus:
              vacationRequestEnvelope?.policyPrerequisiteStatus,
            slackVacationRequestFailClosed: vacationRequestEnvelope?.failClosed,
            slackVacationRequestBlockedReasons:
              vacationRequestEnvelope?.blockedReasons,
            slackVacationRequestReusedExisting:
              vacationRequestEnvelope?.reusedExisting,
            slackVacationRequestEvaluationVerdict:
              vacationRequestEnvelope?.evaluationVerdict,
            slackVacationRequestEvaluationReasonCodes:
              vacationRequestEnvelope?.evaluationReasonCodes,
          },
        }
      )) as { status: string; response?: string; message?: string };

      await recordWebhookIngressOutcome(ctx, {
        organizationId,
        provider: "slack",
        endpoint: "integrations/slack/commands",
        action: "processed",
        status: result.status,
        message: result.message,
        providerEventId,
        providerConnectionId: resolvedProviderConnectionId,
        providerAccountId: resolvedProviderAccountId,
        routeKey: resolvedRouteKey,
        channel: "slack",
        metadata: vacationRequestEnvelope
          ? {
              vacationRequestObjectId: vacationRequestEnvelope.requestObjectId,
              vacationRequestIntakeStatus: vacationRequestEnvelope.intakeStatus,
              vacationRequestPolicyPrerequisiteStatus:
                vacationRequestEnvelope.policyPrerequisiteStatus,
              vacationRequestFailClosed: vacationRequestEnvelope.failClosed,
              vacationRequestBlockedReasons:
                vacationRequestEnvelope.blockedReasons,
              vacationRequestReusedExisting:
                vacationRequestEnvelope.reusedExisting,
              vacationRequestEvaluationVerdict:
                vacationRequestEnvelope.evaluationVerdict,
              vacationRequestEvaluationReasonCodes:
                vacationRequestEnvelope.evaluationReasonCodes,
            }
          : undefined,
      });

      return result;
    } catch (error) {
      console.error("[Slack] Slash command pipeline error:", error);
      await recordWebhookIngressOutcome(ctx, {
        organizationId,
        provider: "slack",
        endpoint: "integrations/slack/commands",
        action: "processed",
        status: "error",
        message: "Slack slash command pipeline error",
        errorMessage: String(error),
        providerEventId,
        providerConnectionId:
          args.providerConnectionId ||
          normalizeOptionalString(credentials.providerConnectionId),
        providerAccountId:
          args.providerAccountId ||
          normalizeOptionalString(credentials.providerAccountId) ||
          args.teamId,
        routeKey:
          args.routeKey ||
          normalizeOptionalString(credentials.bindingRouteKey) ||
          `slack:${args.teamId}`,
        channel: "slack",
      });
      return { status: "error", message: String(error) };
    }
  },
});

// ============================================================================
// INFOBIP WEBHOOK PROCESSING
// ============================================================================

/**
 * Resolve org from Infobip sender ID or from number.
 *
 * Resolution order:
 * 1. Per-org infobip_settings matching the `to` number (enterprise Infobip)
 * 2. If `to` matches platform sender ID (INFOBIP_SMS_SENDER_ID env var),
 *    look up the `from` number in contacts/conversations to find the org
 * 3. If platform sender but no contact match, return null (new unknown sender)
 */
export const resolveOrgFromInfobipSenderId = internalQuery({
  args: { senderId: v.string(), fromNumber: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // 1. Try per-org enterprise settings
    const allSettings = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "infobip_settings"))
      .collect();

    const match = allSettings.find((s) => {
      const props = s.customProperties as Record<string, unknown>;
      return props?.infobipSmsSenderId === args.senderId && props?.enabled !== false;
    });

    if (match?.organizationId) return match.organizationId;

    // 2. Platform SMS fallback: check if this is the platform sender ID
    const platformSenderId = process.env.INFOBIP_SMS_SENDER_ID;
    if (platformSenderId && args.senderId === platformSenderId && args.fromNumber) {
      // Look up the from number in contacts to find the org
      const contacts = await ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", "contact"))
        .collect();

      const contactMatch = contacts.find((c) => {
        const props = c.customProperties as Record<string, unknown>;
        const phone = (props?.phone as string) || (props?.phoneNumber as string) || "";
        // Normalize for comparison: strip non-digits
        const normalizedStored = phone.replace(/[^\d]/g, "");
        const normalizedFrom = args.fromNumber!.replace(/[^\d]/g, "");
        return normalizedStored && normalizedFrom && normalizedStored === normalizedFrom;
      });

      if (contactMatch?.organizationId) return contactMatch.organizationId;

      // 3. No contact match — check sms_conversation_log for previous conversations
      const convLogs = await ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", "sms_conversation"))
        .collect();

      const convMatch = convLogs.find((c) => {
        const props = c.customProperties as Record<string, unknown>;
        const phone = (props?.phoneNumber as string) || "";
        const normalizedStored = phone.replace(/[^\d]/g, "");
        const normalizedFrom = args.fromNumber!.replace(/[^\d]/g, "");
        return normalizedStored && normalizedFrom && normalizedStored === normalizedFrom;
      });

      if (convMatch?.organizationId) return convMatch.organizationId;
    }

    return null;
  },
});

/**
 * Process Infobip webhook — handles both inbound SMS and delivery reports.
 *
 * Inbound SMS: normalized → agent pipeline → reply via SMS
 * Delivery reports: logged for now (Phase 2: update message status in DB)
 */
export const processInfobipWebhook = internalAction({
  args: {
    payload: v.string(),
    senderId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ status: string; message?: string; response?: string }> => {
    const provider = getProvider("infobip");
    if (!provider) {
      console.error("[Infobip] Provider not registered");
      return { status: "error", message: "Infobip provider not registered" };
    }

    const rawPayload = JSON.parse(args.payload);
    const results = rawPayload.results as Array<Record<string, unknown>> | undefined;
    if (!results?.length) {
      return { status: "skipped", message: "Empty results array" };
    }

    const firstResult = results[0];

    // --- Delivery report (has `status` field, no `text`) ---
    if (firstResult.status && !firstResult.text) {
      const status = firstResult.status as Record<string, unknown>;
      const groupId = status.groupId as number | undefined;
      const groupName = status.groupName as string | undefined;
      const messageId = firstResult.messageId as string | undefined;
      console.log(
        `[Infobip] Delivery report: messageId=${messageId} status=${groupName}(${groupId})`
      );
      // Phase 2: update message delivery status in DB
      return {
        status: "delivery_report",
        message: `${groupName} (groupId: ${groupId})`,
      };
    }

    // --- Inbound SMS ---
    // Resolve org: try CPaaS X entityId first (fastest), then senderId, then phone lookup
    const toNumber = firstResult.to as string | undefined;
    const fromNumber = firstResult.from as string | undefined;
    const entityId = firstResult.entityId as string | undefined;
    const resolveId = args.senderId || toNumber;

    let organizationId: Id<"organizations"> | null = null;

    // CPaaS X fast path: resolve via entityId
    if (entityId) {
      organizationId = (await (ctx.runQuery as Function)(
        internalApi.channels.infobipCpaasX.getOrgByEntityId,
        { entityId }
      )) as Id<"organizations"> | null;
    }

    // Fallback: sender ID / phone number lookup
    if (!organizationId) {
      if (!resolveId) {
        console.error("[Infobip] No senderId, entityId, or 'to' field to resolve org");
        return { status: "error", message: "Cannot resolve organization" };
      }

      organizationId = (await (ctx.runQuery as Function)(
        internalApi.channels.webhooks.resolveOrgFromInfobipSenderId,
        { senderId: resolveId, fromNumber: fromNumber || undefined }
      )) as Id<"organizations"> | null;
    }

    if (!organizationId) {
      console.error(`[Infobip] No org found for senderId=${resolveId} from=${fromNumber}`);
      return { status: "error", message: "Unknown sender — no matching organization" };
    }

    // Normalize
    const normalized = provider.normalizeInbound(rawPayload, {} as ProviderCredentials);
    if (!normalized) {
      return { status: "skipped", message: "Could not normalize inbound SMS" };
    }

    // Feed into agent pipeline
    try {
      const result = (await (ctx.runAction as Function)(
        api.ai.agentExecution.processInboundMessage,
        {
          organizationId,
          channel: normalized.channel,
          externalContactIdentifier: normalized.externalContactIdentifier,
          message: normalized.message,
          metadata: normalized.metadata,
        }
      )) as { status: string; response?: string; message?: string };

      // Auto-reply via SMS
      if (result.status === "success" && result.response) {
        await (ctx.runAction as Function)(
          internalApi.channels.router.sendMessage,
          {
            organizationId,
            channel: "sms",
            recipientIdentifier: normalized.externalContactIdentifier,
            content: result.response,
          }
        );
      }

      return result;
    } catch (error) {
      console.error("[Infobip] Agent pipeline error:", error);
      return { status: "error", message: String(error) };
    }
  },
});
