/**
 * Work Items Queries
 *
 * Real-time queries for contact syncs, email campaigns, and AI-created work items
 * Powers the three-pane UI work item display
 */

import { query, mutation, type QueryCtx, type MutationCtx } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireAuthenticatedUser } from "../rbacHelpers";

interface OutcomeAggregation {
  totalScanned: number;
  successCount: number;
  failureCount: number;
  pendingCount: number;
  ignoredCount: number;
  successRate: number;
  failureRate: number;
  statusBreakdown: Array<{ status: string; count: number }>;
}

export interface ToolSuccessFailureAggregation {
  windowHours: number;
  since: number;
  toolExecutions: OutcomeAggregation;
  workItems: OutcomeAggregation;
  combined: OutcomeAggregation;
}

const NEGATIVE_SUPPORT_SENTIMENT_PHRASES = [
  "not working",
  "still broken",
  "does not work",
  "doesn't work",
  "refund",
  "chargeback",
  "dispute",
  "frustrated",
  "angry",
  "furious",
  "terrible",
  "awful",
  "horrible",
  "unacceptable",
  "cannot access",
  "can't access",
  "locked out",
];

const POSITIVE_SUPPORT_SENTIMENT_PHRASES = [
  "thank you",
  "thanks",
  "works now",
  "resolved",
  "fixed",
  "great",
  "awesome",
  "perfect",
  "appreciate",
  "all good",
];

const SUPPORT_ESCALATION_OUTCOME_VALUES = [
  "pending",
  "taken_over",
  "resolved",
  "dismissed",
  "timed_out",
] as const;

const HUMAN_ESCALATION_OUTCOME_SET = new Set<SupportEscalationOutcome>([
  "pending",
  "taken_over",
  "resolved",
]);

const AI_RESOLVED_ESCALATION_OUTCOME_SET = new Set<SupportEscalationOutcome>([
  "dismissed",
  "timed_out",
]);

const AGENT_SESSION_STATUS_VALUES = [
  "active",
  "closed",
  "expired",
  "handed_off",
] as const;

export type SupportSentimentOutcome = "positive" | "neutral" | "negative";
export type SupportEscalationOutcome = (typeof SUPPORT_ESCALATION_OUTCOME_VALUES)[number];

export interface SupportQualitySessionRecord {
  sessionId: string;
  messageCount: number;
  startedAt: number;
  lastMessageAt: number;
  finalUserSentiment: SupportSentimentOutcome;
  hasEscalation: boolean;
  escalationStatus?: SupportEscalationOutcome;
}

export interface SupportSentimentTrendPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface SupportQualityAggregation {
  windowHours: number;
  since: number;
  totalSessions: number;
  aiResolvedSessions: number;
  humanEscalatedSessions: number;
  unresolvedSessions: number;
  resolutionRate: number;
  escalationRate: number;
  averageConversationMessages: number;
  averageConversationDurationMinutes: number;
  sentimentOutcomes: Record<SupportSentimentOutcome, number>;
  escalationOutcomes: Record<SupportEscalationOutcome, number>;
  sentimentTrend: SupportSentimentTrendPoint[];
}

function normalizeStatus(statusRaw: unknown): string | null {
  if (typeof statusRaw !== "string") {
    return null;
  }
  const normalized = statusRaw.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSupportEscalationOutcome(
  value: unknown
): SupportEscalationOutcome | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return SUPPORT_ESCALATION_OUTCOME_VALUES.includes(
    normalized as SupportEscalationOutcome
  )
    ? (normalized as SupportEscalationOutcome)
    : null;
}

async function requireSuperAdminSession(
  ctx: QueryCtx | MutationCtx,
  sessionId: string
): Promise<{ userId: Id<"users"> }> {
  const { userId } = await requireAuthenticatedUser(ctx, sessionId);
  const user = await ctx.db.get(userId);
  if (!user || !user.global_role_id) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only super admins can access support quality metrics.",
    });
  }
  const role = await ctx.db.get(user.global_role_id);
  if (!role || role.name !== "super_admin") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only super admins can access support quality metrics.",
    });
  }
  return { userId };
}

export function classifySupportSentiment(
  value: string | null | undefined
): SupportSentimentOutcome {
  if (typeof value !== "string") {
    return "neutral";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return "neutral";
  }

  let negativeSignals = 0;
  for (const phrase of NEGATIVE_SUPPORT_SENTIMENT_PHRASES) {
    if (normalized.includes(phrase)) {
      negativeSignals += 1;
    }
  }

  let positiveSignals = 0;
  for (const phrase of POSITIVE_SUPPORT_SENTIMENT_PHRASES) {
    if (normalized.includes(phrase)) {
      positiveSignals += 1;
    }
  }

  if (negativeSignals > positiveSignals && negativeSignals > 0) {
    return "negative";
  }
  if (positiveSignals > negativeSignals && positiveSignals > 0) {
    return "positive";
  }
  return "neutral";
}

export function aggregateSupportQualityMetrics(
  records: SupportQualitySessionRecord[],
  options: { windowHours: number; since: number }
): SupportQualityAggregation {
  const sentimentOutcomes: Record<SupportSentimentOutcome, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  const escalationOutcomes: Record<SupportEscalationOutcome, number> = {
    pending: 0,
    taken_over: 0,
    resolved: 0,
    dismissed: 0,
    timed_out: 0,
  };

  let aiResolvedSessions = 0;
  let humanEscalatedSessions = 0;
  let unresolvedSessions = 0;
  let totalMessageCount = 0;
  let totalDurationMs = 0;

  const sentimentTrendMap = new Map<string, SupportSentimentTrendPoint>();

  for (const record of records) {
    const sentiment = record.finalUserSentiment;
    sentimentOutcomes[sentiment] += 1;

    const dayKey = new Date(Math.max(0, record.lastMessageAt))
      .toISOString()
      .slice(0, 10);
    const dayBucket = sentimentTrendMap.get(dayKey) ?? {
      date: dayKey,
      positive: 0,
      neutral: 0,
      negative: 0,
      total: 0,
    };
    dayBucket[sentiment] += 1;
    dayBucket.total += 1;
    sentimentTrendMap.set(dayKey, dayBucket);

    totalMessageCount += Math.max(0, record.messageCount);
    totalDurationMs += Math.max(0, record.lastMessageAt - record.startedAt);

    const escalationOutcome = normalizeSupportEscalationOutcome(record.escalationStatus);
    if (record.hasEscalation && escalationOutcome) {
      escalationOutcomes[escalationOutcome] += 1;
    }

    if (
      !record.hasEscalation
      || (escalationOutcome !== null
        && AI_RESOLVED_ESCALATION_OUTCOME_SET.has(escalationOutcome))
    ) {
      aiResolvedSessions += 1;
      continue;
    }

    if (
      escalationOutcome !== null
      && HUMAN_ESCALATION_OUTCOME_SET.has(escalationOutcome)
    ) {
      humanEscalatedSessions += 1;
      continue;
    }

    unresolvedSessions += 1;
  }

  const totalSessions = records.length;
  const resolutionRate =
    totalSessions > 0
      ? Number((aiResolvedSessions / totalSessions).toFixed(4))
      : 0;
  const escalationRate =
    totalSessions > 0
      ? Number((humanEscalatedSessions / totalSessions).toFixed(4))
      : 0;
  const averageConversationMessages =
    totalSessions > 0
      ? Number((totalMessageCount / totalSessions).toFixed(2))
      : 0;
  const averageConversationDurationMinutes =
    totalSessions > 0
      ? Number((totalDurationMs / totalSessions / (1000 * 60)).toFixed(2))
      : 0;

  const sentimentTrend = Array.from(sentimentTrendMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return {
    windowHours: options.windowHours,
    since: options.since,
    totalSessions,
    aiResolvedSessions,
    humanEscalatedSessions,
    unresolvedSessions,
    resolutionRate,
    escalationRate,
    averageConversationMessages,
    averageConversationDurationMinutes,
    sentimentOutcomes,
    escalationOutcomes,
    sentimentTrend,
  };
}

function aggregateOutcomeStatuses(statuses: Array<string | null | undefined>): OutcomeAggregation {
  let successCount = 0;
  let failureCount = 0;
  let pendingCount = 0;
  let ignoredCount = 0;
  const statusCounts = new Map<string, number>();

  for (const statusRaw of statuses) {
    const status = normalizeStatus(statusRaw);
    if (!status) {
      ignoredCount += 1;
      continue;
    }

    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    if (status === "success" || status === "completed") {
      successCount += 1;
      continue;
    }

    if (status === "failed" || status === "error" || status === "disabled") {
      failureCount += 1;
      continue;
    }

    if (
      status === "proposed"
      || status === "approved"
      || status === "executing"
      || status === "pending"
      || status === "preview"
    ) {
      pendingCount += 1;
      continue;
    }

    ignoredCount += 1;
  }

  const consideredTotal = successCount + failureCount;
  const successRate =
    consideredTotal > 0
      ? Number((successCount / consideredTotal).toFixed(4))
      : 0;
  const failureRate =
    consideredTotal > 0
      ? Number((failureCount / consideredTotal).toFixed(4))
      : 0;

  return {
    totalScanned: statuses.length,
    successCount,
    failureCount,
    pendingCount,
    ignoredCount,
    successRate,
    failureRate,
    statusBreakdown: Array.from(statusCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count })),
  };
}

export function aggregateToolSuccessFailure(
  toolExecutionStatuses: Array<string | null | undefined>,
  workItemStatuses: Array<string | null | undefined>,
  options: { windowHours: number; since: number }
): ToolSuccessFailureAggregation {
  const toolExecutions = aggregateOutcomeStatuses(toolExecutionStatuses);
  const workItems = aggregateOutcomeStatuses(workItemStatuses);
  const combined = aggregateOutcomeStatuses([
    ...toolExecutionStatuses,
    ...workItemStatuses,
  ]);

  return {
    windowHours: options.windowHours,
    since: options.since,
    toolExecutions,
    workItems,
    combined,
  };
}

const RECEIPT_STATUS_VALUES = [
  "accepted",
  "processing",
  "completed",
  "failed",
  "duplicate",
] as const;

async function fetchOrganizationReceipts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: string
) {
  const groups = await Promise.all(
    RECEIPT_STATUS_VALUES.map((status) =>
      ctx.db
        .query("agentInboxReceipts")
        .withIndex("by_org_status", (q: any) =>
          q.eq("organizationId", organizationId).eq("status", status)
        )
        .collect()
    )
  );
  return groups.flat();
}

// ============================================================================
// CONTACT SYNC QUERIES
// ============================================================================

/**
 * Get contact syncs for an organization
 * Shows all syncs with their current status and preview data
 */
export const getContactSyncs = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const syncs = await ctx.db
      .query("contactSyncs")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(args.limit || 50);

    return syncs;
  },
});

/**
 * Get a single contact sync with full details
 */
export const getContactSync = query({
  args: {
    syncId: v.id("contactSyncs"),
  },
  handler: async (ctx, args) => {
    const sync = await ctx.db.get(args.syncId);
    if (!sync) return null;

    // Get user who initiated the sync
    const user = await ctx.db.get(sync.userId);

    return {
      ...sync,
      userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : "Unknown User",
    };
  },
});

/**
 * Get contact sync preview items
 * These are the individual contacts being synced (from previewData)
 */
export const getContactSyncItems = query({
  args: {
    syncId: v.id("contactSyncs"),
  },
  handler: async (ctx, args) => {
    const sync = await ctx.db.get(args.syncId);
    if (!sync || !sync.previewData) return [];

    // Return preview data as work items
    // Each item represents a contact to be created/updated/skipped
    return sync.previewData as Array<{
      id: string;
      sourceId: string;
      sourceName: string;
      sourceEmail: string;
      match: {
        action: "create" | "update" | "skip" | "merge";
        matchedContactId?: string;
        confidence: "high" | "medium" | "low";
        reason: string;
      };
      data: Record<string, unknown>;
    }>;
  },
});

// ============================================================================
// EMAIL CAMPAIGN QUERIES
// ============================================================================

/**
 * Get email campaigns for an organization
 */
export const getEmailCampaigns = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const campaigns = await ctx.db
      .query("emailCampaigns")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(args.limit || 50);

    return campaigns;
  },
});

/**
 * Get a single email campaign with full details
 */
export const getEmailCampaign = query({
  args: {
    campaignId: v.id("emailCampaigns"),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return null;

    // Get user who created the campaign
    const user = await ctx.db.get(campaign.userId);

    return {
      ...campaign,
      userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : "Unknown User",
    };
  },
});

/**
 * Get email campaign preview items
 * These are the individual emails being sent (from previewData)
 */
export const getEmailCampaignItems = query({
  args: {
    campaignId: v.id("emailCampaigns"),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || !campaign.previewData) return [];

    // Return preview data as work items
    // Each item represents an email to be sent
    return campaign.previewData as Array<{
      recipientId: string;
      recipientEmail: string;
      recipientName: string;
      subject: string;
      body: string;
      personalization: Record<string, string>;
    }>;
  },
});

// ============================================================================
// COMBINED WORK ITEMS QUERY
// ============================================================================

/**
 * Get all active work items for an organization
 * Combines contact syncs, email campaigns, and AI work items into a unified view
 */
export const getActiveWorkItems = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get active contact syncs (preview or executing)
    const activeSyncs = await ctx.db
      .query("contactSyncs")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "preview"),
          q.eq(q.field("status"), "executing")
        )
      )
      .take(20);

    // Get active email campaigns (draft, pending, sending)
    const activeCampaigns = await ctx.db
      .query("emailCampaigns")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "draft"),
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "sending")
        )
      )
      .take(20);

    // Get active AI work items (preview, approved, executing, completed)
    const aiWorkItems = await ctx.db
      .query("aiWorkItems")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "preview"),
          q.eq(q.field("status"), "approved"),
          q.eq(q.field("status"), "executing"),
          q.eq(q.field("status"), "completed")
        )
      )
      .take(20);

    // Transform to unified work item format
    const workItems = [
      ...activeSyncs.map((sync) => ({
        id: sync._id,
        type: "contact_sync" as const,
        name: `Contact Sync - ${sync.provider}`,
        status: sync.status,
        createdAt: sync.startedAt,
        progress: {
          total: sync.totalContacts,
          completed: sync.created + sync.updated + sync.skipped,
          failed: sync.failed,
        },
      })),
      ...activeCampaigns.map((campaign) => ({
        id: campaign._id,
        type: "email_campaign" as const,
        name: campaign.name,
        status: campaign.status,
        createdAt: campaign.createdAt,
        progress: {
          total: campaign.totalRecipients,
          completed: campaign.sent,
          failed: campaign.failed,
        },
      })),
      ...aiWorkItems.map((item) => ({
        id: item._id,
        type: `ai_${item.type}` as const, // "ai_project" | "ai_milestone" | "ai_task" | etc.
        name: item.name,
        status: item.status,
        createdAt: item.createdAt,
        progress: item.progress || {
          total: 1,
          completed: item.status === "completed" ? 1 : 0,
          failed: item.status === "failed" ? 1 : 0,
        },
      })),
    ];

    // Sort by creation date (newest first)
    return workItems.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Aggregate tool/work-item success-failure ratios for SLO dashboards.
 */
export const getToolSuccessFailureRatio = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;

    const toolExecutions = await ctx.db
      .query("aiToolExecutions")
      .withIndex("by_org_time", (q) =>
        q.eq("organizationId", args.organizationId).gte("executedAt", since)
      )
      .collect();

    const workItems = await ctx.db
      .query("aiWorkItems")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const recentWorkItems = workItems.filter((item) => {
      const timestamp = item.completedAt ?? item.createdAt;
      return timestamp >= since;
    });

    return {
      source: "tool_executions_and_work_items",
      ...aggregateToolSuccessFailure(
        toolExecutions.map((execution) => execution.status),
        recentWorkItems.map((item) => item.status),
        { windowHours: clampedHours, since }
      ),
    };
  },
});

/**
 * Receipt operations dashboard for support and incident triage.
 */
export const getReceiptOperationsDashboard = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    staleMinutes: v.optional(v.number()),
    minAgingMinutes: v.optional(v.number()),
    minDuplicateCount: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const now = Date.now();
    const staleMs = Math.max(1, Math.floor(args.staleMinutes ?? 10)) * 60 * 1000;
    const agingMs = Math.max(1, Math.floor(args.minAgingMinutes ?? 15)) * 60 * 1000;
    const minDuplicateCount = Math.max(1, Math.floor(args.minDuplicateCount ?? 1));
    const limit = Math.max(1, Math.floor(args.limit ?? 50));

    const receipts = await fetchOrganizationReceipts(ctx, args.organizationId);

    const summary = {
      total: receipts.length,
      accepted: receipts.filter((receipt) => receipt.status === "accepted").length,
      processing: receipts.filter((receipt) => receipt.status === "processing").length,
      completed: receipts.filter((receipt) => receipt.status === "completed").length,
      failed: receipts.filter((receipt) => receipt.status === "failed").length,
      duplicate: receipts.filter((receipt) => receipt.status === "duplicate").length,
      withDuplicates: receipts.filter((receipt) => receipt.duplicateCount > 0).length,
    };

    const aging = receipts
      .filter((receipt) => receipt.status === "accepted" || receipt.status === "processing")
      .map((receipt) => ({
        receiptId: receipt._id,
        status: receipt.status,
        turnId: receipt.turnId,
        idempotencyKey: receipt.idempotencyKey,
        ageMs: now - receipt.firstSeenAt,
        duplicateCount: receipt.duplicateCount,
      }))
      .filter((receipt) => receipt.ageMs >= agingMs)
      .sort((a, b) => b.ageMs - a.ageMs)
      .slice(0, limit);

    const duplicates = receipts
      .filter((receipt) => receipt.duplicateCount >= minDuplicateCount)
      .map((receipt) => ({
        receiptId: receipt._id,
        status: receipt.status,
        turnId: receipt.turnId,
        idempotencyKey: receipt.idempotencyKey,
        duplicateCount: receipt.duplicateCount,
        lastSeenAt: receipt.lastSeenAt,
      }))
      .sort((a, b) => {
        if (b.duplicateCount !== a.duplicateCount) {
          return b.duplicateCount - a.duplicateCount;
        }
        return b.lastSeenAt - a.lastSeenAt;
      })
      .slice(0, limit);

    const stuck = receipts
      .filter((receipt) => receipt.status === "processing")
      .map((receipt) => {
        const startedAt = receipt.processingStartedAt ?? receipt.firstSeenAt;
        return {
          receiptId: receipt._id,
          turnId: receipt.turnId,
          idempotencyKey: receipt.idempotencyKey,
          processingAgeMs: now - startedAt,
          duplicateCount: receipt.duplicateCount,
        };
      })
      .filter((receipt) => receipt.processingAgeMs >= staleMs)
      .sort((a, b) => b.processingAgeMs - a.processingAgeMs)
      .slice(0, limit);

    return {
      summary,
      aging,
      duplicates,
      stuck,
    };
  },
});

/**
 * Support quality dashboard for super-admin support operations.
 * Tracks AI-resolved vs escalated outcomes with sentiment and escalation trends.
 */
export const getSupportAgentQualityMetrics = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    hours: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);

    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24 * 7), 1), 24 * 30);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 150), 500));

    const sessionGroups = await Promise.all(
      AGENT_SESSION_STATUS_VALUES.map((status) =>
        ctx.db
          .query("agentSessions")
          .withIndex("by_org_status", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", status)
          )
          .collect()
      )
    );

    const supportSessions = sessionGroups
      .flat()
      .filter((session) => {
        if (session.lastMessageAt < since) {
          return false;
        }
        const isSupportSession = session.externalContactIdentifier.startsWith("support:");
        return isSupportSession || Boolean(session.escalationState);
      })
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      .slice(0, limit);

    const records = await Promise.all(
      supportSessions.map(async (session) => {
        const recentMessages = await ctx.db
          .query("agentSessionMessages")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .take(20);
        const latestUserMessage = recentMessages.find((message) => message.role === "user");
        const escalationStatus = normalizeSupportEscalationOutcome(
          session.escalationState?.status
        );
        const hasEscalation =
          Boolean(session.escalationState)
          || Boolean(session.escalationState?.supportTicketId)
          || Boolean(session.escalationState?.supportTicketNumber);

        return {
          sessionId: String(session._id),
          messageCount: session.messageCount,
          startedAt: session.startedAt,
          lastMessageAt: session.lastMessageAt,
          finalUserSentiment: classifySupportSentiment(latestUserMessage?.content),
          hasEscalation,
          escalationStatus: escalationStatus ?? undefined,
        } satisfies SupportQualitySessionRecord;
      })
    );

    const summary = aggregateSupportQualityMetrics(records, {
      windowHours: clampedHours,
      since,
    });

    const recentEscalations = supportSessions
      .filter((session) => Boolean(session.escalationState))
      .sort((a, b) => {
        const aEscalatedAt = a.escalationState?.escalatedAt ?? 0;
        const bEscalatedAt = b.escalationState?.escalatedAt ?? 0;
        return bEscalatedAt - aEscalatedAt;
      })
      .slice(0, 25)
      .map((session) => ({
        sessionId: session._id,
        status: session.escalationState?.status ?? "pending",
        urgency: session.escalationState?.urgency ?? "normal",
        triggerType: session.escalationState?.triggerType ?? "unknown",
        ticketNumber: session.escalationState?.supportTicketNumber ?? null,
        ticketId: session.escalationState?.supportTicketId ?? null,
        escalatedAt: session.escalationState?.escalatedAt ?? null,
        respondedAt: session.escalationState?.respondedAt ?? null,
        lastMessageAt: session.lastMessageAt,
        messageCount: session.messageCount,
      }));

    return {
      success: true,
      organizationId: args.organizationId,
      source: "support_agent_sessions",
      ...summary,
      recentEscalations,
    };
  },
});

// ============================================================================
// AI WORK ITEMS MANAGEMENT
// ============================================================================

/**
 * Get work items for a specific conversation
 */
export const getAIWorkItemsForConversation = query({
  args: {
    conversationId: v.id("aiConversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiWorkItems")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a single AI work item by ID
 */
export const getAIWorkItem = query({
  args: {
    workItemId: v.id("aiWorkItems"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workItemId);
  },
});

/**
 * Create a work item after successful tool execution
 * Called internally from executeApprovedTool action
 */
export const createAIWorkItem = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    type: v.string(), // "project" | "milestone" | "task" | "contact" | "organization"
    name: v.string(),
    status: v.string(),
    previewData: v.optional(v.array(v.any())),
    results: v.optional(v.any()),
    progress: v.optional(v.object({
      total: v.number(),
      completed: v.number(),
      failed: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate status against the union type in schema
    const validStatuses = ["preview", "approved", "executing", "completed", "failed", "cancelled"];
    const status = validStatuses.includes(args.status) ? args.status : "completed";

    return await ctx.db.insert("aiWorkItems", {
      organizationId: args.organizationId,
      userId: args.userId,
      conversationId: args.conversationId,
      type: args.type,
      name: args.name,
      status: status as "preview" | "approved" | "executing" | "completed" | "failed" | "cancelled",
      previewData: args.previewData,
      results: args.results,
      progress: args.progress || {
        total: 1,
        completed: 1,
        failed: 0,
      },
      createdAt: now,
      completedAt: status === "completed" ? now : undefined,
    });
  },
});

/**
 * Update a work item's data
 */
export const updateAIWorkItem = mutation({
  args: {
    sessionId: v.string(),
    workItemId: v.id("aiWorkItems"),
    updates: v.object({
      name: v.optional(v.string()),
      status: v.optional(v.string()),
      results: v.optional(v.any()),
      progress: v.optional(v.object({
        total: v.number(),
        completed: v.number(),
        failed: v.number(),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workItem = await ctx.db.get(args.workItemId);
    if (!workItem) {
      throw new Error("Work item not found");
    }

    // Verify user has access to this work item
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!membership || workItem.organizationId !== membership.organizationId) {
      throw new Error("Access denied");
    }

    // Build update object with proper status type
    const updateData: {
      name?: string;
      status?: "preview" | "approved" | "executing" | "completed" | "failed" | "cancelled";
      completedAt?: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results?: any;
      progress?: { total: number; completed: number; failed: number };
    } = {};

    if (args.updates.name !== undefined) {
      updateData.name = args.updates.name;
    }

    if (args.updates.status !== undefined) {
      // Validate status against the union type in schema
      const validStatuses = ["preview", "approved", "executing", "completed", "failed", "cancelled"] as const;
      if (validStatuses.includes(args.updates.status as typeof validStatuses[number])) {
        updateData.status = args.updates.status as typeof validStatuses[number];
      }
      if (args.updates.status === "completed") {
        updateData.completedAt = Date.now();
      }
    }

    if (args.updates.results !== undefined) {
      updateData.results = args.updates.results;
    }

    if (args.updates.progress !== undefined) {
      updateData.progress = args.updates.progress;
    }

    // Update the work item
    await ctx.db.patch(args.workItemId, updateData);

    return { success: true, workItemId: args.workItemId };
  },
});

/**
 * Delete a work item
 */
export const deleteAIWorkItem = mutation({
  args: {
    sessionId: v.string(),
    workItemId: v.id("aiWorkItems"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workItem = await ctx.db.get(args.workItemId);
    if (!workItem) {
      throw new Error("Work item not found");
    }

    // Verify user has access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!membership || workItem.organizationId !== membership.organizationId) {
      throw new Error("Access denied");
    }

    // Delete the work item
    await ctx.db.delete(args.workItemId);

    return { success: true, workItemId: args.workItemId };
  },
});
