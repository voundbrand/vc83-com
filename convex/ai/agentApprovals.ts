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
import {
  interventionTemplateValidator,
  normalizeInterventionTemplateInput,
} from "./interventionTemplates";
import {
  buildHarnessContextEnvelope,
  normalizeHarnessContextEnvelope,
  type HarnessContextEnvelope,
} from "./harnessContextEnvelope";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

interface TeamHandoffEntryShape {
  fromAgentId: unknown;
  toAgentId: unknown;
  reason?: unknown;
  summary?: unknown;
  goal?: unknown;
  contextSummary?: unknown;
  timestamp?: unknown;
}

async function buildApprovalHarnessContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    agentId: Id<"objects">;
    sessionId: Id<"agentSessions">;
    organizationId: Id<"organizations">;
    actionType?: string;
  },
): Promise<HarnessContextEnvelope> {
  const [organization, session, agent] = await Promise.all([
    ctx.db.get(args.organizationId),
    ctx.db.get(args.sessionId),
    ctx.db.get(args.agentId),
  ]);

  return buildHarnessContextEnvelope({
    source: "approval",
    organization: organization
      ? {
          _id: String(organization._id),
          slug: organization.slug,
          parentOrganizationId: organization.parentOrganizationId
            ? String(organization.parentOrganizationId)
            : undefined,
        }
      : null,
    agentSubtype: agent?.subtype,
    toolsUsed: args.actionType ? [args.actionType] : [],
    teamSession: session?.teamSession
      ? {
          handoffHistory: session.teamSession.handoffHistory.map((entry: TeamHandoffEntryShape) => ({
            fromAgentId: String(entry.fromAgentId),
            toAgentId: String(entry.toAgentId),
            reason: typeof entry.reason === "string" ? entry.reason : "",
            summary: typeof entry.summary === "string" ? entry.summary : undefined,
            goal: typeof entry.goal === "string" ? entry.goal : undefined,
            contextSummary:
              typeof entry.contextSummary === "string" ? entry.contextSummary : undefined,
            timestamp: typeof entry.timestamp === "number" ? entry.timestamp : undefined,
          })),
        }
      : undefined,
  });
}

function readApprovalHarnessContext(value: unknown): HarnessContextEnvelope | undefined {
  return normalizeHarnessContextEnvelope(value) || undefined;
}

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
    const now = Date.now();
    const harnessContext = await buildApprovalHarnessContext(ctx, {
      agentId: args.agentId,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      actionType: args.actionType,
    });

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
        harnessContext,
        requestedAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000, // 24h expiry
      },
      createdAt: now,
      updatedAt: now,
    });

    await (ctx as any).runMutation(
      generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
      {
        sessionId: args.sessionId,
        fromState: "active",
        toState: "draft",
        actor: "agent",
        actorId: String(args.agentId),
        checkpoint: "approval_requested",
        reason: `approval_required:${args.actionType}`,
        metadata: {
          approvalId,
          actionType: args.actionType,
          harnessContext,
        },
      },
    );

    // Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: approvalId,
      actionType: "approval_requested",
      actionData: {
        agentId: args.agentId,
        tool: args.actionType,
        sessionId: args.sessionId,
        harnessContext,
      },
      performedBy: args.agentId,
      performedAt: now,
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

    return approvals
      .filter((a) => a.status === "pending")
      .map((approval) => {
        const customProperties = (approval.customProperties || {}) as Record<string, unknown>;
        const harnessContext = readApprovalHarnessContext(customProperties.harnessContext);
        if (!harnessContext) {
          return approval;
        }
        return {
          ...approval,
          customProperties: {
            ...customProperties,
            harnessContext,
          },
        };
      });
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
    return approvals.slice(0, limit).map((approval) => {
      const customProperties = (approval.customProperties || {}) as Record<string, unknown>;
      const harnessContext = readApprovalHarnessContext(customProperties.harnessContext);
      if (!harnessContext) {
        return approval;
      }
      return {
        ...approval,
        customProperties: {
          ...customProperties,
          harnessContext,
        },
      };
    });
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
    interventionTemplate: v.optional(interventionTemplateValidator),
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

    const interventionTemplate = normalizeInterventionTemplateInput(
      args.interventionTemplate
    );
    const approvalCustomProperties = (approval.customProperties || {}) as Record<string, unknown>;
    const harnessContext = readApprovalHarnessContext(approvalCustomProperties.harnessContext);
    const now = Date.now();

    // Mark as approved
    await ctx.db.patch(args.approvalId, {
      status: "approved",
      customProperties: {
        ...approval.customProperties,
        ...(harnessContext ? { harnessContext } : {}),
        resolvedAt: now,
        resolvedBy: session.userId,
        ...(interventionTemplate ? { interventionTemplate } : {}),
      },
      updatedAt: now,
    });

    const approvalSessionId =
      (approval.customProperties as { sessionId?: Id<"agentSessions"> } | undefined)
        ?.sessionId;
    if (approvalSessionId) {
      await (ctx as any).runMutation(
        generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
        {
          sessionId: approvalSessionId,
          fromState: "draft",
          toState: "active",
          actor: "operator",
          actorId: String(session.userId),
          checkpoint: "approval_resolved",
          reason: "approval_approved",
          metadata: {
            approvalId: args.approvalId,
            interventionTemplateId: interventionTemplate?.templateId,
            ...(harnessContext ? { harnessContext } : {}),
          },
        },
      );
    }

    // Schedule execution
    await (ctx.scheduler as any).runAfter(0, generatedApi.internal.ai.agentApprovals.executeApprovedAction, {
      approvalId: args.approvalId,
    });

    // Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: approval.organizationId,
      objectId: args.approvalId,
      actionType: "approval_granted",
      actionData: {
        resolvedBy: session.userId,
        reason: "approval_approved",
        resumeCheckpoint: "approval_resolved",
        interventionTemplateId: interventionTemplate?.templateId,
        ...(harnessContext ? { harnessContext } : {}),
        ...(interventionTemplate ? { interventionTemplate } : {}),
      },
      performedBy: session.userId,
      performedAt: now,
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
    interventionTemplate: v.optional(interventionTemplateValidator),
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

    const interventionTemplate = normalizeInterventionTemplateInput(
      args.interventionTemplate
    );
    const approvalCustomProperties = (approval.customProperties || {}) as Record<string, unknown>;
    const harnessContext = readApprovalHarnessContext(approvalCustomProperties.harnessContext);
    const now = Date.now();

    await ctx.db.patch(args.approvalId, {
      status: "rejected",
      customProperties: {
        ...approval.customProperties,
        ...(harnessContext ? { harnessContext } : {}),
        resolvedAt: now,
        resolvedBy: session.userId,
        rejectionReason: args.reason,
        ...(interventionTemplate ? { interventionTemplate } : {}),
      },
      updatedAt: now,
    });

    const approvalSessionId =
      (approval.customProperties as { sessionId?: Id<"agentSessions"> } | undefined)
        ?.sessionId;
    if (approvalSessionId) {
      await (ctx as any).runMutation(
        generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
        {
          sessionId: approvalSessionId,
          fromState: "draft",
          toState: "active",
          actor: "operator",
          actorId: String(session.userId),
          checkpoint: "approval_resolved",
          reason: "approval_rejected",
          metadata: {
            approvalId: args.approvalId,
            rejectionReason: args.reason,
            interventionTemplateId: interventionTemplate?.templateId,
            ...(harnessContext ? { harnessContext } : {}),
          },
        },
      );
    }

    // Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: approval.organizationId,
      objectId: args.approvalId,
      actionType: "approval_rejected",
      actionData: {
        resolvedBy: session.userId,
        reason: args.reason,
        resumeCheckpoint: "approval_resolved",
        interventionTemplateId: interventionTemplate?.templateId,
        ...(harnessContext ? { harnessContext } : {}),
        ...(interventionTemplate ? { interventionTemplate } : {}),
      },
      performedBy: session.userId,
      performedAt: now,
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
        {
          organizationId: approval.organizationId,
          requiredAmount: toolCreditCost,
          billingSource: "platform",
          requestSource: "platform_action",
        }
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
        const approvalCreditDeduction = await (ctx as any).runMutation(
          generatedApi.internal.credits.index.deductCreditsInternalMutation,
          {
            organizationId: approval.organizationId,
            amount: toolCreditCost,
            action: `tool_${toolName}`,
            relatedEntityType: "agent_approval",
            relatedEntityId: args.approvalId as unknown as string,
            billingSource: "platform",
            requestSource: "platform_action",
            softFailOnExhausted: true,
          }
        );

        if (!approvalCreditDeduction.success) {
          console.warn(`[AgentApprovals] Credit deduction skipped for ${toolName}:`, {
            organizationId: approval.organizationId,
            errorCode: approvalCreditDeduction.errorCode,
            message: approvalCreditDeduction.message,
            creditsRequired: approvalCreditDeduction.creditsRequired,
            creditsAvailable: approvalCreditDeduction.creditsAvailable,
          });
        }
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
