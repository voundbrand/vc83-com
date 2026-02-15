/**
 * COORDINATOR TOOLS — Cross-Layer Communication
 *
 * Enables agents to communicate across organizational boundaries
 * in the 4-layer hierarchy (Platform → Agency → Client → End-Customer).
 *
 * Tools:
 * - escalate_to_parent: L3/L4 agents escalate issues to parent org PM
 * - delegate_to_child: L2 agents push tasks to child org PM
 * - share_insight_upward: L3/L4 agents share learnings with parent
 */

import type { AITool, ToolExecutionContext } from "./registry";

// Lazy-load to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../../_generated/api");
  }
  return _apiCache.internal;
}

/**
 * Escalate an issue to the parent agency's PM agent.
 * Available to L3 (Client PM) and L4 (Customer Service) agents.
 */
export const escalateToParentTool: AITool = {
  name: "escalate_to_parent",
  description:
    "Escalate an issue to the parent agency's PM agent for resolution. " +
    "Use when you encounter a problem beyond your authority or capabilities — " +
    "e.g., billing disputes, policy questions, cross-client issues, or technical failures.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Brief summary of the issue being escalated",
      },
      severity: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Issue severity: low (informational), medium (needs attention), high (urgent)",
      },
      context: {
        type: "string",
        description: "Relevant conversation context or customer details",
      },
    },
    required: ["summary", "severity"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    const summary = args.summary as string;
    const severity = args.severity as string;
    const context = (args.context as string) || "";

    // 1. Look up this org to find parent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org: any = await ctx.runQuery(
      getInternal().organizations.getOrgById,
      { organizationId: ctx.organizationId }
    );

    if (!org?.parentOrganizationId) {
      return { error: "No parent organization found — escalation not available for top-level orgs" };
    }

    // 2. Find parent org's PM agent
    const parentPM = await ctx.runQuery(
      getInternal().agentOntology.getActiveAgentForOrg,
      {
        organizationId: org.parentOrganizationId,
        subtype: "pm",
      }
    );

    // 3. Create escalation record in objects table
    const escalationId = await ctx.runMutation(
      getInternal().ai.tools.coordinatorTools.createEscalation,
      {
        sourceOrganizationId: ctx.organizationId,
        targetOrganizationId: org.parentOrganizationId,
        sourceAgentId: ctx.agentId,
        targetAgentId: parentPM?._id || null,
        summary,
        severity,
        context,
      }
    );

    // 4. Notify parent PM via internal message (triggers in their next session)
    if (parentPM) {
      try {
        await ctx.runMutation(
          getInternal().ai.tools.coordinatorTools.createCrossLayerNotification,
          {
            targetOrganizationId: org.parentOrganizationId,
            targetAgentId: parentPM._id,
            notificationType: "escalation",
            message: `[ESCALATION - ${severity.toUpperCase()}] From ${org.name || "sub-org"}: ${summary}`,
            relatedObjectId: escalationId,
          }
        );
      } catch {
        // Non-fatal — escalation record still exists
      }
    }

    return {
      success: true,
      escalationId,
      message: `Issue escalated to agency PM${parentPM ? ` (${(parentPM as { name?: string }).name || "PM"})` : ""}. Severity: ${severity}. They will review and respond.`,
    };
  },
};

/**
 * Delegate a task to a child org's PM agent.
 * Available to L2 (Agency PM) agents only.
 */
export const delegateToChildTool: AITool = {
  name: "delegate_to_child",
  description:
    "Send an instruction or task to a client sub-org's PM agent. " +
    "Use to push configuration changes, content updates, or operational tasks to client agents.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      clientSlug: {
        type: "string",
        description: "The client org's slug (e.g., 'neue-apotheke')",
      },
      instruction: {
        type: "string",
        description: "What the client PM should do",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Task priority",
      },
    },
    required: ["clientSlug", "instruction"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    const clientSlug = args.clientSlug as string;
    const instruction = args.instruction as string;
    const priority = (args.priority as string) || "medium";

    // 1. Resolve client org by slug
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientOrg: any = await ctx.runQuery(
      getInternal().organizations.getOrgBySlug,
      { slug: clientSlug }
    );

    if (!clientOrg) {
      return { error: `No organization found with slug "${clientSlug}"` };
    }

    // Verify it's actually a child of this org
    if (String(clientOrg.parentOrganizationId) !== String(ctx.organizationId)) {
      return { error: `"${clientSlug}" is not a sub-org of your agency` };
    }

    // 2. Find client PM agent
    const clientPM = await ctx.runQuery(
      getInternal().agentOntology.getActiveAgentForOrg,
      {
        organizationId: clientOrg._id,
        subtype: "pm",
      }
    );

    // 3. Create delegation record
    const delegationId = await ctx.runMutation(
      getInternal().ai.tools.coordinatorTools.createDelegation,
      {
        sourceOrganizationId: ctx.organizationId,
        targetOrganizationId: clientOrg._id,
        instruction,
        priority,
      }
    );

    // 4. Notify client PM
    if (clientPM) {
      try {
        await ctx.runMutation(
          getInternal().ai.tools.coordinatorTools.createCrossLayerNotification,
          {
            targetOrganizationId: clientOrg._id,
            targetAgentId: clientPM._id,
            notificationType: "delegation",
            message: `[TASK - ${priority.toUpperCase()}] From agency: ${instruction}`,
            relatedObjectId: delegationId,
          }
        );
      } catch {
        // Non-fatal
      }
    }

    return {
      success: true,
      delegationId,
      clientOrgName: clientOrg.name || clientSlug,
      message: `Task delegated to ${clientOrg.name || clientSlug}'s PM. Priority: ${priority}.`,
    };
  },
};

/**
 * Share a learning or insight with the parent agency PM.
 * Available to L3 and L4 agents.
 */
export const shareInsightUpwardTool: AITool = {
  name: "share_insight_upward",
  description:
    "Share a learning, pattern, or suggestion with the parent agency PM. " +
    "Use for non-urgent insights: customer trends, product feedback, " +
    "performance observations, or improvement suggestions.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      insight: {
        type: "string",
        description: "The insight to share",
      },
      category: {
        type: "string",
        enum: ["customer_trend", "product_feedback", "performance", "suggestion"],
        description: "Insight category",
      },
      evidence: {
        type: "string",
        description: "Supporting data or examples",
      },
    },
    required: ["insight", "category"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    const insight = args.insight as string;
    const category = args.category as string;
    const evidence = (args.evidence as string) || "";

    // 1. Look up parent org
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org: any = await ctx.runQuery(
      getInternal().organizations.getOrgById,
      { organizationId: ctx.organizationId }
    );

    if (!org?.parentOrganizationId) {
      return { error: "No parent organization — insight sharing not available for top-level orgs" };
    }

    // 2. Create insight record
    const insightId = await ctx.runMutation(
      getInternal().ai.tools.coordinatorTools.createInsight,
      {
        sourceOrganizationId: ctx.organizationId,
        targetOrganizationId: org.parentOrganizationId,
        insight,
        category,
        evidence,
      }
    );

    return {
      success: true,
      insightId,
      message: `Insight shared with agency PM. Category: ${category}. They'll review it when available.`,
    };
  },
};

// ============================================================================
// INTERNAL MUTATIONS — Database operations for coordinator tools
// ============================================================================

import { internalMutation, internalQuery } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Create an escalation record (objects table, type="escalation")
 */
export const createEscalation = internalMutation({
  args: {
    sourceOrganizationId: v.id("organizations"),
    targetOrganizationId: v.id("organizations"),
    sourceAgentId: v.optional(v.id("objects")),
    targetAgentId: v.optional(v.union(v.id("objects"), v.null())),
    summary: v.string(),
    severity: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("objects", {
      organizationId: args.targetOrganizationId,
      type: "escalation",
      subtype: args.severity,
      name: args.summary.slice(0, 100),
      description: args.summary,
      status: "pending",
      customProperties: {
        sourceOrganizationId: args.sourceOrganizationId,
        targetOrganizationId: args.targetOrganizationId,
        sourceAgentId: args.sourceAgentId || null,
        targetAgentId: args.targetAgentId || null,
        summary: args.summary,
        severity: args.severity,
        context: args.context || "",
        resolvedAt: null,
        resolution: null,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create a delegation record (objects table, type="delegation")
 */
export const createDelegation = internalMutation({
  args: {
    sourceOrganizationId: v.id("organizations"),
    targetOrganizationId: v.id("organizations"),
    instruction: v.string(),
    priority: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("objects", {
      organizationId: args.targetOrganizationId,
      type: "delegation",
      subtype: args.priority,
      name: args.instruction.slice(0, 100),
      description: args.instruction,
      status: "pending",
      customProperties: {
        sourceOrganizationId: args.sourceOrganizationId,
        targetOrganizationId: args.targetOrganizationId,
        instruction: args.instruction,
        priority: args.priority,
        completedAt: null,
        result: null,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create an insight record (objects table, type="insight")
 */
export const createInsight = internalMutation({
  args: {
    sourceOrganizationId: v.id("organizations"),
    targetOrganizationId: v.id("organizations"),
    insight: v.string(),
    category: v.string(),
    evidence: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("objects", {
      organizationId: args.targetOrganizationId,
      type: "insight",
      subtype: args.category,
      name: args.insight.slice(0, 100),
      description: args.insight,
      status: "active",
      customProperties: {
        sourceOrganizationId: args.sourceOrganizationId,
        targetOrganizationId: args.targetOrganizationId,
        insight: args.insight,
        category: args.category,
        evidence: args.evidence || "",
        acknowledgedAt: null,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create a cross-layer notification for an agent.
 * Stored as an object so the target agent can pick it up on next interaction.
 */
export const createCrossLayerNotification = internalMutation({
  args: {
    targetOrganizationId: v.id("organizations"),
    targetAgentId: v.id("objects"),
    notificationType: v.string(),
    message: v.string(),
    relatedObjectId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("objects", {
      organizationId: args.targetOrganizationId,
      type: "agent_notification",
      subtype: args.notificationType,
      name: args.message.slice(0, 100),
      description: args.message,
      status: "unread",
      customProperties: {
        targetAgentId: args.targetAgentId,
        notificationType: args.notificationType,
        message: args.message,
        relatedObjectId: args.relatedObjectId || null,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get pending escalations for an organization (parent PM review)
 */
export const getPendingEscalations = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "escalation")
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

/**
 * Resolve an escalation
 */
export const resolveEscalation = internalMutation({
  args: {
    escalationId: v.id("objects"),
    resolution: v.string(),
    status: v.union(v.literal("resolved"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    const escalation = await ctx.db.get(args.escalationId);
    if (!escalation || escalation.type !== "escalation") {
      throw new Error("Escalation not found");
    }

    await ctx.db.patch(args.escalationId, {
      status: args.status,
      customProperties: {
        ...escalation.customProperties,
        resolvedAt: Date.now(),
        resolution: args.resolution,
      },
      updatedAt: Date.now(),
    });
  },
});
