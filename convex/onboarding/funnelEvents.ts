/**
 * ONBOARDING FUNNEL EVENTS
 *
 * Deterministic funnel telemetry for free onboarding across channels.
 * Events are deduplicated by eventKey to prevent double-counting on retries.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

const funnelEventNameValidator = v.union(
  v.literal("onboarding.funnel.first_touch"),
  v.literal("onboarding.funnel.activation"),
  v.literal("onboarding.funnel.signup"),
  v.literal("onboarding.funnel.claim"),
  v.literal("onboarding.funnel.upgrade"),
  v.literal("onboarding.funnel.credit_purchase"),
  v.literal("onboarding.funnel.channel_first_message_latency"),
  v.literal("onboarding.funnel.audit_started"),
  v.literal("onboarding.funnel.audit_question_answered"),
  v.literal("onboarding.funnel.audit_completed"),
  v.literal("onboarding.funnel.audit_deliverable_generated"),
  v.literal("onboarding.funnel.audit_handoff_opened")
);

const funnelChannelValidator = v.union(
  v.literal("webchat"),
  v.literal("native_guest"),
  v.literal("telegram"),
  v.literal("whatsapp"),
  v.literal("slack"),
  v.literal("sms"),
  v.literal("platform_web"),
  v.literal("unknown")
);

const campaignValidator = v.object({
  source: v.optional(v.string()),
  medium: v.optional(v.string()),
  campaign: v.optional(v.string()),
  content: v.optional(v.string()),
  term: v.optional(v.string()),
  referrer: v.optional(v.string()),
  landingPath: v.optional(v.string()),
});

const auditQuestionIdValidator = v.union(
  v.literal("business_revenue"),
  v.literal("team_size"),
  v.literal("monday_priority"),
  v.literal("delegation_gap"),
  v.literal("reclaimed_time")
);

type FunnelEventName =
  | "onboarding.funnel.first_touch"
  | "onboarding.funnel.activation"
  | "onboarding.funnel.signup"
  | "onboarding.funnel.claim"
  | "onboarding.funnel.upgrade"
  | "onboarding.funnel.credit_purchase"
  | "onboarding.funnel.channel_first_message_latency"
  | "onboarding.funnel.audit_started"
  | "onboarding.funnel.audit_question_answered"
  | "onboarding.funnel.audit_completed"
  | "onboarding.funnel.audit_deliverable_generated"
  | "onboarding.funnel.audit_handoff_opened";

type FunnelChannel =
  | "webchat"
  | "native_guest"
  | "telegram"
  | "whatsapp"
  | "slack"
  | "sms"
  | "platform_web"
  | "unknown";

type CampaignMetadata = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPath?: string;
};

type AuditQuestionId =
  | "business_revenue"
  | "team_size"
  | "monday_priority"
  | "delegation_gap"
  | "reclaimed_time";

type FunnelEventArgs = {
  eventName: FunnelEventName;
  channel: FunnelChannel;
  organizationId?: Id<"organizations">;
  userId?: Id<"users">;
  sessionToken?: string;
  telegramChatId?: string;
  claimTokenId?: string;
  auditSessionKey?: string;
  auditQuestionId?: AuditQuestionId;
  auditStepOrdinal?: number;
  eventKey?: string;
  campaign?: CampaignMetadata;
  metadata?: Record<string, unknown>;
  occurredAt?: number;
};

function normalizeCampaign(campaign?: CampaignMetadata): CampaignMetadata | undefined {
  if (!campaign) return undefined;
  const normalized: CampaignMetadata = {};

  if (campaign.source?.trim()) normalized.source = campaign.source.trim();
  if (campaign.medium?.trim()) normalized.medium = campaign.medium.trim();
  if (campaign.campaign?.trim()) normalized.campaign = campaign.campaign.trim();
  if (campaign.content?.trim()) normalized.content = campaign.content.trim();
  if (campaign.term?.trim()) normalized.term = campaign.term.trim();
  if (campaign.referrer?.trim()) normalized.referrer = campaign.referrer.trim();
  if (campaign.landingPath?.trim()) normalized.landingPath = campaign.landingPath.trim();

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeOptionalString(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeAuditStepOrdinal(value?: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const normalized = Math.floor(value);
  return normalized >= 1 ? normalized : undefined;
}

function buildDefaultEventKey(args: FunnelEventArgs): string {
  const auditSessionKey = normalizeOptionalString(args.auditSessionKey);
  const auditStepOrdinal = normalizeAuditStepOrdinal(args.auditStepOrdinal);
  const identityParts = [
    normalizeOptionalString(args.sessionToken) || "",
    normalizeOptionalString(args.telegramChatId) || "",
    normalizeOptionalString(args.claimTokenId) || "",
    args.userId ? String(args.userId) : "",
    args.organizationId ? String(args.organizationId) : "",
  ]
    .filter((value) => value.length > 0)
    .join(":");

  const scopeParts = [
    args.eventName,
    args.channel,
    auditSessionKey ? `audit_session:${auditSessionKey}` : "",
    args.auditQuestionId ? `audit_question:${args.auditQuestionId}` : "",
    auditStepOrdinal ? `audit_step:${auditStepOrdinal}` : "",
    identityParts.length > 0 ? `identity:${identityParts}` : "",
  ].filter((value) => value.length > 0);

  return scopeParts.join(":");
}

export function buildAuditLifecycleEventKey(args: {
  eventName:
    | "onboarding.funnel.audit_started"
    | "onboarding.funnel.audit_question_answered"
    | "onboarding.funnel.audit_completed"
    | "onboarding.funnel.audit_deliverable_generated"
    | "onboarding.funnel.audit_handoff_opened";
  channel: FunnelChannel;
  auditSessionKey: string;
  sessionToken?: string;
  telegramChatId?: string;
  claimTokenId?: string;
  auditQuestionId?: AuditQuestionId;
  auditStepOrdinal?: number;
}): string {
  const auditSessionKey = normalizeOptionalString(args.auditSessionKey) || "unknown";
  const auditStepOrdinal = normalizeAuditStepOrdinal(args.auditStepOrdinal);
  const identityParts = [
    normalizeOptionalString(args.sessionToken) || "",
    normalizeOptionalString(args.telegramChatId) || "",
    normalizeOptionalString(args.claimTokenId) || "",
  ]
    .filter((value) => value.length > 0)
    .join(":");

  return [
    args.eventName,
    args.channel,
    `audit_session:${auditSessionKey}`,
    args.auditQuestionId ? `audit_question:${args.auditQuestionId}` : "",
    auditStepOrdinal ? `audit_step:${auditStepOrdinal}` : "",
    identityParts.length > 0 ? `identity:${identityParts}` : "",
  ]
    .filter((value) => value.length > 0)
    .join(":");
}

export const emitFunnelEvent = internalMutation({
  args: {
    eventName: funnelEventNameValidator,
    channel: funnelChannelValidator,
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    sessionToken: v.optional(v.string()),
    telegramChatId: v.optional(v.string()),
    claimTokenId: v.optional(v.string()),
    auditSessionKey: v.optional(v.string()),
    auditQuestionId: v.optional(auditQuestionIdValidator),
    auditStepOrdinal: v.optional(v.number()),
    eventKey: v.optional(v.string()),
    campaign: v.optional(campaignValidator),
    metadata: v.optional(v.any()),
    occurredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const eventKey = normalizeOptionalString(args.eventKey) || buildDefaultEventKey(args);
    const auditSessionKey = normalizeOptionalString(args.auditSessionKey);
    const auditStepOrdinal = normalizeAuditStepOrdinal(args.auditStepOrdinal);
    const existing = await ctx.db
      .query("onboardingFunnelEvents")
      .withIndex("by_event_key", (q) => q.eq("eventKey", eventKey))
      .first();

    if (existing) {
      return {
        eventId: existing._id,
        eventKey,
        deduped: true,
      };
    }

    const createdAt = args.occurredAt || Date.now();
    const campaign = normalizeCampaign(args.campaign);
    const metadata =
      args.metadata && typeof args.metadata === "object"
        ? (args.metadata as Record<string, unknown>)
        : undefined;

    const eventId = await ctx.db.insert("onboardingFunnelEvents", {
      eventKey,
      eventName: args.eventName,
      channel: args.channel,
      organizationId: args.organizationId,
      userId: args.userId,
      sessionToken: args.sessionToken,
      telegramChatId: args.telegramChatId,
      claimTokenId: args.claimTokenId,
      auditSessionKey,
      auditQuestionId: args.auditQuestionId,
      auditStepOrdinal,
      campaign,
      metadata,
      createdAt,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: args.userId,
      action: args.eventName,
      resource: "onboardingFunnelEvents",
      resourceId: eventKey,
      metadata: {
        channel: args.channel,
        campaign,
        auditSessionKey,
        auditQuestionId: args.auditQuestionId,
        auditStepOrdinal,
        ...(metadata || {}),
      },
      success: true,
      createdAt,
    });

    return {
      eventId,
      eventKey,
      deduped: false,
    };
  },
});
