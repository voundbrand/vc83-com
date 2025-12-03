/**
 * AI Draft Objects - Human-in-the-Loop (HITL) System
 *
 * Query and manage AI-generated draft objects stored in the objects ontology.
 * Drafts have status="draft" and AI metadata in customProperties.
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";

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
