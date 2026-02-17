/**
 * AGENT SESSION MANAGEMENT
 *
 * Manages conversations between org agents and external contacts.
 * Sessions are keyed by org + channel + external contact identifier.
 *
 * Flow:
 * 1. Inbound message arrives → resolveSession() finds or creates session
 * 2. resolveContact() matches external identifier to CRM contact
 * 3. Messages stored in agentSessionMessages
 * 4. Stats updated after each exchange
 */

import { query, mutation, internalQuery, internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import {
  getSessionPolicyFromConfig,
  resolveSessionTTL,
  DEFAULT_SESSION_POLICY,
} from "./sessionPolicy";

// Lazy-load internal to avoid circular dependency with _generated/api
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalRef: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternalRef(): any {
  if (!_internalRef) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalRef = require("../_generated/api").internal;
  }
  return _internalRef;
}

interface AgentModelResolutionTelemetry {
  selectedModel: string;
  usedModel?: string;
  selectionSource?: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

interface AgentActionTelemetryRecord {
  performedAt: number;
  modelResolution?: AgentModelResolutionTelemetry;
}

export interface AgentModelFallbackAggregation {
  windowHours: number;
  since: number;
  actionsScanned: number;
  actionsWithModelResolution: number;
  fallbackCount: number;
  fallbackRate: number;
  selectionSources: Array<{ source: string; count: number }>;
  fallbackReasons: Array<{ reason: string; count: number }>;
}

interface AgentToolResultRecord {
  tool?: string;
  status?: string;
}

export interface AgentToolSuccessFailureAggregation {
  windowHours: number;
  since: number;
  toolResultsScanned: number;
  successCount: number;
  failureCount: number;
  pendingCount: number;
  ignoredCount: number;
  successRate: number;
  failureRate: number;
  statusBreakdown: Array<{ status: string; count: number }>;
}

function normalizeAgentModelResolution(
  value: unknown
): AgentModelResolutionTelemetry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.selectedModel !== "string") {
    return null;
  }
  if (typeof record.fallbackUsed !== "boolean") {
    return null;
  }

  return {
    selectedModel: record.selectedModel,
    usedModel: typeof record.usedModel === "string" ? record.usedModel : undefined,
    selectionSource:
      typeof record.selectionSource === "string"
        ? record.selectionSource
        : undefined,
    fallbackUsed: record.fallbackUsed,
    fallbackReason:
      typeof record.fallbackReason === "string" ? record.fallbackReason : undefined,
  };
}

export function aggregateAgentModelFallback(
  records: AgentActionTelemetryRecord[],
  options: { windowHours: number; since: number }
): AgentModelFallbackAggregation {
  let actionsWithModelResolution = 0;
  let fallbackCount = 0;
  const selectionSourceCounts = new Map<string, number>();
  const fallbackReasonCounts = new Map<string, number>();

  for (const record of records) {
    const modelResolution = normalizeAgentModelResolution(record.modelResolution);
    if (!modelResolution) {
      continue;
    }

    actionsWithModelResolution += 1;
    const selectionSource = modelResolution.selectionSource?.trim().toLowerCase();
    if (selectionSource) {
      selectionSourceCounts.set(
        selectionSource,
        (selectionSourceCounts.get(selectionSource) ?? 0) + 1
      );
    }

    if (!modelResolution.fallbackUsed) {
      continue;
    }

    fallbackCount += 1;
    const fallbackReason = (modelResolution.fallbackReason ?? selectionSource ?? "")
      .trim()
      .toLowerCase();
    if (!fallbackReason) {
      continue;
    }

    fallbackReasonCounts.set(
      fallbackReason,
      (fallbackReasonCounts.get(fallbackReason) ?? 0) + 1
    );
  }

  const fallbackRate =
    actionsWithModelResolution > 0
      ? Number((fallbackCount / actionsWithModelResolution).toFixed(4))
      : 0;

  return {
    windowHours: options.windowHours,
    since: options.since,
    actionsScanned: records.length,
    actionsWithModelResolution,
    fallbackCount,
    fallbackRate,
    selectionSources: Array.from(selectionSourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count })),
    fallbackReasons: Array.from(fallbackReasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count })),
  };
}

function normalizeToolStatus(statusRaw: unknown): string | null {
  if (typeof statusRaw !== "string") {
    return null;
  }
  const normalized = statusRaw.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function aggregateAgentToolSuccessFailure(
  records: AgentToolResultRecord[],
  options: { windowHours: number; since: number }
): AgentToolSuccessFailureAggregation {
  let successCount = 0;
  let failureCount = 0;
  let pendingCount = 0;
  let ignoredCount = 0;
  const statusCounts = new Map<string, number>();

  for (const record of records) {
    const status = normalizeToolStatus(record.status);
    if (!status) {
      ignoredCount += 1;
      continue;
    }

    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    if (status === "success") {
      successCount += 1;
      continue;
    }

    if (status === "failed" || status === "error" || status === "disabled") {
      failureCount += 1;
      continue;
    }

    if (status === "pending_approval" || status === "pending" || status === "proposed") {
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
    windowHours: options.windowHours,
    since: options.since,
    toolResultsScanned: records.length,
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

// ============================================================================
// SESSION RESOLUTION (Internal — called by execution pipeline)
// ============================================================================

/**
 * Find or create a session for this org + channel + contact
 */
export const resolveSession = internalMutation({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    // Look for existing active session
    const existing = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_channel_contact", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("channel", args.channel)
          .eq("externalContactIdentifier", args.externalContactIdentifier)
      )
      .first();

    if (existing && existing.status === "active") {
      // Check if session has expired (TTL or max duration)
      const agentConfig = await ctx.db.get(existing.agentId);
      const configProps = (agentConfig?.customProperties || {}) as Record<string, unknown>;
      const policy = getSessionPolicyFromConfig(configProps);
      const { ttl, maxDuration } = resolveSessionTTL(policy, existing.channel);
      const now = Date.now();

      const isIdle = (now - existing.lastMessageAt) > ttl;
      const isExpired = (now - existing.startedAt) > maxDuration;

      if (isIdle || isExpired) {
        // Close the stale session
        const closeReason = isExpired ? "expired" as const : "idle_timeout" as const;
        await ctx.db.patch(existing._id, {
          status: closeReason === "expired" ? "expired" : "closed",
          closedAt: now,
          closeReason,
        });

        // Schedule async summary generation if policy requires it
        if (policy.onClose === "summarize_and_archive" && existing.messageCount > 2) {
          await ctx.scheduler.runAfter(0, getInternalRef().ai.agentSessions.generateSessionSummary, {
            sessionId: existing._id,
          });
        }

        // Create new session, optionally carrying forward context
        const newSessionData: Record<string, unknown> = {
          agentId: args.agentId,
          organizationId: args.organizationId,
          channel: args.channel,
          externalContactIdentifier: args.externalContactIdentifier,
          status: "active",
          messageCount: 0,
          tokensUsed: 0,
          costUsd: 0,
          startedAt: now,
          lastMessageAt: now,
        };

        // If policy says "resume", carry forward summary context
        if (policy.onReopen === "resume") {
          newSessionData.previousSessionId = existing._id;
          const summary = (existing as Record<string, unknown>).summary as
            | { text: string }
            | undefined;
          if (summary?.text) {
            newSessionData.previousSessionSummary = summary.text;
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newSessionId = await ctx.db.insert("agentSessions", newSessionData as any);
        return await ctx.db.get(newSessionId);
      }

      // Session is still valid — reuse
      return existing;
    }

    // Create new session
    const sessionId = await ctx.db.insert("agentSessions", {
      agentId: args.agentId,
      organizationId: args.organizationId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      status: "active",
      messageCount: 0,
      tokensUsed: 0,
      costUsd: 0,
      startedAt: Date.now(),
      lastMessageAt: Date.now(),
    });

    return await ctx.db.get(sessionId);
  },
});

/**
 * Resolve external identifier to CRM contact
 * Matches by phone (WhatsApp/SMS) or email
 */
export const resolveContact = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    identifier: v.string(),
    channel: v.string(),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const identifier = args.identifier.toLowerCase().trim();

    // Match by phone for phone-based channels
    if (["whatsapp", "sms"].includes(args.channel)) {
      const match = contacts.find((c) => {
        const props = c.customProperties as Record<string, unknown> | undefined;
        const phone = String(props?.phone || "").replace(/\s+/g, "");
        return phone === identifier.replace(/\s+/g, "");
      });
      if (match) return match;
    }

    // Match by email
    const emailMatch = contacts.find((c) => {
      const props = c.customProperties as Record<string, unknown> | undefined;
      return String(props?.email || "").toLowerCase() === identifier;
    });

    return emailMatch ?? null;
  },
});

/**
 * Link a CRM contact to a session
 */
export const linkContactToSession = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    crmContactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      crmContactId: args.crmContactId,
    });
  },
});

/**
 * Upsert session-level routing pin metadata (model + auth profile).
 * Used by failover/stickiness flow to keep routing stable across turns.
 */
export const upsertSessionRoutingPin = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    modelId: v.optional(v.string()),
    authProfileId: v.optional(v.string()),
    pinReason: v.string(),
    unlockReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;

    const now = Date.now();
    const existingPin = (session as Record<string, unknown>).routingPin as
      | {
          modelId?: string;
          authProfileId?: string;
          pinReason: string;
          pinnedAt: number;
          updatedAt: number;
          unlockReason?: string;
          unlockedAt?: number;
        }
      | undefined;

    await ctx.db.patch(args.sessionId, {
      routingPin: {
        modelId: args.modelId ?? existingPin?.modelId,
        authProfileId: args.authProfileId ?? existingPin?.authProfileId,
        pinReason: args.pinReason,
        pinnedAt: existingPin?.pinnedAt ?? now,
        updatedAt: now,
        unlockReason: args.unlockReason,
        unlockedAt: args.unlockReason ? now : undefined,
      },
    });
  },
});

// ============================================================================
// MESSAGE MANAGEMENT (Internal)
// ============================================================================

/**
 * Get conversation history for a session
 */
export const getSessionMessages = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Return most recent N messages, sorted by timestamp
    const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);
    const limit = args.limit || 20;
    return sorted.slice(-limit);
  },
});

/**
 * Add a message to a session
 */
export const addSessionMessage = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    toolCalls: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentSessionMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      toolCalls: args.toolCalls,
      timestamp: Date.now(),
    });
  },
});

// ============================================================================
// SESSION STATS (Internal)
// ============================================================================

/**
 * Update session stats after a message exchange
 */
export const updateSessionStats = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    tokensUsed: v.number(),
    costUsd: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;

    await ctx.db.patch(args.sessionId, {
      messageCount: session.messageCount + 1,
      tokensUsed: session.tokensUsed + args.tokensUsed,
      costUsd: session.costUsd + args.costUsd,
      lastMessageAt: Date.now(),
    });
  },
});

/**
 * Check if agent is within rate limits
 */
export const checkAgentRateLimit = internalQuery({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    maxMessagesPerDay: v.number(),
    maxCostPerDay: v.number(),
  },
  handler: async (ctx, args) => {
    const dayStart = Date.now() - 24 * 60 * 60 * 1000;

    // Get all sessions for this agent today
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    const todaySessions = sessions.filter((s) => s.lastMessageAt >= dayStart);

    const totalMessages = todaySessions.reduce((sum, s) => sum + s.messageCount, 0);
    const totalCost = todaySessions.reduce((sum, s) => sum + s.costUsd, 0);

    if (totalMessages >= args.maxMessagesPerDay) {
      return { allowed: false, message: `Daily message limit reached (${args.maxMessagesPerDay})` };
    }

    if (totalCost >= args.maxCostPerDay) {
      return { allowed: false, message: `Daily cost limit reached ($${args.maxCostPerDay})` };
    }

    return { allowed: true, message: "OK", messagesRemaining: args.maxMessagesPerDay - totalMessages };
  },
});

// ============================================================================
// ERROR STATE TRACKING
// ============================================================================

/**
 * Update session error state (disabled tools, failure counts).
 * Called by the execution pipeline when a tool fails 3+ times.
 */
export const updateSessionErrorState = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    disabledTools: v.array(v.string()),
    failedToolCounts: v.any(),
    degraded: v.optional(v.boolean()),
    degradedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;

    await ctx.db.patch(args.sessionId, {
      errorState: {
        disabledTools: args.disabledTools,
        failedToolCounts: args.failedToolCounts as Record<string, number>,
        lastErrorAt: Date.now(),
        degraded: args.degraded,
        degradedAt: args.degraded ? Date.now() : undefined,
        degradedReason: args.degradedReason,
      },
    });
  },
});

/**
 * Get session error state (for resuming tool disable state).
 */
export const getSessionErrorState = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    return (session as Record<string, unknown>).errorState ?? null;
  },
});

// ============================================================================
// AUDIT LOGGING (Internal)
// ============================================================================

/**
 * Log an agent action to the objectActions audit trail
 */
export const logAgentAction = internalMutation({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    actionType: v.string(),
    actionData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.agentId,
      actionType: args.actionType,
      actionData: args.actionData || {},
      performedBy: args.agentId, // Agent performed the action
      performedAt: Date.now(),
    });
  },
});

// ============================================================================
// SESSION LIFECYCLE (Mix of internal + authenticated)
// ============================================================================

/**
 * Close a session (simple — backward compatible)
 */
export const closeSession = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "closed",
      closedAt: Date.now(),
      closeReason: "manual",
    });
  },
});

/**
 * Close a session with a specific reason and optional summary.
 * Used by TTL expiry, manual close, and handoff flows.
 */
export const closeSessionWithReason = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    reason: v.union(
      v.literal("idle_timeout"),
      v.literal("expired"),
      v.literal("manual"),
      v.literal("handed_off")
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "active") return;

    const status = args.reason === "expired" ? "expired" as const : "closed" as const;

    await ctx.db.patch(args.sessionId, {
      status,
      closedAt: Date.now(),
      closeReason: args.reason,
    });
  },
});

// ============================================================================
// SESSION TTL CLEANUP (Cron handler)
// ============================================================================

/**
 * Expire stale sessions in batches.
 * Called every 15 minutes by the cron scheduler.
 */
export const expireStaleSessions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get a batch of active sessions
    const activeSessions = await ctx.db
      .query("agentSessions")
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(200);

    let closedCount = 0;

    for (const session of activeSessions) {
      // Get agent config to resolve session policy
      const agentConfig = await ctx.db.get(session.agentId);
      const configProps = (agentConfig?.customProperties || {}) as Record<string, unknown>;
      const policy = getSessionPolicyFromConfig(configProps);
      const { ttl, maxDuration } = resolveSessionTTL(policy, session.channel);

      const isIdle = (now - session.lastMessageAt) > ttl;
      const isExpired = (now - session.startedAt) > maxDuration;

      if (isIdle || isExpired) {
        const closeReason = isExpired ? "expired" as const : "idle_timeout" as const;
        const status = closeReason === "expired" ? "expired" as const : "closed" as const;

        await ctx.db.patch(session._id, {
          status,
          closedAt: now,
          closeReason,
        });

        // Schedule async summary generation if policy requires it
        if (policy.onClose === "summarize_and_archive" && session.messageCount > 2) {
          await ctx.scheduler.runAfter(0, getInternalRef().ai.agentSessions.generateSessionSummary, {
            sessionId: session._id,
          });
        }

        closedCount++;
      }
    }

    if (closedCount > 0) {
      console.log(`[SessionCleanup] Closed ${closedCount} stale sessions`);
    }
  },
});

/**
 * Hand off session to a human user (requires auth)
 */
export const handOffSession = mutation({
  args: {
    sessionId: v.string(),
    agentSessionId: v.id("agentSessions"),
    handOffToUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const session = await ctx.db.get(args.agentSessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(args.agentSessionId, {
      status: "handed_off",
      handedOffTo: args.handOffToUserId,
    });

    // Log handoff
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: session.agentId,
      actionType: "session_handed_off",
      actionData: {
        sessionId: args.agentSessionId,
        handedOffTo: args.handOffToUserId,
      },
      performedAt: Date.now(),
    });
  },
});

/**
 * Get active sessions for an org (for UI dashboard)
 */
/**
 * Get recent sessions for an agent (used by soul evolution reflection).
 */
export const getRecentSessionsForAgent = internalQuery({
  args: {
    agentId: v.id("objects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(args.limit ?? 20);
    return sessions;
  },
});

// ============================================================================
// SESSION SUMMARY GENERATION (Async — scheduled on close)
// ============================================================================

/**
 * Save an LLM-generated summary back to a closed session.
 * Called by generateSessionSummary after the LLM produces a summary.
 */
export const updateSessionSummary = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    summary: v.object({
      text: v.string(),
      generatedAt: v.number(),
      messageCount: v.number(),
      topics: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;

    await ctx.db.patch(args.sessionId, {
      summary: args.summary,
    });
  },
});

/**
 * Generate an LLM summary of a closed session's conversation.
 * Scheduled asynchronously when a session closes with onClose="summarize_and_archive".
 * Uses a cheap model to keep costs low.
 */
export const generateSessionSummary = internalAction({
  args: { sessionId: v.id("agentSessions") },
  handler: async (ctx, { sessionId }) => {
    const messages = await ctx.runQuery(
      getInternalRef().ai.agentSessions.getSessionMessages,
      { sessionId, limit: 20 }
    );

    if (messages.length < 3) return; // Not enough to summarize

    const transcript = messages
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("[SessionSummary] OPENROUTER_API_KEY not configured, skipping summary");
      return;
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Summarize this conversation in 2-3 sentences. Focus on: what the customer wanted, what was done, any unresolved issues. Be concise.",
            },
            { role: "user", content: transcript },
          ],
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        console.error(`[SessionSummary] OpenRouter returned ${response.status}`);
        return;
      }

      const data = await response.json();
      const summaryText = data.choices?.[0]?.message?.content;

      if (summaryText) {
        await ctx.runMutation(
          getInternalRef().ai.agentSessions.updateSessionSummary,
          {
            sessionId,
            summary: {
              text: summaryText,
              generatedAt: Date.now(),
              messageCount: messages.length,
            },
          }
        );
      }
    } catch (e) {
      console.error("[SessionSummary] Failed to generate summary:", e);
    }
  },
});

// ============================================================================
// PUBLIC QUERIES (Authenticated — called from frontend UI)
// ============================================================================

/**
 * Aggregate session stats per agent for an organization.
 * Used by AgentsWindow and AgentAnalytics to show per-agent metrics.
 */
export const getAgentStats = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Fetch all sessions for this org (across all statuses)
    const allSessions = await ctx.db
      .query("agentSessions")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    // Group by agentId and aggregate
    const statsMap = new Map<
      string,
      {
        agentId: string;
        totalSessions: number;
        activeSessions: number;
        totalMessages: number;
        totalCostUsd: number;
        totalTokens: number;
        lastMessageAt: number;
      }
    >();

    for (const session of allSessions) {
      const key = session.agentId;
      const existing = statsMap.get(key);

      if (existing) {
        existing.totalSessions += 1;
        existing.activeSessions += session.status === "active" ? 1 : 0;
        existing.totalMessages += session.messageCount;
        existing.totalCostUsd += session.costUsd;
        existing.totalTokens += session.tokensUsed;
        existing.lastMessageAt = Math.max(existing.lastMessageAt, session.lastMessageAt || 0);
      } else {
        statsMap.set(key, {
          agentId: key,
          totalSessions: 1,
          activeSessions: session.status === "active" ? 1 : 0,
          totalMessages: session.messageCount,
          totalCostUsd: session.costUsd,
          totalTokens: session.tokensUsed,
          lastMessageAt: session.lastMessageAt || 0,
        });
      }
    }

    return Array.from(statsMap.values());
  },
});

/**
 * Aggregate retrieval telemetry emitted by agentExecution message_processed logs.
 * Used by Lane C/WS4 quality checks and later SLO dashboards.
 */
export const getRetrievalTelemetry = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;

    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("actionType", "message_processed")
      )
      .collect();

    const toNumber = (value: unknown) => {
      if (typeof value !== "number" || Number.isNaN(value)) return 0;
      return value;
    };

    let messagesScanned = 0;
    let messagesWithRetrieval = 0;
    let docsRetrieved = 0;
    let docsInjected = 0;
    let bytesRetrieved = 0;
    let bytesInjected = 0;
    const sourceTagCounts = new Map<string, number>();

    for (const action of actions) {
      if (action.performedAt < since) continue;
      if (args.agentId && action.objectId !== args.agentId) continue;

      messagesScanned += 1;
      const actionData = (action.actionData || {}) as Record<string, unknown>;
      const retrieval = (actionData.retrieval || null) as Record<string, unknown> | null;
      if (!retrieval) continue;

      messagesWithRetrieval += 1;
      docsRetrieved += toNumber(retrieval.docsRetrieved);
      docsInjected += toNumber(retrieval.docsInjected);
      bytesRetrieved += toNumber(retrieval.bytesRetrieved);
      bytesInjected += toNumber(retrieval.bytesInjected);

      const sourceTags = Array.isArray(retrieval.sourceTags) ? retrieval.sourceTags : [];
      for (const tag of sourceTags) {
        if (typeof tag !== "string") continue;
        const normalizedTag = tag.trim().toLowerCase();
        if (!normalizedTag) continue;
        sourceTagCounts.set(normalizedTag, (sourceTagCounts.get(normalizedTag) ?? 0) + 1);
      }
    }

    return {
      windowHours: clampedHours,
      since,
      messagesScanned,
      messagesWithRetrieval,
      docsRetrieved,
      docsInjected,
      bytesRetrieved,
      bytesInjected,
      avgDocsInjectedPerMessage: messagesWithRetrieval > 0
        ? Number((docsInjected / messagesWithRetrieval).toFixed(2))
        : 0,
      sourceTags: Array.from(sourceTagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, count })),
    };
  },
});

/**
 * Aggregate model fallback rate from agent message_processed audit logs.
 */
export const getModelFallbackRate = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;

    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("actionType", "message_processed")
      )
      .collect();

    const records: AgentActionTelemetryRecord[] = [];
    for (const action of actions) {
      if (action.performedAt < since) {
        continue;
      }
      if (args.agentId && action.objectId !== args.agentId) {
        continue;
      }

      const actionData = (action.actionData || {}) as Record<string, unknown>;
      records.push({
        performedAt: action.performedAt,
        modelResolution: actionData.modelResolution as
          | AgentModelResolutionTelemetry
          | undefined,
      });
    }

    return {
      source: "agent_message_processed",
      ...aggregateAgentModelFallback(records, { windowHours: clampedHours, since }),
    };
  },
});

/**
 * Aggregate tool success/failure ratio from agent message_processed audit logs.
 */
export const getToolSuccessFailureRatio = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;

    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("actionType", "message_processed")
      )
      .collect();

    const records: AgentToolResultRecord[] = [];
    for (const action of actions) {
      if (action.performedAt < since) {
        continue;
      }
      if (args.agentId && action.objectId !== args.agentId) {
        continue;
      }

      const actionData = (action.actionData || {}) as Record<string, unknown>;
      const toolResults = Array.isArray(actionData.toolResults)
        ? actionData.toolResults
        : [];

      for (const result of toolResults) {
        if (!result || typeof result !== "object") {
          records.push({});
          continue;
        }
        const resultRecord = result as Record<string, unknown>;
        records.push({
          tool: typeof resultRecord.tool === "string" ? resultRecord.tool : undefined,
          status:
            typeof resultRecord.status === "string" ? resultRecord.status : undefined,
        });
      }
    }

    return {
      source: "agent_message_processed",
      ...aggregateAgentToolSuccessFailure(records, { windowHours: clampedHours, since }),
    };
  },
});

/**
 * Get messages for a session (authenticated version for the UI).
 * Used by AgentSessionsViewer to display conversation history.
 */
export const getSessionMessagesAuth = query({
  args: {
    sessionId: v.string(),
    agentSessionId: v.id("agentSessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.agentSessionId))
      .collect();

    const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);
    const limit = args.limit || 50;
    return sorted.slice(-limit);
  },
});

export const getActiveSessions = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", (args.status || "active") as "active" | "closed" | "handed_off")
      )
      .collect();

    return sessions;
  },
});
