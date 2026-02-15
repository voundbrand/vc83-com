# Phase 2.5 Step 7: Soul Evolution — Self-Writing Agents

## Goal
Agents can propose updates to their own soul based on conversation patterns, business context changes, and self-reflection. The org owner approves or rejects proposals via Telegram. This is the foundation for agents that **get better over time** without manual tuning.

## Depends On
- Step 2 (Message Attribution) — proposals stored with agent identity
- Step 4 (PM Awareness) — harness includes soul context
- Step 5 (Onboarding Completion) — agent has an initial soul to evolve
- Step 6 (Team Session) — proposals visible in shared session context

## Inspiration

From the OpenClaw SOUL.md philosophy:
> *"This file is yours to evolve. As you learn who you are, update it."*
> *"If you change this file, tell the user — it's your soul, and they should know."*

Peter Steinberger didn't plan self-modification explicitly — *"I didn't even plan it so much. It just happened."* — but the key enabler was making agents aware of their own config. Our harness already does this. This step gives agents the **tool** to act on that awareness.

## Architecture

```
Agent notices a pattern during conversation
    |
    v
Agent calls `propose_soul_update` tool
    |
    v
Proposal saved to `soulProposals` table (status: "pending")
    |
    v
Owner notified via Telegram inline button:
    "I'd like to update my personality:
     ADD to alwaysDo: 'Mention group lessons when asked about pricing'
     Reason: 3 customers this week asked about group options after pricing.
     [Approve] [Reject] [Edit]"
    |
    +---> [Approve] --> Apply to agent's soul, bump version
    +---> [Reject]  --> Archive proposal, agent learns from rejection
    +---> [Edit]    --> Owner modifies before applying
```

## The Three Triggers

### 1. Conversation-Driven (Reactive)
The agent notices something during a live conversation and proposes an update:
```
Customer: Do you offer group discounts?
Agent: *I don't have group pricing info in my knowledge yet...*
       *Proposes: ADD to alwaysDo: "When asked about pricing, mention group lesson options"*
       *Proposes: ADD to FAQ: Q: "Do you offer group discounts?" A: "[owner to fill in]"*
```

### 2. Reflection-Driven (Periodic)
A scheduled job runs the agent through its recent conversations and asks:
```
"Review your last 20 conversations. Based on patterns you see:
 - What should you start doing that you're not?
 - What should you stop doing?
 - What topics come up that you can't handle well?"
```

### 3. Owner-Directed (Explicit)
Owner tells the agent directly via Telegram:
```
Owner: Be more casual in your responses
Agent: Got it! I'll propose an update to my tone guidelines.
       *Proposes: MODIFY communicationStyle: "Relaxed and conversational.
        Use short sentences. OK to use casual language like 'hey' and 'sure thing'."*
       [Approve] [Reject] [Edit]
```

## Changes

### 1. convex/schema.ts — Add `soulProposals` table

```typescript
soulProposals: defineTable({
  organizationId: v.id("organizations"),
  agentId: v.id("objects"),
  sessionId: v.optional(v.id("agentSessions")),

  // What the agent wants to change
  proposalType: v.union(
    v.literal("add"),        // Add new item to an array field
    v.literal("modify"),     // Change a string field
    v.literal("remove"),     // Remove item from an array field
    v.literal("add_faq"),    // Special: add FAQ entry
  ),
  targetField: v.string(),   // e.g., "alwaysDo", "neverDo", "communicationStyle", "faqEntries"
  currentValue: v.optional(v.string()),  // What it is now (for modify)
  proposedValue: v.string(), // What the agent wants it to be
  reason: v.string(),        // Why the agent thinks this change is needed

  // Evidence
  triggerType: v.union(
    v.literal("conversation"),  // Noticed during a chat
    v.literal("reflection"),    // Periodic self-review
    v.literal("owner_directed"),// Owner explicitly asked
  ),
  evidenceMessages: v.optional(v.array(v.string())), // Relevant message excerpts

  // Status
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("applied"),
  ),

  // Metadata
  createdAt: v.number(),
  reviewedAt: v.optional(v.number()),
  reviewedBy: v.optional(v.string()), // "owner" or "auto"

  // Telegram notification tracking
  telegramMessageId: v.optional(v.number()),
  telegramChatId: v.optional(v.string()),
})
  .index("by_org_status", ["organizationId", "status"])
  .index("by_agent_status", ["agentId", "status"])
  .index("by_org_pending", ["organizationId", "status", "createdAt"]),
```

### 2. NEW: convex/ai/tools/soulEvolutionTools.ts

```typescript
/**
 * SOUL EVOLUTION TOOLS
 *
 * Tools that let agents propose updates to their own soul/personality.
 * All proposals go through owner approval — agents never self-modify without consent.
 */

import type { AITool, ToolExecutionContext } from "./registry";

let _apiCache: any = null;
function getInternal(): any {
  if (!_apiCache) _apiCache = require("../../_generated/api").internal;
  return _apiCache;
}

/**
 * propose_soul_update — Agent suggests a change to its own personality/behavior rules
 */
export const proposeSoulUpdateTool: AITool = {
  name: "propose_soul_update",
  description: `Propose a change to your own personality, behavior rules, or knowledge. Use this when you notice:
- A topic comes up repeatedly that you could handle better
- Your tone doesn't match what the owner wants
- You're missing FAQ answers customers keep asking
- A behavior rule would improve your conversations

Your proposal goes to the owner for approval. Be specific about WHAT to change and WHY.`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      proposalType: {
        type: "string",
        enum: ["add", "modify", "remove", "add_faq"],
        description: "Type of change: add (new rule), modify (change existing), remove (delete rule), add_faq (new FAQ)",
      },
      targetField: {
        type: "string",
        enum: [
          "alwaysDo",
          "neverDo",
          "communicationStyle",
          "toneGuidelines",
          "greetingStyle",
          "closingStyle",
          "emojiUsage",
          "escalationTriggers",
          "traits",
          "coreValues",
          "faqEntries",
        ],
        description: "Which part of your soul/personality to update",
      },
      currentValue: {
        type: "string",
        description: "The current value (for modify/remove). Quote it exactly.",
      },
      proposedValue: {
        type: "string",
        description: "The new value you're proposing. For add_faq, format as 'Q: ... | A: ...'",
      },
      reason: {
        type: "string",
        description: "Why you think this change would improve your conversations. Be specific — reference patterns you've noticed.",
      },
    },
    required: ["proposalType", "targetField", "proposedValue", "reason"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, string>) => {
    const { organizationId, agentSessionId, channel, contactId } = ctx;

    if (!organizationId) {
      return { error: "No organization context" };
    }

    // Get the agent ID from the session
    const agentId = (ctx as any).agentId;
    if (!agentId) {
      return { error: "No agent context for soul evolution" };
    }

    // Collect recent message excerpts as evidence
    let evidenceMessages: string[] = [];
    if (agentSessionId) {
      const messages = await ctx.runQuery(
        getInternal().ai.agentSessions.getSessionMessages,
        { sessionId: agentSessionId, limit: 5 }
      );
      evidenceMessages = messages
        ?.slice(-3)
        .map((m: any) => `[${m.role}]: ${m.content?.slice(0, 200)}`) || [];
    }

    // Create the proposal
    const proposalId = await ctx.runMutation(
      getInternal().ai.soulEvolution.createProposal,
      {
        organizationId,
        agentId,
        sessionId: agentSessionId,
        proposalType: args.proposalType as any,
        targetField: args.targetField,
        currentValue: args.currentValue || undefined,
        proposedValue: args.proposedValue,
        reason: args.reason,
        triggerType: "conversation",
        evidenceMessages,
      }
    );

    // Notify owner via Telegram (if channel is telegram)
    if (channel === "telegram" && contactId) {
      await ctx.runAction(
        getInternal().ai.soulEvolution.notifyOwnerOfProposal,
        {
          proposalId,
          telegramChatId: contactId,
        }
      );
    }

    return {
      success: true,
      proposalId,
      message: "Proposal submitted. The owner will be notified for approval.",
    };
  },
};

/**
 * review_own_soul — Agent reads its current soul for self-awareness
 */
export const reviewOwnSoulTool: AITool = {
  name: "review_own_soul",
  description: "Read your current soul/personality configuration. Use this when the owner asks about your personality, or when you want to check your current rules before proposing a change.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      section: {
        type: "string",
        enum: ["full", "traits", "rules", "communication", "faq"],
        description: "Which section to review. 'full' returns everything.",
      },
    },
    required: [],
  },
  execute: async (ctx: ToolExecutionContext) => {
    const agentId = (ctx as any).agentId;
    if (!agentId) return { error: "No agent context" };

    const agent = await ctx.runQuery(
      getInternal().agentOntology.getAgentInternal,
      { agentId }
    );

    if (!agent) return { error: "Agent not found" };

    const soul = (agent.customProperties as any)?.soul;
    if (!soul) return { message: "No soul configured yet. You're running on defaults." };

    const section = (ctx as any).args?.section || "full";

    if (section === "full") return { soul };
    if (section === "traits") return { name: soul.name, traits: soul.traits, tagline: soul.tagline };
    if (section === "rules") return { alwaysDo: soul.alwaysDo, neverDo: soul.neverDo, escalationTriggers: soul.escalationTriggers };
    if (section === "communication") return { communicationStyle: soul.communicationStyle, toneGuidelines: soul.toneGuidelines, greetingStyle: soul.greetingStyle, emojiUsage: soul.emojiUsage };
    if (section === "faq") return { faqEntries: (agent.customProperties as any)?.faqEntries || [] };

    return { soul };
  },
};

/**
 * view_pending_proposals — Agent checks its pending soul proposals
 */
export const viewPendingProposalsTool: AITool = {
  name: "view_pending_proposals",
  description: "Check if you have any pending soul/personality update proposals waiting for owner approval.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async (ctx: ToolExecutionContext) => {
    const agentId = (ctx as any).agentId;
    if (!agentId) return { error: "No agent context" };

    const proposals = await ctx.runQuery(
      getInternal().ai.soulEvolution.getPendingProposals,
      { agentId }
    );

    if (!proposals?.length) {
      return { message: "No pending proposals." };
    }

    return {
      pendingCount: proposals.length,
      proposals: proposals.map((p: any) => ({
        id: p._id,
        type: p.proposalType,
        field: p.targetField,
        proposed: p.proposedValue,
        reason: p.reason,
        createdAt: new Date(p.createdAt).toISOString(),
      })),
    };
  },
};
```

### 3. NEW: convex/ai/soulEvolution.ts — Backend mutations/queries

```typescript
/**
 * SOUL EVOLUTION — Backend
 *
 * Mutations and queries for managing soul update proposals.
 * Handles creation, approval, rejection, and application of proposals.
 */

import { mutation, internalMutation, query, internalQuery, action, internalAction } from "../_generated/server";
import { v } from "convex/values";

let _apiCache: any = null;
function getInternal(): any {
  if (!_apiCache) _apiCache = require("../_generated/api").internal;
  return _apiCache;
}

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

    const config = (agent.customProperties || {}) as Record<string, any>;
    const soul = config.soul || {};

    // Apply the change based on proposal type
    const field = proposal.targetField;

    switch (proposal.proposalType) {
      case "add": {
        // Add to array field (alwaysDo, neverDo, traits, etc.)
        const current = soul[field] || [];
        if (Array.isArray(current)) {
          soul[field] = [...current, proposal.proposedValue];
        }
        break;
      }
      case "modify": {
        // Replace string field value
        soul[field] = proposal.proposedValue;
        break;
      }
      case "remove": {
        // Remove from array field
        const arr = soul[field] || [];
        if (Array.isArray(arr)) {
          soul[field] = arr.filter((item: string) => item !== proposal.currentValue);
        }
        break;
      }
      case "add_faq": {
        // Parse "Q: ... | A: ..." format and add to faqEntries
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
      getInternal().ai.soulEvolution.getProposalById,
      { proposalId: args.proposalId }
    );

    if (!proposal) return { error: "Proposal not found" };

    // Load agent name
    const agent = await ctx.runQuery(
      getInternal().agentOntology.getAgentInternal,
      { agentId: proposal.agentId }
    );
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

    const data = await response.json();

    // Store the Telegram message ID for later reference
    if (data.ok && data.result?.message_id) {
      await ctx.runMutation(
        getInternal().ai.soulEvolution.updateProposalTelegram,
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
export const handleTelegramCallback = internalAction({
  args: {
    callbackData: v.string(),
    telegramChatId: v.string(),
    callbackQueryId: v.string(),
  },
  handler: async (ctx, args) => {
    const [action, proposalId] = args.callbackData.split(":");

    if (!proposalId) return { error: "Invalid callback data" };

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (action === "soul_approve") {
      // Approve + apply in sequence
      await ctx.runMutation(
        getInternal().ai.soulEvolution.approveProposal,
        { proposalId }
      );
      const result = await ctx.runMutation(
        getInternal().ai.soulEvolution.applyProposal,
        { proposalId }
      );

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
    } else if (action === "soul_reject") {
      await ctx.runMutation(
        getInternal().ai.soulEvolution.rejectProposal,
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
      getInternal().agentOntology.getAgentInternal,
      { agentId: args.agentId }
    );
    if (!agent) return { error: "Agent not found" };
    const soul = (agent.customProperties as any)?.soul;

    // 2. Load recent sessions (last 20 conversations)
    const recentSessions = await ctx.runQuery(
      getInternal().ai.agentSessions.getRecentSessionsForAgent,
      { agentId: args.agentId, limit: 20 }
    );

    if (!recentSessions?.length) return { message: "No recent conversations to reflect on" };

    // 3. Collect conversation summaries
    const summaries: string[] = [];
    for (const session of recentSessions.slice(0, 10)) {
      const messages = await ctx.runQuery(
        getInternal().ai.agentSessions.getSessionMessages,
        { sessionId: session._id, limit: 20 }
      );
      if (messages?.length) {
        const summary = messages
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
      temperature: 0.4, // Lower temp for analytical reflection
      max_tokens: 1500,
    });

    const content = response.choices?.[0]?.message?.content || "{}";

    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : content);

      // Create proposals
      for (const p of (parsed.proposals || [])) {
        await ctx.runMutation(
          getInternal().ai.soulEvolution.createProposal,
          {
            organizationId: args.organizationId,
            agentId: args.agentId,
            proposalType: p.proposalType,
            targetField: p.targetField,
            currentValue: p.currentValue || undefined,
            proposedValue: p.proposedValue,
            reason: p.reason,
            triggerType: "reflection",
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
// HELPERS
// ============================================================================

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
```

### 4. convex/ai/tools/registry.ts — Register new tools

```typescript
import { proposeSoulUpdateTool, reviewOwnSoulTool, viewPendingProposalsTool } from "./soulEvolutionTools";

// In TOOL_REGISTRY:
propose_soul_update: proposeSoulUpdateTool,
review_own_soul: reviewOwnSoulTool,
view_pending_proposals: viewPendingProposalsTool,
```

### 5. convex/ai/harness.ts — Add soul version + evolution awareness

After the existing self-awareness section, add:

```typescript
// Soul evolution awareness
if (config.soul?.version) {
  lines.push(`\n**Soul version:** v${config.soul.version} (last updated: ${new Date(config.soul.lastUpdatedAt || 0).toISOString()})`);
  lines.push("**Self-evolution:** You can propose updates to your own personality using `propose_soul_update`.");
  lines.push("  - Use this when you notice recurring patterns that your current rules don't address.");
  lines.push("  - All proposals require owner approval — you never change yourself silently.");
  lines.push("  - Use `review_own_soul` to check your current personality before proposing changes.");
}
```

### 6. scripts/telegram-bridge.ts — Handle callback queries

Add callback query handling to the bridge polling loop:

```typescript
// In the poll loop, after handling messages:
for (const update of data.result || []) {
  // Handle callback queries (inline button taps)
  if (update.callback_query) {
    const cb = update.callback_query;
    const callbackData = cb.data || "";
    const chatId = String(cb.message?.chat?.id || "");

    if (callbackData.startsWith("soul_")) {
      await convex.action(
        api.ai.soulEvolution.handleTelegramCallback,
        {
          callbackData,
          telegramChatId: chatId,
          callbackQueryId: cb.id,
        }
      );
    }

    offset = update.update_id + 1;
    continue;
  }

  // ... existing message handling
}
```

### 7. convex/ai/agentExecution.ts — Pass agentId to tool context

Extend `ToolExecutionContext` to include `agentId`:

```typescript
const toolCtx: ToolExecutionContext = {
  ...ctx,
  organizationId: args.organizationId,
  userId: agent.createdBy as Id<"users">,
  agentSessionId: session._id,
  channel: args.channel,
  contactId: args.externalContactIdentifier,
  agentId: agent._id,  // NEW — needed for soul evolution tools
};
```

## Verification
1. `npx convex typecheck` — passes
2. Talk to agent via Telegram, ask it something it can't handle well
3. Agent calls `propose_soul_update` → proposal appears in `soulProposals` table
4. Telegram shows inline buttons [Approve] [Reject]
5. Tap Approve → agent soul updated, version bumped
6. Send "who are you?" → agent's response reflects the updated soul
7. Tap Reject on another proposal → archived, soul unchanged

## Complexity: Medium-High
- 2 new files (`soulEvolutionTools.ts`, `soulEvolution.ts`)
- 3 modified files (`registry.ts`, `harness.ts`, `telegram-bridge.ts`)
- 1 schema addition (`soulProposals` table)
- The self-reflection action is the most complex piece — it reviews conversations and generates structured proposals

## What This Enables

- Agents that **get better over time** without manual tuning
- Org owners stay in control via approval flow
- Transparency: every change is tracked with version + reason + evidence
- Foundation for Level 2 self-writing (Step 10) where agents compose new tools

## The "Wow" Moment

```
Customer: Do you have sailing lessons for kids under 8?

Haff: I don't have specific info about age minimums, but I can
  find out! Let me ask the team.

  [Internally: proposes soul update]

Owner receives in Telegram:
  ┌──────────────────────────────────────────┐
  │ *Haff* wants to update its personality:  │
  │                                          │
  │ *ADD FAQ:*                               │
  │ "Q: Minimum age for sailing lessons?     │
  │  A: [please fill in the answer]"         │
  │                                          │
  │ *Reason:* A customer asked about age     │
  │ limits for children. I don't have this   │
  │ info yet but it seems important.         │
  │                                          │
  │ [Approve] [Reject]                       │
  └──────────────────────────────────────────┘

Owner: Taps Approve, then edits via chat:
  "The minimum age is 6, and kids under 12
   need a parent on board"

Haff: Got it! I've updated my FAQ. Next time someone asks,
  I'll know the answer.
```
