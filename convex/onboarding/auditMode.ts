/**
 * ONBOARDING AUDIT MODE
 *
 * Deterministic five-question orchestration for One of One intake.
 * Supports channel-safe start/answer/resume/complete APIs for webchat/native_guest.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { buildAuditLifecycleEventKey } from "./funnelEvents";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

const auditChannelValidator = v.union(v.literal("webchat"), v.literal("native_guest"));

const auditQuestionIdValidator = v.union(
  v.literal("business_revenue"),
  v.literal("team_size"),
  v.literal("monday_priority"),
  v.literal("delegation_gap"),
  v.literal("reclaimed_time")
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

type AuditChannel = "webchat" | "native_guest";

type AuditQuestionId =
  | "business_revenue"
  | "team_size"
  | "monday_priority"
  | "delegation_gap"
  | "reclaimed_time";

type CampaignMetadata = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPath?: string;
};

const AUDIT_MODE_QUESTION_SET_VERSION = "one_of_one_audit.v1";

const AUDIT_QUESTION_ORDER: AuditQuestionId[] = [
  "business_revenue",
  "team_size",
  "monday_priority",
  "delegation_gap",
  "reclaimed_time",
];

const AUDIT_QUESTION_PROMPTS: Record<AuditQuestionId, string> = {
  business_revenue: "What does your business do, and roughly what revenue are you at?",
  team_size: "How many people are on your team?",
  monday_priority: "Walk me through a typical Monday morning. What is the first thing you deal with?",
  delegation_gap:
    "Of everything on your plate this week, what is the one thing you wish someone else could handle, but nobody does it the way you would?",
  reclaimed_time: "If I could hand you back 10 hours this week, what would you spend them on?",
};

function normalizeOptionalString(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCampaign(campaign?: CampaignMetadata): CampaignMetadata | undefined {
  if (!campaign) {
    return undefined;
  }

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

function normalizeMetadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeAuditAnswer(answer: string): string | undefined {
  const normalized = answer.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return undefined;
  }
  return normalized.slice(0, 2000);
}

function resolveStepOrdinal(questionId: AuditQuestionId): number {
  return AUDIT_QUESTION_ORDER.indexOf(questionId) + 1;
}

function resolveNextQuestionId(questionId: AuditQuestionId): AuditQuestionId | undefined {
  const ordinal = resolveStepOrdinal(questionId);
  return AUDIT_QUESTION_ORDER[ordinal];
}

function resolveDeterministicAuditSessionKey(args: {
  channel: AuditChannel;
  organizationId: Id<"organizations">;
  sessionToken?: string;
}): string {
  const normalizedSessionToken = normalizeOptionalString(args.sessionToken);
  if (normalizedSessionToken) {
    return `audit:${args.channel}:${normalizedSessionToken}`;
  }
  return `audit:${args.channel}:${String(args.organizationId)}`;
}

function createInitialQuestionState(now: number) {
  return {
    business_revenue: {
      status: "asked" as const,
      askedAt: now,
    },
    team_size: {
      status: "pending" as const,
    },
    monday_priority: {
      status: "pending" as const,
    },
    delegation_gap: {
      status: "pending" as const,
    },
    reclaimed_time: {
      status: "pending" as const,
    },
  };
}

function buildAuditSessionSnapshot(session: any) {
  const currentQuestionId = (session.currentQuestionId as AuditQuestionId | undefined) || undefined;

  return {
    auditSessionKey: session.auditSessionKey,
    channel: session.channel,
    organizationId: session.organizationId,
    agentId: session.agentId,
    sessionToken: session.sessionToken,
    status: session.status,
    questionSetVersion: session.questionSetVersion,
    questionOrder: AUDIT_QUESTION_ORDER,
    currentQuestionId,
    currentQuestionPrompt: currentQuestionId ? AUDIT_QUESTION_PROMPTS[currentQuestionId] : undefined,
    answeredQuestionCount: session.answeredQuestionCount,
    questionState: session.questionState,
    workflowRecommendation: session.workflowRecommendation,
    workflowDeliveredAt: session.workflowDeliveredAt,
    completedAt: session.completedAt,
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
    updatedAt: session.updatedAt,
  };
}

async function resolveAuditSession(ctx: any, args: {
  organizationId: Id<"organizations">;
  channel: AuditChannel;
  sessionToken?: string;
  auditSessionKey?: string;
}) {
  const explicitKey = normalizeOptionalString(args.auditSessionKey);
  const deterministicKey = resolveDeterministicAuditSessionKey({
    channel: args.channel,
    organizationId: args.organizationId,
    sessionToken: args.sessionToken,
  });

  const candidateKeys = explicitKey && explicitKey !== deterministicKey
    ? [explicitKey, deterministicKey]
    : [deterministicKey];

  for (const key of candidateKeys) {
    const direct = await ctx.db
      .query("onboardingAuditSessions")
      .withIndex("by_audit_session_key", (q: any) => q.eq("auditSessionKey", key))
      .first();

    if (
      direct
      && String(direct.organizationId) === String(args.organizationId)
      && direct.channel === args.channel
    ) {
      return direct;
    }
  }

  const normalizedSessionToken = normalizeOptionalString(args.sessionToken);
  if (!normalizedSessionToken) {
    return null;
  }

  const bySessionToken = await ctx.db
    .query("onboardingAuditSessions")
    .withIndex("by_session_token", (q: any) => q.eq("sessionToken", normalizedSessionToken))
    .collect();

  const matching = bySessionToken
    .filter((session: any) =>
      String(session.organizationId) === String(args.organizationId)
      && session.channel === args.channel
    )
    .sort((a: any, b: any) => b.updatedAt - a.updatedAt);

  return matching[0] || null;
}

export const startAuditModeSession = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    channel: auditChannelValidator,
    sessionToken: v.string(),
    agentSessionId: v.optional(v.id("agentSessions")),
    sourceIdentityKey: v.optional(v.string()),
    claimTokenId: v.optional(v.string()),
    campaign: v.optional(campaignValidator),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionToken = args.sessionToken.trim();
    const auditSessionKey = resolveDeterministicAuditSessionKey({
      channel: args.channel,
      organizationId: args.organizationId,
      sessionToken,
    });

    const existing = await resolveAuditSession(ctx, {
      organizationId: args.organizationId,
      channel: args.channel,
      sessionToken,
      auditSessionKey,
    });

    let record = existing;

    if (!record) {
      const questionState = createInitialQuestionState(now);
      const docId = await ctx.db.insert("onboardingAuditSessions", {
        auditSessionKey,
        channel: args.channel,
        organizationId: args.organizationId,
        agentId: args.agentId,
        sessionToken,
        agentSessionId: args.agentSessionId,
        sourceIdentityKey: normalizeOptionalString(args.sourceIdentityKey),
        claimTokenId: normalizeOptionalString(args.claimTokenId),
        questionSetVersion: AUDIT_MODE_QUESTION_SET_VERSION,
        status: "started",
        currentQuestionId: "business_revenue",
        answeredQuestionCount: 0,
        questionState,
        metadata: args.metadata,
        startedAt: now,
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      });
      record = await ctx.db.get(docId);
    } else {
      await ctx.db.patch(record._id, {
        agentId: args.agentId,
        sessionToken,
        agentSessionId: args.agentSessionId || record.agentSessionId,
        sourceIdentityKey: normalizeOptionalString(args.sourceIdentityKey) || record.sourceIdentityKey,
        claimTokenId: normalizeOptionalString(args.claimTokenId) || record.claimTokenId,
        updatedAt: now,
        lastActivityAt: now,
      });
      record = await ctx.db.get(record._id);
    }

    const startedEventKey = buildAuditLifecycleEventKey({
      eventName: "onboarding.funnel.audit_started",
      channel: args.channel,
      auditSessionKey,
      sessionToken,
    });

    await ctx.runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
      eventName: "onboarding.funnel.audit_started",
      channel: args.channel,
      organizationId: args.organizationId,
      sessionToken,
      auditSessionKey,
      eventKey: startedEventKey,
      campaign: normalizeCampaign(args.campaign),
      metadata: {
        agentId: String(args.agentId),
        questionSetVersion: AUDIT_MODE_QUESTION_SET_VERSION,
      },
    });

    return {
      success: true,
      deduped: Boolean(existing),
      ...buildAuditSessionSnapshot(record),
    };
  },
});

export const answerAuditModeQuestion = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    channel: auditChannelValidator,
    sessionToken: v.string(),
    auditSessionKey: v.optional(v.string()),
    questionId: auditQuestionIdValidator,
    answer: v.string(),
    campaign: v.optional(campaignValidator),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionToken = args.sessionToken.trim();

    const session = await resolveAuditSession(ctx, {
      organizationId: args.organizationId,
      channel: args.channel,
      sessionToken,
      auditSessionKey: args.auditSessionKey,
    });

    if (!session) {
      return {
        success: false,
        errorCode: "audit_session_not_found",
      };
    }

    if (session.status === "abandoned" || session.status === "handoff_opened") {
      return {
        success: false,
        errorCode: "audit_session_closed",
        session: buildAuditSessionSnapshot(session),
      };
    }

    const normalizedAnswer = normalizeAuditAnswer(args.answer);
    if (!normalizedAnswer) {
      return {
        success: false,
        errorCode: "empty_answer",
        session: buildAuditSessionSnapshot(session),
      };
    }

    const expectedQuestionId = session.currentQuestionId as AuditQuestionId | undefined;

    if (!expectedQuestionId) {
      return {
        success: false,
        errorCode: "audit_already_completed",
        session: buildAuditSessionSnapshot(session),
      };
    }

    if (args.questionId !== expectedQuestionId) {
      const providedState = session.questionState?.[args.questionId];
      if (providedState?.status === "answered") {
        return {
          success: true,
          deduped: true,
          session: buildAuditSessionSnapshot(session),
        };
      }

      return {
        success: false,
        errorCode: "question_out_of_order",
        expectedQuestionId,
        session: buildAuditSessionSnapshot(session),
      };
    }

    const currentState = session.questionState?.[expectedQuestionId];
    if (currentState?.status === "answered") {
      if (currentState.answer === normalizedAnswer) {
        return {
          success: true,
          deduped: true,
          session: buildAuditSessionSnapshot(session),
        };
      }

      return {
        success: false,
        errorCode: "question_already_answered",
        session: buildAuditSessionSnapshot(session),
      };
    }

    const stepOrdinal = resolveStepOrdinal(expectedQuestionId);
    const answerEventKey = buildAuditLifecycleEventKey({
      eventName: "onboarding.funnel.audit_question_answered",
      channel: args.channel,
      auditSessionKey: session.auditSessionKey,
      sessionToken,
      auditQuestionId: expectedQuestionId,
      auditStepOrdinal: stepOrdinal,
    });

    const questionState = {
      ...session.questionState,
      [expectedQuestionId]: {
        status: "answered",
        askedAt: currentState?.askedAt || now,
        answeredAt: now,
        answer: normalizedAnswer,
        answerEventKey,
      },
    };

    const answeredQuestionCount = Math.min(stepOrdinal, AUDIT_QUESTION_ORDER.length);
    const nextQuestionId = resolveNextQuestionId(expectedQuestionId);
    let status: any = "in_progress";
    let completedAt = session.completedAt;

    if (nextQuestionId) {
      const nextState = questionState[nextQuestionId] || { status: "pending" };
      questionState[nextQuestionId] = {
        ...nextState,
        status: "asked",
        askedAt: nextState.askedAt || now,
      };
    } else {
      status = "completed";
      completedAt = completedAt || now;
    }

    const completedEventKey = !nextQuestionId
      ? buildAuditLifecycleEventKey({
          eventName: "onboarding.funnel.audit_completed",
          channel: args.channel,
          auditSessionKey: session.auditSessionKey,
          sessionToken,
          auditStepOrdinal: AUDIT_QUESTION_ORDER.length,
        })
      : undefined;

    await ctx.db.patch(session._id, {
      status,
      currentQuestionId: nextQuestionId,
      answeredQuestionCount,
      questionState,
      completedAt,
      lastLifecycleEventKey: completedEventKey || answerEventKey,
      updatedAt: now,
      lastActivityAt: now,
      metadata: args.metadata || session.metadata,
    });

    await ctx.runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
      eventName: "onboarding.funnel.audit_question_answered",
      channel: args.channel,
      organizationId: args.organizationId,
      sessionToken,
      auditSessionKey: session.auditSessionKey,
      auditQuestionId: expectedQuestionId,
      auditStepOrdinal: stepOrdinal,
      eventKey: answerEventKey,
      campaign: normalizeCampaign(args.campaign),
      metadata: {
        answerLength: normalizedAnswer.length,
      },
    });

    if (completedEventKey) {
      await ctx.runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
        eventName: "onboarding.funnel.audit_completed",
        channel: args.channel,
        organizationId: args.organizationId,
        sessionToken,
        auditSessionKey: session.auditSessionKey,
        auditStepOrdinal: AUDIT_QUESTION_ORDER.length,
        eventKey: completedEventKey,
        campaign: normalizeCampaign(args.campaign),
        metadata: {
          answeredQuestionCount: AUDIT_QUESTION_ORDER.length,
        },
      });
    }

    const updated = await ctx.db.get(session._id);
    return {
      success: true,
      deduped: false,
      session: buildAuditSessionSnapshot(updated),
    };
  },
});

export const resumeAuditModeSession = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    channel: auditChannelValidator,
    sessionToken: v.string(),
    auditSessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await resolveAuditSession(ctx, {
      organizationId: args.organizationId,
      channel: args.channel,
      sessionToken: args.sessionToken,
      auditSessionKey: args.auditSessionKey,
    });

    if (!session) {
      return null;
    }

    return {
      success: true,
      session: buildAuditSessionSnapshot(session),
    };
  },
});

export const completeAuditModeSession = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    channel: auditChannelValidator,
    sessionToken: v.string(),
    auditSessionKey: v.optional(v.string()),
    workflowRecommendation: v.string(),
    campaign: v.optional(campaignValidator),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionToken = args.sessionToken.trim();

    const session = await resolveAuditSession(ctx, {
      organizationId: args.organizationId,
      channel: args.channel,
      sessionToken,
      auditSessionKey: args.auditSessionKey,
    });

    if (!session) {
      return {
        success: false,
        errorCode: "audit_session_not_found",
      };
    }

    if (session.answeredQuestionCount < AUDIT_QUESTION_ORDER.length) {
      return {
        success: false,
        errorCode: "audit_not_ready_for_completion",
        session: buildAuditSessionSnapshot(session),
      };
    }

    const workflowRecommendation = normalizeAuditAnswer(args.workflowRecommendation);
    if (!workflowRecommendation) {
      return {
        success: false,
        errorCode: "missing_workflow_recommendation",
        session: buildAuditSessionSnapshot(session),
      };
    }

    const completedEventKey = buildAuditLifecycleEventKey({
      eventName: "onboarding.funnel.audit_completed",
      channel: args.channel,
      auditSessionKey: session.auditSessionKey,
      sessionToken,
      auditStepOrdinal: AUDIT_QUESTION_ORDER.length,
    });

    await ctx.db.patch(session._id, {
      status:
        session.status === "deliverable_generated" || session.status === "handoff_opened"
          ? session.status
          : "workflow_delivered",
      workflowRecommendation,
      workflowDeliveredAt: session.workflowDeliveredAt || now,
      completedAt: session.completedAt || now,
      currentQuestionId: undefined,
      lastLifecycleEventKey: completedEventKey,
      metadata: args.metadata || session.metadata,
      updatedAt: now,
      lastActivityAt: now,
    });

    await ctx.runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
      eventName: "onboarding.funnel.audit_completed",
      channel: args.channel,
      organizationId: args.organizationId,
      sessionToken,
      auditSessionKey: session.auditSessionKey,
      auditStepOrdinal: AUDIT_QUESTION_ORDER.length,
      eventKey: completedEventKey,
      campaign: normalizeCampaign(args.campaign),
      metadata: {
        completionSource: "complete_api",
      },
    });

    const updated = await ctx.db.get(session._id);
    return {
      success: true,
      session: buildAuditSessionSnapshot(updated),
    };
  },
});

export const openAuditModeHandoff = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    channel: auditChannelValidator,
    sessionToken: v.string(),
    auditSessionKey: v.optional(v.string()),
    campaign: v.optional(campaignValidator),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionToken = args.sessionToken.trim();
    const session = await resolveAuditSession(ctx, {
      organizationId: args.organizationId,
      channel: args.channel,
      sessionToken,
      auditSessionKey: args.auditSessionKey,
    });

    if (!session) {
      return {
        success: false,
        errorCode: "audit_session_not_found",
      };
    }

    if (session.status === "abandoned") {
      return {
        success: false,
        errorCode: "audit_session_closed",
        session: buildAuditSessionSnapshot(session),
      };
    }

    if (session.answeredQuestionCount < AUDIT_QUESTION_ORDER.length) {
      return {
        success: false,
        errorCode: "audit_not_ready_for_handoff",
        session: buildAuditSessionSnapshot(session),
      };
    }

    const handoffEventKey = buildAuditLifecycleEventKey({
      eventName: "onboarding.funnel.audit_handoff_opened",
      channel: args.channel,
      auditSessionKey: session.auditSessionKey,
      sessionToken,
      claimTokenId: normalizeOptionalString(session.claimTokenId),
    });

    const existingMetadata = normalizeMetadataRecord(session.metadata);
    const metadataPatch = normalizeMetadataRecord(args.metadata);
    const mergedMetadata =
      Object.keys(metadataPatch).length > 0
        ? {
            ...existingMetadata,
            ...metadataPatch,
          }
        : session.metadata;

    await ctx.db.patch(session._id, {
      status: "handoff_opened",
      handoffOpenedAt: session.handoffOpenedAt || now,
      lastLifecycleEventKey: handoffEventKey,
      metadata: mergedMetadata,
      updatedAt: now,
      lastActivityAt: now,
    });

    await ctx.runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
      eventName: "onboarding.funnel.audit_handoff_opened",
      channel: args.channel,
      organizationId: args.organizationId,
      sessionToken,
      claimTokenId: normalizeOptionalString(session.claimTokenId),
      auditSessionKey: session.auditSessionKey,
      eventKey: handoffEventKey,
      campaign: normalizeCampaign(args.campaign),
      metadata: {
        source: "onboarding.auditMode.openAuditModeHandoff",
        previousStatus: session.status,
      },
    });

    const updated = await ctx.db.get(session._id);
    return {
      success: true,
      deduped: session.status === "handoff_opened",
      session: buildAuditSessionSnapshot(updated),
    };
  },
});
