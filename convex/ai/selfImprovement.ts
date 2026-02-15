/**
 * SELF-IMPROVEMENT LOOP
 *
 * The engine that drives continuous agent improvement.
 * Runs as scheduled jobs and inline hooks.
 *
 * Four phases: Observe → Reflect → Propose → Learn
 */

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

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
    const messages = await ctx.runQuery(
      internal.ai.agentSessions.getSessionMessages,
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
    await ctx.runMutation(
      internal.ai.selfImprovement.storeConversationMetrics,
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
    await ctx.runMutation(
      internal.ai.selfImprovement.markSessionMetricsRecorded,
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
    // 1. Load agent + soul
    const agent = await ctx.runQuery(
      internal.agentOntology.getAgentInternal,
      { agentId: args.agentId }
    );
    if (!agent) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const soul = (agent.customProperties as any)?.soul;

    // 2. Load metrics from the last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const metrics = await ctx.runQuery(
      internal.ai.selfImprovement.getMetricsSince,
      { agentId: args.agentId, since: weekAgo }
    );

    if (!metrics?.length || metrics.length < 3) {
      return { skipped: true, reason: "Not enough conversations to reflect on" };
    }

    // 3. Load proposal feedback history
    const feedback = await ctx.runQuery(
      internal.ai.selfImprovement.getRecentFeedback,
      { agentId: args.agentId, limit: 10 }
    );

    // 4. Compute aggregate stats
    const stats = {
      totalConversations: metrics.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      avgMessageCount: (metrics.reduce((s: number, m: any) => s + m.messageCount, 0) / metrics.length).toFixed(1),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      escalationRate: ((metrics.filter((m: any) => m.escalated).length / metrics.length) * 100).toFixed(0) + "%",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ownerCorrectionRate: ((metrics.filter((m: any) => m.ownerCorrected).length / metrics.length) * 100).toFixed(0) + "%",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      positiveRate: ((metrics.filter((m: any) => m.customerSentiment === "positive").length / metrics.length) * 100).toFixed(0) + "%",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      negativeRate: ((metrics.filter((m: any) => m.customerSentiment === "negative").length / metrics.length) * 100).toFixed(0) + "%",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolFailureRate: metrics.some((m: any) => m.toolCallCount > 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? ((metrics.reduce((s: number, m: any) => s + m.toolFailureCount, 0)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          / metrics.reduce((s: number, m: any) => s + m.toolCallCount, 0)) * 100).toFixed(0) + "%"
        : "N/A",
      unansweredTopics: Array.from(new Set(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metrics.flatMap((m: any) => m.unansweredQuestions || [])
      )).slice(0, 10),
    };

    // 5. Build reflection prompt
    const { OpenRouterClient } = await import("./openrouter");
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return;
    const client = new OpenRouterClient(apiKey);

    const reflectionPrompt = `You are an AI agent performing daily self-reflection. Review your performance metrics and propose improvements.

=== YOUR CURRENT SOUL ===
${JSON.stringify(soul, null, 2)}
=== END SOUL ===

=== PERFORMANCE METRICS (last 7 days) ===
${JSON.stringify(stats, null, 2)}
=== END METRICS ===

=== QUESTIONS YOU COULDN'T ANSWER ===
${(stats.unansweredTopics as string[]).join("\n") || "None identified"}
=== END QUESTIONS ===

=== PAST PROPOSAL FEEDBACK (what the owner approved/rejected) ===
${feedback?.map((f: any) => `${f.outcome}: "${f.proposalSummary}" ${f.ownerFeedback ? `(Owner said: ${f.ownerFeedback})` : ""}`).join("\n") || "No past proposals"}
=== END FEEDBACK ===

Based on this analysis, generate 0-3 improvement proposals. Consider:
1. Knowledge gaps: questions you couldn't answer -> propose FAQ additions
2. Behavior tuning: if correction rate is high -> propose rule changes
3. Escalation patterns: if escalating too much -> propose capability improvements
4. Sentiment: if negative rate is high -> propose communication style changes

IMPORTANT calibration rules:
- If the owner has REJECTED similar proposals before, don't re-propose them
- If metrics are generally good (>70% positive, <10% corrections), propose 0-1 changes max
- Quality over quantity -- only propose changes backed by clear metric evidence

Output JSON:
{
  "selfScore": 1-10,
  "selfNotes": "Brief reflection on your performance this week",
  "proposals": [
    {
      "proposalType": "add|modify|remove|add_faq",
      "targetField": "field name",
      "proposedValue": "the change",
      "reason": "evidence from metrics",
      "confidence": "high|medium|low"
    }
  ]
}

Output ONLY valid JSON.`;

    const response = await client.chatCompletion({
      model: "anthropic/claude-sonnet-4.5",
      messages: [
        { role: "system", content: "You are a self-reflective AI agent analyzing your own performance. Be honest and constructive. Output only valid JSON." },
        { role: "user", content: reflectionPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices?.[0]?.message?.content || "{}";

    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : content);

      // Store self-assessment on the latest metrics
      if (parsed.selfScore) {
        const latestMetric = metrics[metrics.length - 1];
        if (latestMetric) {
          await ctx.runMutation(
            internal.ai.selfImprovement.updateMetricSelfScore,
            {
              metricId: latestMetric._id,
              selfScore: parsed.selfScore,
              selfNotes: parsed.selfNotes,
            }
          );
        }
      }

      // Create proposals (only high/medium confidence)
      const proposals = (parsed.proposals || []).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p.confidence !== "low"
      );

      for (const p of proposals) {
        await ctx.runMutation(
          internal.ai.soulEvolution.createProposal,
          {
            organizationId: args.organizationId,
            agentId: args.agentId,
            proposalType: p.proposalType,
            targetField: p.targetField,
            currentValue: p.currentValue,
            proposedValue: p.proposedValue,
            reason: `[Daily Reflection] ${p.reason}`,
            triggerType: "reflection" as const,
            evidenceMessages: [],
          }
        );
      }

      return {
        success: true,
        selfScore: parsed.selfScore,
        proposalCount: proposals.length,
      };
    } catch {
      return { error: "Failed to parse reflection output" };
    }
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
    const orgs = await ctx.runQuery(
      internal.ai.selfImprovement.getOrgsWithActiveAgents
    );

    for (const org of (orgs || [])) {
      await ctx.scheduler.runAfter(0,
        internal.ai.selfImprovement.dailyReflection,
        {
          agentId: org.agentId,
          organizationId: org.organizationId,
        }
      );
    }
  },
});

/**
 * Session idle detector — triggers metric recording when a session goes quiet.
 */
export const detectIdleSessions = internalAction({
  args: {},
  handler: async (ctx) => {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;

    const idleSessions = await ctx.runQuery(
      internal.ai.selfImprovement.getNewlyIdleSessions,
      { idleSince: thirtyMinAgo }
    );

    for (const session of (idleSessions || [])) {
      await ctx.scheduler.runAfter(0,
        internal.ai.selfImprovement.recordConversationMetrics,
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
