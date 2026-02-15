/**
 * SOUL EVOLUTION — Backend
 *
 * Mutations and queries for managing soul update proposals.
 * Handles creation, approval, rejection, and application of proposals.
 */

import { action, mutation, query, internalMutation, internalQuery, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { requireAuthenticatedUser } from "../rbacHelpers";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new soul proposal (called by the tool)
 */
export const createProposal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    sessionId: v.optional(v.id("agentSessions")),
    proposalType: v.union(
      v.literal("add"),
      v.literal("modify"),
      v.literal("remove"),
      v.literal("add_faq"),
    ),
    targetField: v.string(),
    currentValue: v.optional(v.string()),
    proposedValue: v.string(),
    reason: v.string(),
    triggerType: v.union(
      v.literal("conversation"),
      v.literal("reflection"),
      v.literal("owner_directed"),
    ),
    evidenceMessages: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("soulProposals", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/**
 * Approve a proposal — called when owner taps [Approve] in Telegram
 */
export const approveProposal = internalMutation({
  args: {
    proposalId: v.id("soulProposals"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.status !== "pending") {
      return { error: "Proposal not found or already processed" };
    }

    // Mark as approved
    await ctx.db.patch(args.proposalId, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedBy: "owner",
    });

    // Record feedback for learning loop (Step 10)
    await ctx.db.insert("proposalFeedback", {
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      proposalId: args.proposalId,
      outcome: "approved",
      proposalSummary: `${proposal.proposalType} ${proposal.targetField}: ${proposal.proposedValue}`,
      createdAt: Date.now(),
    });

    return { success: true, proposal };
  },
});

/**
 * Reject a proposal — called when owner taps [Reject]
 */
export const rejectProposal = internalMutation({
  args: {
    proposalId: v.id("soulProposals"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.status !== "pending") {
      return { error: "Proposal not found or already processed" };
    }

    await ctx.db.patch(args.proposalId, {
      status: "rejected",
      reviewedAt: Date.now(),
      reviewedBy: "owner",
    });

    // Record feedback for learning loop (Step 10)
    await ctx.db.insert("proposalFeedback", {
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      proposalId: args.proposalId,
      outcome: "rejected",
      proposalSummary: `${proposal.proposalType} ${proposal.targetField}: ${proposal.proposedValue}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Apply an approved proposal to the agent's soul
 */
export const applyProposal = internalMutation({
  args: {
    proposalId: v.id("soulProposals"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.status !== "approved") {
      return { error: "Proposal not approved" };
    }

    // Load agent
    const agent = await ctx.db.get(proposal.agentId);
    if (!agent) return { error: "Agent not found" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (agent.customProperties || {}) as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const soul = config.soul || {} as Record<string, any>;

    // Snapshot the soul before modification (for version history)
    const previousSoulSnapshot = JSON.stringify(soul);

    // Apply the change based on proposal type
    const field = proposal.targetField;

    switch (proposal.proposalType) {
      case "add": {
        const current = soul[field] || [];
        if (Array.isArray(current)) {
          soul[field] = [...current, proposal.proposedValue];
        }
        break;
      }
      case "modify": {
        soul[field] = proposal.proposedValue;
        break;
      }
      case "remove": {
        const arr = soul[field] || [];
        if (Array.isArray(arr)) {
          soul[field] = arr.filter((item: string) => item !== proposal.currentValue);
        }
        break;
      }
      case "add_faq": {
        const match = proposal.proposedValue.match(/Q:\s*(.+?)\s*\|\s*A:\s*(.+)/);
        if (match) {
          const faqEntries = config.faqEntries || [];
          faqEntries.push({ q: match[1].trim(), a: match[2].trim() });
          config.faqEntries = faqEntries;
        }
        break;
      }
    }

    // Bump soul version
    soul.version = (soul.version || 1) + 1;
    soul.lastUpdatedAt = Date.now();
    soul.lastUpdatedBy = "agent_self";

    // Save back to agent
    config.soul = soul;
    await ctx.db.patch(proposal.agentId, {
      customProperties: config,
    });

    // Mark proposal as applied
    await ctx.db.patch(args.proposalId, {
      status: "applied",
    });

    // Record version history (Step 10)
    await ctx.db.insert("soulVersionHistory", {
      agentId: proposal.agentId,
      organizationId: proposal.organizationId,
      version: soul.version,
      previousSoul: previousSoulSnapshot,
      newSoul: JSON.stringify(soul),
      changeType: "soul_proposal_applied",
      proposalId: args.proposalId,
      changedAt: Date.now(),
    });

    return { success: true, newSoulVersion: soul.version };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get pending proposals for an agent
 */
export const getPendingProposals = internalQuery({
  args: {
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("soulProposals")
      .withIndex("by_agent_status", (q) =>
        q.eq("agentId", args.agentId).eq("status", "pending")
      )
      .collect();
  },
});

/**
 * Get proposal history for an org (for dashboard/review)
 */
export const getProposalHistory = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("soulProposals")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit || 20);
  },
});

export const getProposalById = internalQuery({
  args: { proposalId: v.id("soulProposals") },
  handler: async (ctx, args) => ctx.db.get(args.proposalId),
});

export const updateProposalTelegram = internalMutation({
  args: {
    proposalId: v.id("soulProposals"),
    telegramMessageId: v.number(),
    telegramChatId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.proposalId, {
      telegramMessageId: args.telegramMessageId,
      telegramChatId: args.telegramChatId,
    });
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Notify owner via Telegram inline buttons when a proposal is created
 */
export const notifyOwnerOfProposal = internalAction({
  args: {
    proposalId: v.id("soulProposals"),
    telegramChatId: v.string(),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.runQuery(
      internal.ai.soulEvolution.getProposalById,
      { proposalId: args.proposalId }
    );

    if (!proposal) return { error: "Proposal not found" };

    // Load agent name
    const agent = await ctx.runQuery(
      internal.agentOntology.getAgentInternal,
      { agentId: proposal.agentId }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentName = (agent?.customProperties as any)?.soul?.name
      || (agent?.customProperties as any)?.displayName
      || "Your agent";

    // Format proposal message
    const typeLabels: Record<string, string> = {
      add: "ADD to",
      modify: "CHANGE",
      remove: "REMOVE from",
      add_faq: "ADD FAQ to",
    };

    const lines = [
      `*${agentName}* wants to update its personality:\n`,
      `*${typeLabels[proposal.proposalType] || proposal.proposalType}* \`${proposal.targetField}\`:`,
      `"${proposal.proposedValue}"\n`,
      `*Reason:* ${proposal.reason}`,
    ];

    if (proposal.currentValue) {
      lines.splice(2, 0, `*Currently:* "${proposal.currentValue}"`);
    }

    const text = lines.join("\n");

    // Send with inline keyboard
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return { error: "No Telegram bot token" };

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: args.telegramChatId,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Approve", callback_data: `soul_approve:${args.proposalId}` },
              { text: "Reject", callback_data: `soul_reject:${args.proposalId}` },
            ],
          ],
        },
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as any;

    // Store the Telegram message ID for later reference
    if (data.ok && data.result?.message_id) {
      await ctx.runMutation(
        internal.ai.soulEvolution.updateProposalTelegram,
        {
          proposalId: args.proposalId,
          telegramMessageId: data.result.message_id,
          telegramChatId: args.telegramChatId,
        }
      );
    }

    return { success: true };
  },
});

/**
 * Handle Telegram callback (approve/reject button tap)
 * Called from the Telegram webhook/bridge when callback_data starts with "soul_"
 */
export const handleTelegramCallback = action({
  args: {
    callbackData: v.string(),
    telegramChatId: v.string(),
    callbackQueryId: v.string(),
  },
  handler: async (ctx, args) => {
    const [actionType, rawProposalId] = args.callbackData.split(":");

    if (!rawProposalId) return { error: "Invalid callback data" };
    const proposalId = rawProposalId as Id<"soulProposals">;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (actionType === "soul_approve") {
      // Approve + apply in sequence
      await ctx.runMutation(
        internal.ai.soulEvolution.approveProposal,
        { proposalId }
      );
      const result = await ctx.runMutation(
        internal.ai.soulEvolution.applyProposal,
        { proposalId }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;

      // Answer callback + send confirmation
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: args.callbackQueryId,
            text: "Soul updated!",
          }),
        });
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: args.telegramChatId,
            text: `Soul updated (v${result?.newSoulVersion || "?"}).`,
          }),
        });
      }
    } else if (actionType === "soul_reject") {
      await ctx.runMutation(
        internal.ai.soulEvolution.rejectProposal,
        { proposalId }
      );

      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: args.callbackQueryId,
            text: "Proposal rejected.",
          }),
        });
      }
    }

    return { success: true };
  },
});

/**
 * Periodic self-reflection — run by a scheduled job
 * Reviews recent conversations and generates soul proposals
 */
export const runSelfReflection = internalAction({
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
    if (!agent) return { error: "Agent not found" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const soul = (agent.customProperties as any)?.soul;

    // 2. Load recent sessions
    const recentSessions = await ctx.runQuery(
      internal.ai.agentSessions.getRecentSessionsForAgent,
      { agentId: args.agentId, limit: 20 }
    );

    if (!recentSessions?.length) return { message: "No recent conversations to reflect on" };

    // 3. Collect conversation summaries
    const summaries: string[] = [];
    for (const session of recentSessions.slice(0, 10)) {
      const messages = await ctx.runQuery(
        internal.ai.agentSessions.getSessionMessages,
        { sessionId: session._id, limit: 20 }
      );
      if (messages?.length) {
        const summary = messages
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((m: any) => `[${m.role}]: ${m.content?.slice(0, 100)}`)
          .join("\n");
        summaries.push(`--- Session (${session.channel}) ---\n${summary}`);
      }
    }

    // 4. Call LLM for self-reflection
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { error: "No API key" };

    const { OpenRouterClient } = await import("./openrouter");
    const client = new OpenRouterClient(apiKey);

    const reflectionPrompt = `You are reviewing your own recent conversations to find ways to improve.

=== YOUR CURRENT SOUL ===
${JSON.stringify(soul, null, 2)}
=== END SOUL ===

=== RECENT CONVERSATIONS ===
${summaries.join("\n\n")}
=== END CONVERSATIONS ===

Based on these conversations, suggest 0-3 specific improvements to your soul/personality.
For each suggestion, output a JSON object:
{
  "proposals": [
    {
      "proposalType": "add|modify|remove|add_faq",
      "targetField": "alwaysDo|neverDo|communicationStyle|etc.",
      "currentValue": "only for modify/remove",
      "proposedValue": "the new value",
      "reason": "specific evidence from conversations"
    }
  ]
}

Rules:
- Only suggest changes backed by evidence from multiple conversations
- Don't suggest changes that duplicate existing rules
- If nothing needs changing, return {"proposals": []}
- Be conservative — fewer high-quality proposals beat many low-quality ones
- Output ONLY valid JSON`;

    const response = await client.chatCompletion({
      model: "anthropic/claude-sonnet-4.5",
      messages: [
        { role: "system", content: "You are a self-reflective AI agent. Analyze your own behavior and suggest improvements. Output only valid JSON." },
        { role: "user", content: reflectionPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    });

    const content = response.choices?.[0]?.message?.content || "{}";

    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : content);

      // Create proposals
      for (const p of (parsed.proposals || [])) {
        await ctx.runMutation(
          internal.ai.soulEvolution.createProposal,
          {
            organizationId: args.organizationId,
            agentId: args.agentId,
            proposalType: p.proposalType,
            targetField: p.targetField,
            currentValue: p.currentValue || undefined,
            proposedValue: p.proposedValue,
            reason: p.reason,
            triggerType: "reflection" as const,
            evidenceMessages: [],
          }
        );
      }

      return { success: true, proposalCount: parsed.proposals?.length || 0 };
    } catch {
      return { error: "Failed to parse reflection output" };
    }
  },
});

// ============================================================================
// AUTHENTICATED QUERIES & MUTATIONS (for frontend UI)
// ============================================================================

/**
 * Get soul proposals for the UI — supports filtering by agent and/or status.
 */
export const getSoulProposals = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    if (args.agentId && args.status) {
      return await ctx.db
        .query("soulProposals")
        .withIndex("by_agent_status", (q) =>
          q.eq("agentId", args.agentId!).eq("status", args.status as "pending" | "approved" | "rejected" | "applied")
        )
        .collect();
    }

    if (args.agentId) {
      // All statuses for this agent
      return await ctx.db
        .query("soulProposals")
        .filter((q) => q.eq(q.field("agentId"), args.agentId))
        .order("desc")
        .take(50);
    }

    // All proposals for the org
    return await ctx.db
      .query("soulProposals")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(50);
  },
});

/**
 * Approve a soul proposal from the web UI.
 * Marks as approved, records feedback, and schedules application.
 */
export const approveSoulProposalAuth = mutation({
  args: {
    sessionId: v.string(),
    proposalId: v.id("soulProposals"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.status !== "pending") {
      throw new Error("Proposal not found or already processed");
    }

    await ctx.db.patch(args.proposalId, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedBy: "owner_web",
    });

    await ctx.db.insert("proposalFeedback", {
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      proposalId: args.proposalId,
      outcome: "approved",
      proposalSummary: `${proposal.proposalType} ${proposal.targetField}: ${proposal.proposedValue}`,
      createdAt: Date.now(),
    });

    // Schedule apply
    await ctx.scheduler.runAfter(
      0,
      internal.ai.soulEvolution.applyProposal,
      { proposalId: args.proposalId }
    );

    return { success: true };
  },
});

/**
 * Reject a soul proposal from the web UI.
 */
export const rejectSoulProposalAuth = mutation({
  args: {
    sessionId: v.string(),
    proposalId: v.id("soulProposals"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.status !== "pending") {
      throw new Error("Proposal not found or already processed");
    }

    await ctx.db.patch(args.proposalId, {
      status: "rejected",
      reviewedAt: Date.now(),
      reviewedBy: "owner_web",
    });

    await ctx.db.insert("proposalFeedback", {
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      proposalId: args.proposalId,
      outcome: "rejected",
      ownerFeedback: args.reason,
      proposalSummary: `${proposal.proposalType} ${proposal.targetField}: ${proposal.proposedValue}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
