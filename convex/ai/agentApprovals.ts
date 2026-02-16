/**
 * AGENT APPROVAL SYSTEM
 *
 * Human-in-the-loop approval for agent actions.
 * When an agent's autonomyLevel or requireApprovalFor triggers,
 * tool calls are queued as approval requests instead of executing.
 *
 * Approvals are stored as ontology objects (type="agent_approval").
 *
 * Flow:
 * 1. Agent pipeline calls createApprovalRequest (instead of executing tool)
 * 2. Human sees pending approval in UI
 * 3. Human approves → executeApprovedAction runs the tool
 *    OR rejects → agent session notified
 * 4. Stale approvals auto-expire via cron
 */

import { query, mutation, internalQuery, internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { TOOL_REGISTRY } from "./tools/registry";
import type { ToolExecutionContext } from "./tools/registry";
import type { Id } from "../_generated/dataModel";
import { getToolCreditCost } from "../credits/index";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

// ============================================================================
// CREATE APPROVAL (Internal — called by execution pipeline)
// ============================================================================

/**
 * Create a pending approval request
 */
export const createApprovalRequest = internalMutation({
  args: {
    agentId: v.id("objects"),
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
    actionType: v.string(),
    actionPayload: v.any(),
  },
  handler: async (ctx, args) => {
    const approvalId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "agent_approval",
      subtype: args.actionType,
      name: `Approval: ${args.actionType}`,
      description: `Agent requesting approval to execute ${args.actionType}`,
      status: "pending",
      customProperties: {
        agentId: args.agentId,
        sessionId: args.sessionId,
        actionType: args.actionType,
        actionPayload: args.actionPayload,
        requestedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h expiry
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: approvalId,
      actionType: "approval_requested",
      actionData: {
        agentId: args.agentId,
        tool: args.actionType,
        sessionId: args.sessionId,
      },
      performedBy: args.agentId,
      performedAt: Date.now(),
    });

    return approvalId;
  },
});

// ============================================================================
// QUERY APPROVALS (Authenticated)
// ============================================================================

/**
 * Get pending approvals for an organization
 */
export const getPendingApprovals = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const approvals = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "agent_approval")
      )
      .collect();

    return approvals.filter((a) => a.status === "pending");
  },
});

/**
 * Get all approvals (any status) for an organization
 */
export const getApprovals = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    let approvals = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "agent_approval")
      )
      .collect();

    if (args.status) {
      approvals = approvals.filter((a) => a.status === args.status);
    }

    // Sort by most recent first
    approvals.sort((a, b) => b.createdAt - a.createdAt);

    const limit = args.limit || 50;
    return approvals.slice(0, limit);
  },
});

// ============================================================================
// APPROVE / REJECT (Authenticated)
// ============================================================================

/**
 * Approve a pending action — schedules execution
 */
export const approveAction = mutation({
  args: {
    sessionId: v.string(),
    approvalId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const approval = await ctx.db.get(args.approvalId);
    if (!approval || approval.type !== "agent_approval" || approval.status !== "pending") {
      throw new Error("Approval not found or not pending");
    }

    // Mark as approved
    await ctx.db.patch(args.approvalId, {
      status: "approved",
      customProperties: {
        ...approval.customProperties,
        resolvedAt: Date.now(),
        resolvedBy: session.userId,
      },
      updatedAt: Date.now(),
    });

    // Schedule execution
    await (ctx.scheduler as any).runAfter(0, generatedApi.internal.ai.agentApprovals.executeApprovedAction, {
      approvalId: args.approvalId,
    });

    // Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: approval.organizationId,
      objectId: args.approvalId,
      actionType: "approval_granted",
      actionData: { resolvedBy: session.userId },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * Reject a pending action
 */
export const rejectAction = mutation({
  args: {
    sessionId: v.string(),
    approvalId: v.id("objects"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const approval = await ctx.db.get(args.approvalId);
    if (!approval || approval.type !== "agent_approval" || approval.status !== "pending") {
      throw new Error("Approval not found or not pending");
    }

    await ctx.db.patch(args.approvalId, {
      status: "rejected",
      customProperties: {
        ...approval.customProperties,
        resolvedAt: Date.now(),
        resolvedBy: session.userId,
        rejectionReason: args.reason,
      },
      updatedAt: Date.now(),
    });

    // Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: approval.organizationId,
      objectId: args.approvalId,
      actionType: "approval_rejected",
      actionData: {
        resolvedBy: session.userId,
        reason: args.reason,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

// ============================================================================
// EXECUTE APPROVED ACTION (Internal — scheduled after approval)
// ============================================================================

/**
 * Execute a tool call that was previously approved
 */
export const executeApprovedAction = internalAction({
  args: {
    approvalId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const approval = await (ctx as any).runQuery(generatedApi.internal.ai.agentApprovals.getApprovalInternal, {
      approvalId: args.approvalId,
    });

    if (!approval || approval.status !== "approved") {
      return { status: "error", message: "Approval not found or not approved" };
    }

    const props = approval.customProperties as Record<string, unknown>;
    const toolName = props.actionType as string;
    const toolArgs = props.actionPayload;
    const agentId = props.agentId as Id<"objects">;
    const agentSessionId = props.sessionId as Id<"agentSessions">;

    const tool = TOOL_REGISTRY[toolName];
    if (!tool) {
      return { status: "error", message: `Unknown tool: ${toolName}` };
    }

    try {
      // Pre-flight credit check
      const toolCreditCost = getToolCreditCost(toolName);
      const creditCheck = await (ctx as any).runQuery(
        generatedApi.internal.credits.index.checkCreditsInternalQuery,
        { organizationId: approval.organizationId, requiredAmount: toolCreditCost }
      ) as { hasCredits: boolean; totalCredits: number };

      if (!creditCheck.hasCredits) {
        await (ctx as any).runMutation(generatedApi.internal.ai.agentApprovals.markExecuted, {
          approvalId: args.approvalId,
          success: false,
          result: `CREDITS_EXHAUSTED: Not enough credits (have ${creditCheck.totalCredits}, need ${toolCreditCost})`,
        });
        return { status: "credits_exhausted", message: "Not enough credits to execute this action" };
      }

      // Execute the tool
      const toolCtx: ToolExecutionContext = {
        ...ctx,
        organizationId: approval.organizationId,
        userId: agentId as unknown as Id<"users">, // Agent acts as the user
        sessionId: undefined,
        conversationId: undefined,
      };

      const result = await tool.execute(toolCtx, toolArgs);

      // Deduct credits for successful execution
      try {
        await (ctx as any).runMutation(generatedApi.internal.credits.index.deductCreditsInternalMutation, {
          organizationId: approval.organizationId,
          amount: toolCreditCost,
          action: `tool_${toolName}`,
          relatedEntityType: "agent_approval",
          relatedEntityId: args.approvalId as unknown as string,
        });
      } catch (creditErr) {
        console.error(`[AgentApprovals] Credit deduction failed for ${toolName}:`, creditErr);
      }

      // Update approval status
      await (ctx as any).runMutation(generatedApi.internal.ai.agentApprovals.markExecuted, {
        approvalId: args.approvalId,
        success: true,
        result: JSON.stringify(result).slice(0, 5000),
      });

      // Add result message to agent session
      await (ctx as any).runMutation(generatedApi.internal.ai.agentSessions.addSessionMessage, {
        sessionId: agentSessionId,
        role: "system",
        content: `[Approved action executed] ${toolName}: Success`,
        toolCalls: [{ tool: toolName, status: "success", result }],
      });

      return { status: "success", result };
    } catch (e) {
      await (ctx as any).runMutation(generatedApi.internal.ai.agentApprovals.markExecuted, {
        approvalId: args.approvalId,
        success: false,
        result: String(e),
      });

      return { status: "error", message: String(e) };
    }
  },
});

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Get approval without auth (for internal pipeline use)
 */
export const getApprovalInternal = internalQuery({
  args: {
    approvalId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId);
    if (!approval || approval.type !== "agent_approval") return null;
    return approval;
  },
});

/**
 * Mark an approval as executed (success or failure)
 */
export const markExecuted = internalMutation({
  args: {
    approvalId: v.id("objects"),
    success: v.boolean(),
    result: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId);
    if (!approval) return;

    await ctx.db.patch(args.approvalId, {
      status: args.success ? "completed" : "failed",
      customProperties: {
        ...approval.customProperties,
        executedAt: Date.now(),
        executionSuccess: args.success,
        executionResult: args.result,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Expire stale approvals (called by cron)
 */
export const expireStaleApprovals = internalMutation({
  handler: async (ctx) => {
    // Find all pending agent_approval objects
    const pending = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "agent_approval"))
      .collect();

    const now = Date.now();
    let expired = 0;

    for (const approval of pending) {
      if (approval.status !== "pending") continue;

      const props = approval.customProperties as Record<string, unknown> | undefined;
      const expiresAt = props?.expiresAt as number | undefined;

      if (expiresAt && now > expiresAt) {
        await ctx.db.patch(approval._id, {
          status: "expired",
          customProperties: {
            ...approval.customProperties,
            expiredAt: now,
          },
          updatedAt: now,
        });
        expired++;
      }
    }

    return { expired };
  },
});
