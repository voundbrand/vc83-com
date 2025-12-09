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
import { api, internal } from "../_generated/api";

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
        (obj.customProperties as any)?.aiGenerated === true
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
        (obj.customProperties as any)?.aiGenerated === true &&
        (obj.customProperties as any)?.aiConversationId === args.conversationId
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
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.updates.name !== undefined) {
      updateData.name = args.updates.name;
    }

    if (args.updates.description !== undefined) {
      updateData.description = args.updates.description;
    }

    if (args.updates.customProperties !== undefined) {
      // Merge with existing customProperties, preserving AI metadata
      updateData.customProperties = {
        ...draft.customProperties,
        ...args.updates.customProperties,
        // Preserve AI metadata
        aiGenerated: (draft.customProperties as any)?.aiGenerated,
        aiToolName: (draft.customProperties as any)?.aiToolName,
        aiConversationId: (draft.customProperties as any)?.aiConversationId,
        aiUserMessage: (draft.customProperties as any)?.aiUserMessage,
        aiReasoning: (draft.customProperties as any)?.aiReasoning,
        aiCreatedAt: (draft.customProperties as any)?.aiCreatedAt,
        aiParameters: (draft.customProperties as any)?.aiParameters,
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
      const execution: any = await ctx.runQuery(api.ai.conversations.getToolExecution, {
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
      await ctx.runMutation(internal.ai.drafts.updateExecutionStatus, {
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
      await ctx.runMutation(internal.ai.drafts.updateExecutionStatus, {
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
            await ctx.runMutation(api.ai.workItems.createAIWorkItem, {
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

          await ctx.runAction(api.ai.chat.sendMessage, {
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
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      console.error("[Tool Approval] Tool execution failed:", error);

      // Mark as failed
      await ctx.runMutation(internal.ai.drafts.updateExecutionStatus, {
        executionId: args.executionId,
        status: "failed",
        error: error.message,
        durationMs,
      });

      return {
        success: false,
        executionId: args.executionId,
        error: error.message,
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
    const updates: any = {
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
  result: any,
  parameters: any
): Array<{ type: string; name: string; data: any }> {
  const items: Array<{ type: string; name: string; data: any }> = [];

  if (!result || typeof result !== 'object') {
    return items;
  }

  // Handle manage_projects tool
  if (toolName === "manage_projects") {
    const action = parameters?.action || result?.action;

    if (action === "create_project" && result.success && result.data) {
      items.push({
        type: "project",
        name: result.data.name || "New Project",
        data: result.data,
      });
    }

    if (action === "create_milestone" && result.success && result.data) {
      items.push({
        type: "milestone",
        name: result.data.name || "New Milestone",
        data: result.data,
      });
    }

    // Handle multiple milestones created at once
    if (result.data?.milestones && Array.isArray(result.data.milestones)) {
      result.data.milestones.forEach((milestone: any) => {
        items.push({
          type: "milestone",
          name: milestone.name || "New Milestone",
          data: milestone,
        });
      });
    }

    if (action === "create_task" && result.success && result.data) {
      items.push({
        type: "task",
        name: result.data.name || "New Task",
        data: result.data,
      });
    }
  }

  // Handle CRM tools
  if (toolName === "manage_crm") {
    const action = parameters?.action || result?.action;

    if (action === "create_contact" && result.success && result.data) {
      items.push({
        type: "contact",
        name: result.data.name || result.data.email || "New Contact",
        data: result.data,
      });
    }

    if (action === "create_organization" && result.success && result.data) {
      items.push({
        type: "organization",
        name: result.data.name || "New Organization",
        data: result.data,
      });
    }
  }

  return items;
}
