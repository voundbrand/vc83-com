# Phase 2.5 Step 10: Agent Self-Improvement Loop — Level 2 Self-Writing

## Goal
Agents autonomously improve themselves through a continuous feedback loop: observe patterns, reflect, propose changes, learn from approvals/rejections. This combines soul evolution (Step 7), media handling (Step 9), and team coordination (Steps 3-6) into a **closed-loop self-improvement system** where agents get measurably better over time.

## Depends On
- Step 7 (Soul Evolution) — proposal infrastructure
- Step 8 (Telegram Group) — owner visibility into agent behavior
- Step 9 (Rich Media) — agents handle diverse content types
- Working credit system + session history

## Inspiration

Peter Steinberger's agent forgot it couldn't handle audio — and **built the capability itself**. The agent:
1. Received a message type it couldn't handle
2. Introspected its tool access
3. Composed a solution from available primitives
4. Responded as if it always could do this

We're building the infrastructure for this emergence. Step 9 gave agents the tools. Step 10 gives them the **learning loop** so they get better at using those tools and continuously expand their capabilities.

## Architecture

```
The Self-Improvement Loop
═══════════════════════════════════════════

  ┌─────────────────────────────────────┐
  │         OBSERVE                      │
  │  Track conversation outcomes:        │
  │  - Customer satisfaction signals     │
  │  - Escalation frequency             │
  │  - Unanswered question patterns     │
  │  - Tool usage success/failure       │
  │  - Owner corrections                │
  └──────────┬──────────────────────────┘
             │
             ▼
  ┌─────────────────────────────────────┐
  │         REFLECT                      │
  │  Periodic self-analysis:             │
  │  - Review last N conversations      │
  │  - Compare behavior to soul rules   │
  │  - Identify gaps and patterns       │
  │  - Score own performance            │
  └──────────┬──────────────────────────┘
             │
             ▼
  ┌─────────────────────────────────────┐
  │         PROPOSE                      │
  │  Generate improvement proposals:     │
  │  - Soul updates (personality/rules) │
  │  - FAQ additions (knowledge gaps)   │
  │  - Tool capability requests         │
  │  - Escalation rule changes          │
  └──────────┬──────────────────────────┘
             │
             ▼
  ┌─────────────────────────────────────┐
  │         LEARN                        │
  │  Track approval/rejection history:   │
  │  - Owner approved → reinforce       │
  │  - Owner rejected → understand why  │
  │  - Calibrate future proposals       │
  │  - Track improvement metrics        │
  └──────────┬──────────────────────────┘
             │
             └──────► back to OBSERVE
```

## Changes

### 1. convex/schema.ts — Add analytics tables

```typescript
// Conversation outcome signals
agentConversationMetrics: defineTable({
  organizationId: v.id("organizations"),
  agentId: v.id("objects"),
  sessionId: v.id("agentSessions"),
  channel: v.string(),

  // Outcome signals
  messageCount: v.number(),
  toolCallCount: v.number(),
  toolFailureCount: v.number(),
  escalated: v.boolean(),          // Was a human brought in?
  customerSentiment: v.optional(v.union(
    v.literal("positive"),
    v.literal("neutral"),
    v.literal("negative"),
    v.literal("unknown"),
  )),
  ownerCorrected: v.boolean(),     // Did the owner intervene with corrections?
  unansweredQuestions: v.optional(v.array(v.string())),  // Questions agent couldn't answer
  mediaTypesHandled: v.optional(v.array(v.string())),    // Audio, image, etc.

  // Timing
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  avgResponseTimeMs: v.optional(v.number()),

  // Self-assessment
  selfScore: v.optional(v.number()),  // Agent's self-rating 1-10
  selfNotes: v.optional(v.string()),  // Agent's self-reflection on this conversation
})
  .index("by_agent", ["agentId", "startedAt"])
  .index("by_org", ["organizationId", "startedAt"]),

// Soul evolution audit trail
soulVersionHistory: defineTable({
  agentId: v.id("objects"),
  organizationId: v.id("organizations"),
  version: v.number(),
  previousSoul: v.string(),   // JSON snapshot
  newSoul: v.string(),        // JSON snapshot
  changeType: v.string(),     // "soul_proposal_applied", "owner_direct_edit", "reflection_auto"
  proposalId: v.optional(v.id("soulProposals")),
  changedAt: v.number(),
})
  .index("by_agent_version", ["agentId", "version"]),

// Improvement proposals rejection learning
proposalFeedback: defineTable({
  organizationId: v.id("organizations"),
  agentId: v.id("objects"),
  proposalId: v.id("soulProposals"),
  outcome: v.union(v.literal("approved"), v.literal("rejected")),
  ownerFeedback: v.optional(v.string()),  // Why they rejected (if provided)
  proposalSummary: v.string(),            // What was proposed
  learnedRule: v.optional(v.string()),    // What the agent learned from this feedback
  createdAt: v.number(),
})
  .index("by_agent", ["agentId", "createdAt"]),
```

### 2. NEW: convex/ai/selfImprovement.ts — The Improvement Loop Engine

```typescript
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

let _apiCache: any = null;
function getInternal(): any {
  if (!_apiCache) _apiCache = require("../_generated/api").internal;
  return _apiCache;
}

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
      getInternal().ai.agentSessions.getSessionMessages,
      { sessionId: args.sessionId }
    );

    if (!messages?.length) return;

    // 2. Count metrics
    const messageCount = messages.length;
    const toolCalls = messages.filter((m: any) => m.toolCalls?.length > 0);
    const toolCallCount = toolCalls.reduce((sum: number, m: any) => sum + (m.toolCalls?.length || 0), 0);
    const toolFailures = toolCalls.filter((m: any) =>
      m.toolCalls?.some((tc: any) => tc.result?.error)
    ).length;

    // 3. Detect escalation (did the PM tag someone in?)
    const escalated = messages.some((m: any) =>
      m.content?.includes("tag_in_specialist") || m.content?.includes("Let me bring in")
    );

    // 4. Detect owner corrections (messages from owner in team group context)
    const ownerCorrected = messages.some((m: any) =>
      m.role === "user" && (m as any).metadata?.isOwnerInstruction
    );

    // 5. Find unanswered questions (agent said "I don't know" or similar)
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
          // The previous user message is likely the unanswered question
          const prevUser = messages.slice(0, i).reverse().find((m: any) => m.role === "user");
          if (prevUser?.content) {
            unansweredQuestions.push(prevUser.content.slice(0, 200));
          }
        }
      }
    }

    // 6. Detect media types handled
    const mediaTypesHandled = messages
      .filter((m: any) => m.toolCalls?.some((tc: any) =>
        ["transcribe_audio", "analyze_image", "parse_document"].includes(tc.name)
      ))
      .flatMap((m: any) => m.toolCalls?.map((tc: any) => tc.name) || []);

    // 7. Sentiment heuristic (simple version — upgrade to LLM-based later)
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
      .filter((m: any) => m.role === "assistant" && m._creationTime)
      .map((m: any) => m._creationTime);
    const userTimes = messages
      .filter((m: any) => m.role === "user" && m._creationTime)
      .map((m: any) => m._creationTime);
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
      getInternal().ai.selfImprovement.storeConversationMetrics,
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

// ============================================================================
// PHASE 2: REFLECT — Periodic self-analysis
// ============================================================================

/**
 * Daily reflection — reviews metrics and generates improvement proposals.
 * Run by a Convex cron job: once per day per active agent.
 */
export const dailyReflection = internalAction({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // 1. Load agent + soul
    const agent = await ctx.runQuery(
      getInternal().agentOntology.getAgentInternal,
      { agentId: args.agentId }
    );
    if (!agent) return;
    const soul = (agent.customProperties as any)?.soul;

    // 2. Load metrics from the last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const metrics = await ctx.runQuery(
      getInternal().ai.selfImprovement.getMetricsSince,
      { agentId: args.agentId, since: weekAgo }
    );

    if (!metrics?.length || metrics.length < 3) {
      return { skipped: true, reason: "Not enough conversations to reflect on" };
    }

    // 3. Load proposal feedback history (what the owner approved/rejected)
    const feedback = await ctx.runQuery(
      getInternal().ai.selfImprovement.getRecentFeedback,
      { agentId: args.agentId, limit: 10 }
    );

    // 4. Compute aggregate stats
    const stats = {
      totalConversations: metrics.length,
      avgMessageCount: (metrics.reduce((s: number, m: any) => s + m.messageCount, 0) / metrics.length).toFixed(1),
      escalationRate: ((metrics.filter((m: any) => m.escalated).length / metrics.length) * 100).toFixed(0) + "%",
      ownerCorrectionRate: ((metrics.filter((m: any) => m.ownerCorrected).length / metrics.length) * 100).toFixed(0) + "%",
      positiveRate: ((metrics.filter((m: any) => m.customerSentiment === "positive").length / metrics.length) * 100).toFixed(0) + "%",
      negativeRate: ((metrics.filter((m: any) => m.customerSentiment === "negative").length / metrics.length) * 100).toFixed(0) + "%",
      toolFailureRate: metrics.some((m: any) => m.toolCallCount > 0)
        ? ((metrics.reduce((s: number, m: any) => s + m.toolFailureCount, 0)
          / metrics.reduce((s: number, m: any) => s + m.toolCallCount, 0)) * 100).toFixed(0) + "%"
        : "N/A",
      unansweredTopics: Array.from(new Set(
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
${stats.unansweredTopics.join("\n") || "None identified"}
=== END QUESTIONS ===

=== PAST PROPOSAL FEEDBACK (what the owner approved/rejected) ===
${feedback?.map((f: any) => `${f.outcome}: "${f.proposalSummary}" ${f.ownerFeedback ? `(Owner said: ${f.ownerFeedback})` : ""}`).join("\n") || "No past proposals"}
=== END FEEDBACK ===

Based on this analysis, generate 0-3 improvement proposals. Consider:
1. Knowledge gaps: questions you couldn't answer → propose FAQ additions
2. Behavior tuning: if correction rate is high → propose rule changes
3. Escalation patterns: if escalating too much → propose capability improvements
4. Sentiment: if negative rate is high → propose communication style changes

IMPORTANT calibration rules:
- If the owner has REJECTED similar proposals before, don't re-propose them
- If metrics are generally good (>70% positive, <10% corrections), propose 0-1 changes max
- Quality over quantity — only propose changes backed by clear metric evidence

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
            getInternal().ai.selfImprovement.updateMetricSelfScore,
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
        (p: any) => p.confidence !== "low"
      );

      for (const p of proposals) {
        await ctx.runMutation(
          getInternal().ai.soulEvolution.createProposal,
          {
            organizationId: args.organizationId,
            agentId: args.agentId,
            proposalType: p.proposalType,
            targetField: p.targetField,
            currentValue: p.currentValue,
            proposedValue: p.proposedValue,
            reason: `[Daily Reflection] ${p.reason}`,
            triggerType: "reflection",
            evidenceMessages: [],
          }
        );
      }

      // Notify owner if there are proposals
      if (proposals.length > 0) {
        const mapping = await ctx.runQuery(
          getInternal().onboarding.telegramResolver.getMappingByOrg,
          { organizationId: args.organizationId }
        );

        if (mapping?.telegramChatId) {
          for (const proposalId of proposals) {
            // Proposals were just created — get their IDs from the DB
            // (Simplified: in practice, createProposal returns the ID)
          }
          // Batch notification
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (botToken && mapping.telegramChatId) {
            const agentName = soul?.name || (agent.customProperties as any)?.displayName || "Your agent";
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: mapping.telegramChatId,
                text: `*${agentName}* completed its daily reflection (score: ${parsed.selfScore}/10) and has ${proposals.length} improvement suggestion(s). Check your pending proposals.`,
                parse_mode: "Markdown",
              }),
            });
          }
        }
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
// PHASE 3: LEARN — Track feedback patterns
// ============================================================================

/**
 * Record feedback when an owner approves/rejects a proposal.
 * Called from soulEvolution.ts after approve/reject.
 */
export const recordProposalFeedback = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    proposalId: v.id("soulProposals"),
    outcome: v.union(v.literal("approved"), v.literal("rejected")),
    ownerFeedback: v.optional(v.string()),
    proposalSummary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("proposalFeedback", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

/**
 * Cron job: run daily reflection for all active agents.
 * Register in convex/crons.ts:
 *
 * crons.daily(
 *   "agent-daily-reflection",
 *   { hourUTC: 6, minuteUTC: 0 },
 *   internal.ai.selfImprovement.runAllDailyReflections
 * );
 */
export const runAllDailyReflections = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all active orgs with agents
    const orgs = await ctx.runQuery(
      getInternal().ai.selfImprovement.getOrgsWithActiveAgents
    );

    for (const org of (orgs || [])) {
      // Schedule each reflection to avoid timeout
      await ctx.scheduler.runAfter(0,
        getInternal().ai.selfImprovement.dailyReflection,
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
 * Called by a cron that checks for sessions with no messages in the last 30 minutes.
 */
export const detectIdleSessions = internalAction({
  args: {},
  handler: async (ctx) => {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;

    const idleSessions = await ctx.runQuery(
      getInternal().ai.selfImprovement.getNewlyIdleSessions,
      { idleSince: thirtyMinAgo }
    );

    for (const session of (idleSessions || [])) {
      await ctx.scheduler.runAfter(0,
        getInternal().ai.selfImprovement.recordConversationMetrics,
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
    // Get all active org_agent objects
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
    // Find sessions where lastMessageAt < idleSince and not yet recorded
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
```

### 3. convex/ai/agentExecution.ts — Hook metric recording

After a response is sent, schedule idle detection:

```typescript
// At the end of processInboundMessage, after response is sent:

// Update session lastMessageAt for idle detection
await ctx.runMutation(
  getInternal().ai.agentSessions.updateSessionActivity,
  { sessionId: session._id, lastMessageAt: Date.now() }
);
```

### 4. convex/ai/soulEvolution.ts — Hook feedback recording

In `approveProposal` and `rejectProposal`, record feedback for the learning loop:

```typescript
// In approveProposal, after marking as approved:
await ctx.db.insert("proposalFeedback", {
  organizationId: proposal.organizationId,
  agentId: proposal.agentId,
  proposalId: args.proposalId,
  outcome: "approved",
  proposalSummary: `${proposal.proposalType} ${proposal.targetField}: ${proposal.proposedValue}`,
  createdAt: Date.now(),
});

// In rejectProposal, similarly:
await ctx.db.insert("proposalFeedback", {
  organizationId: proposal.organizationId,
  agentId: proposal.agentId,
  proposalId: args.proposalId,
  outcome: "rejected",
  proposalSummary: `${proposal.proposalType} ${proposal.targetField}: ${proposal.proposedValue}`,
  createdAt: Date.now(),
});
```

### 5. convex/ai/harness.ts — Performance awareness

Add performance context so the agent knows how it's doing:

```typescript
// After team section, add performance summary:

if (sessionStats?.performanceSummary) {
  lines.push("\n**Your recent performance:**");
  const perf = sessionStats.performanceSummary;
  lines.push(`- Conversations this week: ${perf.totalConversations}`);
  lines.push(`- Customer satisfaction: ${perf.positiveRate} positive`);
  if (perf.unansweredTopics?.length) {
    lines.push(`- Knowledge gaps: ${perf.unansweredTopics.slice(0, 3).join(", ")}`);
  }
  if (perf.pendingProposals > 0) {
    lines.push(`- ${perf.pendingProposals} improvement proposals pending owner review`);
  }
  lines.push("Use this awareness to guide your responses. If you notice a pattern, propose a soul update.");
}
```

### 6. convex/schemas/agentSessionSchemas.ts — Add tracking fields

```typescript
// Add to agentSessions table:
metricsRecorded: v.optional(v.boolean()),  // Has this session's metrics been captured?
lastMessageAt: v.optional(v.number()),     // For idle detection
```

### 7. convex/crons.ts — Schedule the loops

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily self-reflection at 6 AM UTC
crons.daily(
  "agent-daily-reflection",
  { hourUTC: 6, minuteUTC: 0 },
  internal.ai.selfImprovement.runAllDailyReflections,
);

// Session idle detection every 15 minutes
crons.interval(
  "detect-idle-sessions",
  { minutes: 15 },
  internal.ai.selfImprovement.detectIdleSessions,
);

export default crons;
```

## The Soul Version History

Every time a proposal is applied, we snapshot the soul before and after:

```typescript
// In soulEvolution.applyProposal, before modifying:

await ctx.db.insert("soulVersionHistory", {
  agentId: proposal.agentId,
  organizationId: proposal.organizationId,
  version: (soul.version || 1) + 1,
  previousSoul: JSON.stringify(soul),
  newSoul: JSON.stringify(newSoul),
  changeType: "soul_proposal_applied",
  proposalId: args.proposalId,
  changedAt: Date.now(),
});
```

This creates a **full audit trail** — the owner can see exactly how their agent evolved over time, which proposals were applied, and what the agent was like at any point.

## Verification

1. `npx convex typecheck` — passes
2. Have 5+ conversations with an agent → verify `agentConversationMetrics` records created
3. Wait 30 minutes (or trigger manually) → idle detection fires → metrics recorded
4. Run `dailyReflection` manually → verify self-score and proposals generated
5. Approve a proposal → verify `proposalFeedback` recorded
6. Reject a proposal → verify feedback recorded
7. Run reflection again → verify agent doesn't re-propose rejected changes
8. Check `soulVersionHistory` → verify snapshots for each applied change
9. Verify cron jobs registered in Convex dashboard

## Complexity: High
- 1 new file (`selfImprovement.ts`)
- 4 modified files (`agentExecution.ts`, `soulEvolution.ts`, `harness.ts`, `agentSessionSchemas.ts`)
- 3 new schema tables (`agentConversationMetrics`, `soulVersionHistory`, `proposalFeedback`)
- 1 new file (`crons.ts`) or additions to existing cron config

## Cost Considerations
- **Daily reflection:** 1 LLM call per agent per day (~$0.01-0.03 via OpenRouter)
- **Metric recording:** Pure database operations (no LLM cost)
- **Idle detection:** Query-only (no LLM cost)
- **Total daily cost:** ~$0.03 per active agent for the self-improvement loop

## The Bigger Picture

```
Week 1: Agent bootstrapped with generated soul (Step 5)
         → Handles basic queries, escalates everything else

Week 2: Soul Evolution kicks in (Step 7)
         → Agent proposes FAQ additions for common questions
         → Owner approves → agent handles them next time

Week 3: Self-Improvement Loop running (Step 10)
         → Daily reflections identify: "Customers asking about group bookings
            but I'm escalating 80% of those conversations"
         → Proposes: ADD to alwaysDo: "Offer group booking options proactively"
         → Owner approves → escalation rate drops

Week 4: Agent is noticeably better
         → Handles 90% of conversations independently
         → Escalation rate: 15% (down from 80%)
         → Customer satisfaction: 78% positive (up from 45%)
         → Soul version: v7 (evolved through 6 approved proposals)
```

The agent gets **measurably better every week** — and the owner can see exactly how and why.

## The "Wow" Moment

```
[Owner's Telegram DM — Monday morning]

Quinn: Good morning! Here's your weekly agent report:

  📊 Haff's Performance (last 7 days)
  ├── 47 conversations handled
  ├── 82% positive sentiment (↑ from 71%)
  ├── 12% escalation rate (↓ from 23%)
  ├── Avg response: 3.2 seconds
  └── Soul version: v5

  💡 Haff completed daily reflection (score: 8/10)
  and has 2 improvement suggestions:

  1. ADD FAQ: "Do you offer gift certificates?"
     Reason: 4 customers asked this week, I had to say
     I didn't know each time.

  2. MODIFY closingStyle: "Always ask if there's anything
     else before ending, then wish them a great day on
     the water"
     Reason: 3 conversations ended abruptly — I think a
     warmer closing would improve satisfaction.

  [Review Proposals]
```
