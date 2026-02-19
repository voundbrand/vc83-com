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
  v.literal("onboarding.funnel.credit_purchase")
);

const funnelChannelValidator = v.union(
  v.literal("webchat"),
  v.literal("native_guest"),
  v.literal("telegram"),
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

type FunnelEventName =
  | "onboarding.funnel.first_touch"
  | "onboarding.funnel.activation"
  | "onboarding.funnel.signup"
  | "onboarding.funnel.claim"
  | "onboarding.funnel.upgrade"
  | "onboarding.funnel.credit_purchase";

type FunnelChannel =
  | "webchat"
  | "native_guest"
  | "telegram"
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

type FunnelEventArgs = {
  eventName: FunnelEventName;
  channel: FunnelChannel;
  organizationId?: Id<"organizations">;
  userId?: Id<"users">;
  sessionToken?: string;
  telegramChatId?: string;
  claimTokenId?: string;
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

function buildDefaultEventKey(args: FunnelEventArgs): string {
  const identityParts = [
    args.sessionToken || "",
    args.telegramChatId || "",
    args.claimTokenId || "",
    args.userId ? String(args.userId) : "",
    args.organizationId ? String(args.organizationId) : "",
  ]
    .filter((value) => value.length > 0)
    .join(":");

  if (identityParts.length > 0) {
    return `${args.eventName}:${args.channel}:${identityParts}`;
  }

  return `${args.eventName}:${args.channel}`;
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
    eventKey: v.optional(v.string()),
    campaign: v.optional(campaignValidator),
    metadata: v.optional(v.any()),
    occurredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const eventKey = args.eventKey?.trim() || buildDefaultEventKey(args);
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
