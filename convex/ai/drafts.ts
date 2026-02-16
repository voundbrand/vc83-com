/**
 * AI Draft Objects - Human-in-the-Loop (HITL) System
 *
 * Query and manage AI-generated draft objects stored in the objects ontology.
 * Drafts have status="draft" and AI metadata in customProperties.
 *
 * Also handles execution of approved tool calls.
 */

import { query, mutation, action, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { Doc } from "../_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

// Helper to safely get customProperties as Record
const getProps = (obj: Doc<"objects">) => obj.customProperties as Record<string, unknown> | undefined;

/**
 * Get all pending AI drafts for the current user's organization
 */
export const getPendingDrafts = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all objects for this organization, then filter by status and AI metadata
    const allObjects = await ctx.db
      .query("objects")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Filter for AI-generated drafts only
    return allObjects.filter(
      (obj) =>
        obj.status === "draft" &&
        getProps(obj)?.aiGenerated === true
    );
  },
});

/**
 * Get AI drafts for a specific conversation
 */
export const getDraftsByConversation = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    conversationId: v.id("aiConversations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all objects for this organization
    const allObjects = await ctx.db
      .query("objects")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Filter for drafts in this conversation
    return allObjects.filter(
      (obj) =>
        obj.status === "draft" &&
        getProps(obj)?.aiGenerated === true &&
        getProps(obj)?.aiConversationId === args.conversationId
    );
  },
});

/**
 * Get draft by ID with full context
 */
export const getDraftById = query({
  args: {
    sessionId: v.string(),
    draftId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const draft = await ctx.db.get(args.draftId);

    if (!draft) {
      throw new Error("Draft not found");
    }

    // Get user's organization from membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!membership || draft.organizationId !== membership.organizationId) {
      throw new Error("Access denied");
    }

    if (draft.status !== "draft") {
      throw new Error("Object is not a draft");
    }

    return draft;
  },
});

/**
 * Approve a draft - changes status from "draft" to "active"
 */
export const approveDraft = mutation({
  args: {
    sessionId: v.string(),
    draftId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get the draft
    const draft = await ctx.db.get(args.draftId);

    if (!draft) {
      throw new Error("Draft not found");
    }

    // Get user's organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!membership || draft.organizationId !== membership.organizationId) {
      throw new Error("Access denied");
    }

    if (draft.status !== "draft") {
      throw new Error("Object is not a draft");
    }

    // Update status to active
    await ctx.db.patch(args.draftId, {
      status: "active",
      updatedAt: Date.now(),
      customProperties: {
        ...draft.customProperties,
        aiApprovedBy: userId,
        aiApprovedAt: Date.now(),
      },
    });

    // Record action in objectActions for audit trail
    await ctx.db.insert("objectActions", {
      organizationId: draft.organizationId,
      objectId: args.draftId,
      actionType: "approved_draft",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: {
        status: { from: "draft", to: "active" },
      },
    });

    console.log(`Draft approved: ${args.draftId} by user ${userId}`);

    return {
      success: true,
      objectId: args.draftId,
      type: draft.type,
      name: draft.name,
    };
  },
});

/**
 * Reject a draft - changes status from "draft" to "rejected"
 */
export const rejectDraft = mutation({
  args: {
    sessionId: v.string(),
    draftId: v.id("objects"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get the draft
    const draft = await ctx.db.get(args.draftId);

    if (!draft) {
      throw new Error("Draft not found");
    }

    // Get user's organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!membership || draft.organizationId !== membership.organizationId) {
      throw new Error("Access denied");
    }

    if (draft.status !== "draft") {
      throw new Error("Object is not a draft");
    }

    // Update status to rejected
    await ctx.db.patch(args.draftId, {
      status: "rejected",
      updatedAt: Date.now(),
      customProperties: {
        ...draft.customProperties,
        aiRejectedBy: userId,
        aiRejectedAt: Date.now(),
        aiRejectionReason: args.reason || "No reason provided",
      },
    });

    // Record action in objectActions for audit trail
    await ctx.db.insert("objectActions", {
      organizationId: draft.organizationId,
      objectId: args.draftId,
      actionType: "rejected_draft",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: {
        status: { from: "draft", to: "rejected" },
        reason: args.reason,
      },
    });

    console.log(`Draft rejected: ${args.draftId} by user ${userId}. Reason: ${args.reason || "none"}`);

    return {
      success: true,
      objectId: args.draftId,
      type: draft.type,
      name: draft.name,
    };
  },
});

/**
 * Update a draft's fields before approval
 * Allows user to edit AI-generated parameters
 */
export const updateDraft = mutation({
  args: {
    sessionId: v.string(),
    draftId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      customProperties: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get the draft
    const draft = await ctx.db.get(args.draftId);

    if (!draft) {
      throw new Error("Draft not found");
    }

    // Get user's organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!membership || draft.organizationId !== membership.organizationId) {
      throw new Error("Access denied");
    }

    if (draft.status !== "draft") {
      throw new Error("Cannot edit non-draft objects");
    }

    // Prepare update object
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.updates.name !== undefined) {
      updateData.name = args.updates.name;
    }

    if (args.updates.description !== undefined) {
      updateData.description = args.updates.description;
    }

    if (args.updates.customProperties !== undefined) {
      const props = getProps(draft);
      // Merge with existing customProperties, preserving AI metadata
      updateData.customProperties = {
        ...draft.customProperties,
        ...args.updates.customProperties,
        // Preserve AI metadata
        aiGenerated: props?.aiGenerated,
        aiToolName: props?.aiToolName,
        aiConversationId: props?.aiConversationId,
        aiUserMessage: props?.aiUserMessage,
        aiReasoning: props?.aiReasoning,
        aiCreatedAt: props?.aiCreatedAt,
        aiParameters: props?.aiParameters,
        // Track that it was edited
        aiEditedBy: userId,
        aiEditedAt: Date.now(),
      };
    }

    // Update the draft
    await ctx.db.patch(args.draftId, updateData);

    // Record action in objectActions
    await ctx.db.insert("objectActions", {
      organizationId: draft.organizationId,
      objectId: args.draftId,
      actionType: "edited_draft",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: args.updates,
    });

    console.log(`Draft edited: ${args.draftId} by user ${userId}`);

    return {
      success: true,
      objectId: args.draftId,
    };
  },
});

/**
 * Delete a draft (hard delete, not status change)
 * Use this sparingly - typically use reject instead
 */
export const deleteDraft = mutation({
  args: {
    sessionId: v.string(),
    draftId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get the draft
    const draft = await ctx.db.get(args.draftId);

    if (!draft) {
      throw new Error("Draft not found");
    }

    // Get user's organization
    const membership = await ctx.db.query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!membership || draft.organizationId !== membership.organizationId) {
      throw new Error("Access denied");
    }

    if (draft.status !== "draft") {
      throw new Error("Can only delete drafts");
    }

    // Record action before deletion
    await ctx.db.insert("objectActions", {
      organizationId: draft.organizationId,
      objectId: args.draftId,
      actionType: "deleted_draft",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: {
        deleted: true,
        type: draft.type,
        name: draft.name,
      },
    });

    // Hard delete the draft
    await ctx.db.delete(args.draftId);

    console.log(`Draft deleted: ${args.draftId} by user ${userId}`);

    return {
      success: true,
      objectId: args.draftId,
    };
  },
});

// ============================================================================
// TOOL EXECUTION APPROVAL SYSTEM
// ============================================================================

/**
 * Execute an approved tool call
 *
 * This action is scheduled by approveToolExecution mutation.
 * It executes the tool and updates the execution record.
 */
export const executeApprovedTool = action({
  args: {
    executionId: v.id("aiToolExecutions"),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      // 1. Get the execution record
      const execution = await (ctx as any).runQuery(generatedApi.api.ai.conversations.getToolExecution, {
        executionId: args.executionId,
      });

      if (!execution) {
        throw new Error("Execution not found");
      }

      if (execution.status !== "approved") {
        throw new Error(`Execution not in approved state (current: ${execution.status})`);
      }

      console.log("[Tool Approval] Executing tool:", execution.toolName);

      // 2. Mark as executing
      await (ctx as any).runMutation(generatedApi.internal.ai.drafts.updateExecutionStatus, {
        executionId: args.executionId,
        status: "executing",
      });

      // 3. Execute the tool via the registry
      const { executeTool } = await import("./tools/registry");

      const result = await executeTool(
        {
          ...ctx,
          organizationId: execution.organizationId,
          userId: execution.userId,
          conversationId: execution.conversationId,
        },
        execution.toolName,
        execution.parameters
      );

      const durationMs = Date.now() - startTime;

      // 4. Determine success/failure
      const success = result && typeof result === 'object' && 'success' in result
        ? result.success !== false
        : true;

      // 5. Update execution with result
      await (ctx as any).runMutation(generatedApi.internal.ai.drafts.updateExecutionStatus, {
        executionId: args.executionId,
        status: success ? "success" : "failed",
        result,
        durationMs,
      });

      // 6. REMOVED: Don't add tool results to chat
      // Tool results should ONLY appear in the Tool Execution panel, not in main chat
      // The user can see the result by clicking the execution in the Tool Execution panel

      // 7. For failures, optionally trigger AI auto-recovery (commented out for now)
      // TODO: Consider if we want AI to auto-suggest fixes for failed executions
      if (!success && result && typeof result === 'object' && 'error' in result) {
        console.log("[Tool Approval] Tool failed:", result.error);
        // Could trigger AI recovery here if desired
      } else if (success) {
        console.log("[Tool Approval] Tool succeeded");

        console.log("[Tool Approval] Success fed back to AI conversation");

        // Create work items for successful tool executions
        const workItems = extractWorkItemsFromResult(execution.toolName, result, execution.parameters);
        for (const item of workItems) {
          try {
            await (ctx as any).runMutation(generatedApi.api.ai.workItems.createAIWorkItem, {
              conversationId: execution.conversationId,
              organizationId: execution.organizationId,
              userId: execution.userId,
              type: item.type,
              name: item.name,
              status: "completed",
              results: item.data,
              progress: {
                total: 1,
                completed: 1,
                failed: 0,
              },
            });
            console.log(`[Tool Approval] Created work item: ${item.name} (${item.type})`);
          } catch (error) {
            console.error("[Tool Approval] Failed to create work item:", error);
            // Don't fail the whole flow if work item creation fails
          }
        }

        // 7. Trigger AI to continue and propose next steps
        // Build a continuation prompt that tells the AI about the success
        try {
          const continuationPrompt = `✅ Tool executed successfully! Here are the results:

**Tool:** ${execution.toolName}
**Result:** ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}

Now that I have this information, let me continue with the task. What should I do next?`;

          await (ctx as any).runAction(generatedApi.api.ai.chat.sendMessage, {
            conversationId: execution.conversationId,
            message: continuationPrompt,
            organizationId: execution.organizationId,
            userId: execution.userId,
            isAutoRecovery: false, // This will create proposals for next steps
          });
          console.log("[Tool Approval] AI triggered to continue after success");
        } catch (aiError) {
          console.error("[Tool Approval] Failed to trigger AI continuation:", aiError);
          // Don't fail the whole flow if AI trigger fails
        }
      }

      console.log("[Tool Approval] Tool execution completed:", execution.toolName, success ? "✅" : "❌");

      return {
        success,
        executionId: args.executionId,
        result,
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error("[Tool Approval] Tool execution failed:", error);

      // Mark as failed
      await (ctx as any).runMutation(generatedApi.internal.ai.drafts.updateExecutionStatus, {
        executionId: args.executionId,
        status: "failed",
        error: errorMessage,
        durationMs,
      });

      return {
        success: false,
        executionId: args.executionId,
        error: errorMessage,
      };
    }
  },
});

/**
 * Internal mutation to update execution status
 * (used by executeApprovedTool action)
 */
export const updateExecutionStatus = internalMutation({
  args: {
    executionId: v.id("aiToolExecutions"),
    status: v.union(
      v.literal("executing"),
      v.literal("success"),
      v.literal("failed")
    ),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.result !== undefined) {
      updates.result = args.result;
      updates.output = args.result; // Alias for compatibility
      updates.success = true;
    }

    if (args.error !== undefined) {
      updates.error = args.error;
      updates.success = false;
    }

    if (args.durationMs !== undefined) {
      updates.durationMs = args.durationMs;
    }

    if (args.status === "success" || args.status === "failed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.executionId, updates);

    return { success: true };
  },
});

// ============================================================================
// WORK ITEM EXTRACTION HELPERS
// ============================================================================

/**
 * Extract work items from tool execution results
 * Maps tool execution results to work item records for UI tracking
 */
function extractWorkItemsFromResult(
  toolName: string,
  result: unknown,
  parameters: unknown
): Array<{ type: string; name: string; data: unknown }> {
  const items: Array<{ type: string; name: string; data: unknown }> = [];
  const res = result as Record<string, unknown> | null;
  const params = parameters as Record<string, unknown> | null;

  if (!result || typeof result !== 'object') {
    return items;
  }

  // Handle manage_projects tool
  if (toolName === "manage_projects") {
    const action = params?.action || res?.action;
    const data = res?.data as Record<string, unknown> | undefined;

    if (action === "create_project" && res?.success && data) {
      items.push({
        type: "project",
        name: (data.name as string) || "New Project",
        data: data,
      });
    }

    if (action === "create_milestone" && res?.success && data) {
      items.push({
        type: "milestone",
        name: (data.name as string) || "New Milestone",
        data: data,
      });
    }

    // Handle multiple milestones created at once
    const milestones = data?.milestones;
    if (milestones && Array.isArray(milestones)) {
      milestones.forEach((milestone: Record<string, unknown>) => {
        items.push({
          type: "milestone",
          name: (milestone.name as string) || "New Milestone",
          data: milestone,
        });
      });
    }

    if (action === "create_task" && res?.success && data) {
      items.push({
        type: "task",
        name: (data.name as string) || "New Task",
        data: data,
      });
    }
  }

  // Handle CRM tools
  if (toolName === "manage_crm") {
    const action = params?.action || res?.action;
    const data = res?.data as Record<string, unknown> | undefined;

    if (action === "create_contact" && res?.success && data) {
      items.push({
        type: "contact",
        name: (data.name as string) || (data.email as string) || "New Contact",
        data: data,
      });
    }

    if (action === "create_organization" && res?.success && data) {
      items.push({
        type: "organization",
        name: (data.name as string) || "New Organization",
        data: data,
      });
    }
  }

  return items;
}
