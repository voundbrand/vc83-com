/**
 * SOUL EVOLUTION TOOLS
 *
 * Tools that let agents propose updates to their own soul/personality.
 * All proposals go through owner approval — agents never self-modify without consent.
 */

import type { AITool, ToolExecutionContext } from "./registry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../../_generated/api").internal;
  }
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

    // Get the agent ID from the context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        proposalType: args.proposalType,
        targetField: args.targetField,
        currentValue: args.currentValue || undefined,
        proposedValue: args.proposedValue,
        reason: args.reason,
        triggerType: "conversation" as const,
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
  readOnly: true,
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
  execute: async (ctx: ToolExecutionContext, args: Record<string, string>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentId = (ctx as any).agentId;
    if (!agentId) return { error: "No agent context" };

    const agent = await ctx.runQuery(
      getInternal().agentOntology.getAgentInternal,
      { agentId }
    );

    if (!agent) return { error: "Agent not found" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const soul = (agent.customProperties as any)?.soul;
    if (!soul) return { message: "No soul configured yet. You're running on defaults." };

    const section = args.section || "full";

    if (section === "full") return { soul };
    if (section === "traits") return { name: soul.name, traits: soul.traits, tagline: soul.tagline };
    if (section === "rules") return { alwaysDo: soul.alwaysDo, neverDo: soul.neverDo, escalationTriggers: soul.escalationTriggers };
    if (section === "communication") return { communicationStyle: soul.communicationStyle, toneGuidelines: soul.toneGuidelines, greetingStyle: soul.greetingStyle, emojiUsage: soul.emojiUsage };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  readOnly: true,
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async (ctx: ToolExecutionContext) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
