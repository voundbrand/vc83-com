/**
 * SELF-IMPROVEMENT LOOP
 *
 * The engine that drives continuous agent improvement.
 * Runs as scheduled jobs and inline hooks.
 *
 * Four phases: Observe → Reflect → Propose → Learn
 */

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

// ============================================================================
// PHASE 1: OBSERVE — Track conversation outcomes
// ============================================================================

/**
 * Called at the end of each conversation (after session goes idle).
 * Extracts metrics and signals from the conversation.
 */
export const recordConversationMetrics = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    channel: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Load session messages
    const messages = await (ctx as any).runQuery(
      generatedApi.internal.ai.agentSessions.getSessionMessages,
      { sessionId: args.sessionId }
    );

    if (!messages?.length) return;

    // 2. Count metrics
    const messageCount = messages.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolCalls = messages.filter((m: any) => m.toolCalls?.length > 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolCallCount = toolCalls.reduce((sum: number, m: any) => sum + (m.toolCalls?.length || 0), 0);
    const toolFailures = toolCalls.filter((m: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      m.toolCalls?.some((tc: any) => tc.result?.error)
    ).length;

    // 3. Detect escalation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const escalated = messages.some((m: any) =>
      m.content?.includes("tag_in_specialist") || m.content?.includes("Let me bring in")
    );

    // 4. Detect owner corrections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownerCorrected = messages.some((m: any) =>
      m.role === "user" && m.metadata?.isOwnerInstruction
    );

    // 5. Find unanswered questions
    const unknownPatterns = [
      "I don't have that information",
      "I'm not sure about",
      "I don't know",
      "let me check with",
      "I'll need to find out",
    ];
    const unansweredQuestions: string[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "assistant") {
        const lower = msg.content?.toLowerCase() || "";
        if (unknownPatterns.some(p => lower.includes(p.toLowerCase()))) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prevUser = messages.slice(0, i).reverse().find((m: any) => m.role === "user");
          if (prevUser?.content) {
            unansweredQuestions.push(prevUser.content.slice(0, 200));
          }
        }
      }
    }

    // 6. Detect media types handled
    const mediaTypesHandled = messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.toolCalls?.some((tc: any) =>
        ["transcribe_audio", "analyze_image", "parse_document"].includes(tc.name)
      ))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .flatMap((m: any) => m.toolCalls?.map((tc: any) => tc.name) || []);

    // 7. Sentiment heuristic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
    const lastContent = lastUserMsg?.content?.toLowerCase() || "";
    let customerSentiment: "positive" | "neutral" | "negative" | "unknown" = "unknown";
    const positiveSignals = ["thank", "great", "perfect", "awesome", "love", "excellent"];
    const negativeSignals = ["terrible", "awful", "worst", "frustrated", "angry", "useless", "disappointed"];
    if (positiveSignals.some(s => lastContent.includes(s))) customerSentiment = "positive";
    else if (negativeSignals.some(s => lastContent.includes(s))) customerSentiment = "negative";
    else if (messages.length > 2) customerSentiment = "neutral";

    // 8. Calculate response time
    const assistantTimes = messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.role === "assistant" && m._creationTime)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m._creationTime as number);
    const userTimes = messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.role === "user" && m._creationTime)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m._creationTime as number);
    let avgResponseTimeMs: number | undefined;
    if (assistantTimes.length > 0 && userTimes.length > 0) {
      const responseTimes: number[] = [];
      for (const aTime of assistantTimes) {
        const prevUserTime = userTimes.filter((t: number) => t < aTime).pop();
        if (prevUserTime) responseTimes.push(aTime - prevUserTime);
      }
      if (responseTimes.length > 0) {
        avgResponseTimeMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }
    }

    // 9. Store metrics
    await (ctx as any).runMutation(
      generatedApi.internal.ai.selfImprovement.storeConversationMetrics,
      {
        organizationId: args.organizationId,
        agentId: args.agentId,
        sessionId: args.sessionId,
        channel: args.channel,
        messageCount,
        toolCallCount,
        toolFailureCount: toolFailures,
        escalated,
        customerSentiment,
        ownerCorrected,
        unansweredQuestions: unansweredQuestions.length > 0 ? unansweredQuestions : undefined,
        mediaTypesHandled: mediaTypesHandled.length > 0 ? mediaTypesHandled : undefined,
        startedAt: messages[0]?._creationTime || Date.now(),
        endedAt: messages[messages.length - 1]?._creationTime,
        avgResponseTimeMs,
      }
    );

    // Mark session as metrics recorded
    await (ctx as any).runMutation(
      generatedApi.internal.ai.selfImprovement.markSessionMetricsRecorded,
      { sessionId: args.sessionId }
    );
  },
});

export const storeConversationMetrics = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    sessionId: v.id("agentSessions"),
    channel: v.string(),
    messageCount: v.number(),
    toolCallCount: v.number(),
    toolFailureCount: v.number(),
    escalated: v.boolean(),
    customerSentiment: v.optional(v.union(
      v.literal("positive"), v.literal("neutral"), v.literal("negative"), v.literal("unknown")
    )),
    ownerCorrected: v.boolean(),
    unansweredQuestions: v.optional(v.array(v.string())),
    mediaTypesHandled: v.optional(v.array(v.string())),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    avgResponseTimeMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentConversationMetrics", args);
  },
});

export const markSessionMetricsRecorded = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { metricsRecorded: true });
  },
});

// ============================================================================
// PHASE 2: REFLECT — Periodic self-analysis
// ============================================================================

/**
 * Daily reflection — reviews metrics and generates improvement proposals.
 */
export const dailyReflection = internalAction({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Consolidated path: reuse the soulEvolution reflection runtime so we only
    // maintain one reflection engine and policy guard surface.
    return await (ctx as any).runAction(
      generatedApi.internal.ai.soulEvolution.runSelfReflection,
      {
        agentId: args.agentId,
        organizationId: args.organizationId,
      }
    );
  },
});

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

/**
 * Cron job: run daily reflection for all active agents.
 */
export const runAllDailyReflections = internalAction({
  args: {},
  handler: async (ctx) => {
    // Consolidated scheduler path: delegate to soulEvolution.scheduledReflection.
    return await (ctx as any).runAction(
      generatedApi.internal.ai.soulEvolution.scheduledReflection,
      {}
    );
  },
});

/**
 * Session idle detector — triggers metric recording when a session goes quiet.
 */
export const detectIdleSessions = internalAction({
  args: {},
  handler: async (ctx) => {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;

    const idleSessions = await (ctx as any).runQuery(
      generatedApi.internal.ai.selfImprovement.getNewlyIdleSessions,
      { idleSince: thirtyMinAgo }
    );

    for (const session of (idleSessions || [])) {
      await ctx.scheduler.runAfter(0,
        generatedApi.internal.ai.selfImprovement.recordConversationMetrics,
        {
          sessionId: session._id,
          organizationId: session.organizationId,
          agentId: session.agentId,
          channel: session.channel,
        }
      );
    }
  },
});

// ============================================================================
// QUERIES
// ============================================================================

export const getMetricsSince = internalQuery({
  args: {
    agentId: v.id("objects"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentConversationMetrics")
      .withIndex("by_agent", (q) =>
        q.eq("agentId", args.agentId).gte("startedAt", args.since)
      )
      .collect();
  },
});

export const getRecentFeedback = internalQuery({
  args: {
    agentId: v.id("objects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proposalFeedback")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(args.limit || 10);
  },
});

export const getOrgsWithActiveAgents = internalQuery({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db
      .query("objects")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "org_agent"),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    return agents.map(a => ({
      agentId: a._id,
      organizationId: a.organizationId,
    }));
  },
});

export const getNewlyIdleSessions = internalQuery({
  args: {
    idleSince: v.number(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("agentSessions")
      .filter((q) =>
        q.and(
          q.lt(q.field("lastMessageAt"), args.idleSince),
          q.neq(q.field("metricsRecorded"), true)
        )
      )
      .take(50);

    return sessions;
  },
});

export const updateMetricSelfScore = internalMutation({
  args: {
    metricId: v.id("agentConversationMetrics"),
    selfScore: v.number(),
    selfNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.metricId, {
      selfScore: args.selfScore,
      selfNotes: args.selfNotes,
    });
  },
});
