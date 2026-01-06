/**
 * Work Items Queries
 *
 * Real-time queries for contact syncs, email campaigns, and AI-created work items
 * Powers the three-pane UI work item display
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";

// ============================================================================
// CONTACT SYNC QUERIES
// ============================================================================

/**
 * Get contact syncs for an organization
 * Shows all syncs with their current status and preview data
 */
export const getContactSyncs = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const syncs = await ctx.db
      .query("contactSyncs")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(args.limit || 50);

    return syncs;
  },
});

/**
 * Get a single contact sync with full details
 */
export const getContactSync = query({
  args: {
    syncId: v.id("contactSyncs"),
  },
  handler: async (ctx, args) => {
    const sync = await ctx.db.get(args.syncId);
    if (!sync) return null;

    // Get user who initiated the sync
    const user = await ctx.db.get(sync.userId);

    return {
      ...sync,
      userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : "Unknown User",
    };
  },
});

/**
 * Get contact sync preview items
 * These are the individual contacts being synced (from previewData)
 */
export const getContactSyncItems = query({
  args: {
    syncId: v.id("contactSyncs"),
  },
  handler: async (ctx, args) => {
    const sync = await ctx.db.get(args.syncId);
    if (!sync || !sync.previewData) return [];

    // Return preview data as work items
    // Each item represents a contact to be created/updated/skipped
    return sync.previewData as Array<{
      id: string;
      sourceId: string;
      sourceName: string;
      sourceEmail: string;
      match: {
        action: "create" | "update" | "skip" | "merge";
        matchedContactId?: string;
        confidence: "high" | "medium" | "low";
        reason: string;
      };
      data: Record<string, unknown>;
    }>;
  },
});

// ============================================================================
// EMAIL CAMPAIGN QUERIES
// ============================================================================

/**
 * Get email campaigns for an organization
 */
export const getEmailCampaigns = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const campaigns = await ctx.db
      .query("emailCampaigns")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(args.limit || 50);

    return campaigns;
  },
});

/**
 * Get a single email campaign with full details
 */
export const getEmailCampaign = query({
  args: {
    campaignId: v.id("emailCampaigns"),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return null;

    // Get user who created the campaign
    const user = await ctx.db.get(campaign.userId);

    return {
      ...campaign,
      userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : "Unknown User",
    };
  },
});

/**
 * Get email campaign preview items
 * These are the individual emails being sent (from previewData)
 */
export const getEmailCampaignItems = query({
  args: {
    campaignId: v.id("emailCampaigns"),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || !campaign.previewData) return [];

    // Return preview data as work items
    // Each item represents an email to be sent
    return campaign.previewData as Array<{
      recipientId: string;
      recipientEmail: string;
      recipientName: string;
      subject: string;
      body: string;
      personalization: Record<string, string>;
    }>;
  },
});

// ============================================================================
// COMBINED WORK ITEMS QUERY
// ============================================================================

/**
 * Get all active work items for an organization
 * Combines contact syncs, email campaigns, and AI work items into a unified view
 */
export const getActiveWorkItems = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get active contact syncs (preview or executing)
    const activeSyncs = await ctx.db
      .query("contactSyncs")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "preview"),
          q.eq(q.field("status"), "executing")
        )
      )
      .take(20);

    // Get active email campaigns (draft, pending, sending)
    const activeCampaigns = await ctx.db
      .query("emailCampaigns")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "draft"),
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "sending")
        )
      )
      .take(20);

    // Get active AI work items (preview, approved, executing, completed)
    const aiWorkItems = await ctx.db
      .query("aiWorkItems")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "preview"),
          q.eq(q.field("status"), "approved"),
          q.eq(q.field("status"), "executing"),
          q.eq(q.field("status"), "completed")
        )
      )
      .take(20);

    // Transform to unified work item format
    const workItems = [
      ...activeSyncs.map((sync) => ({
        id: sync._id,
        type: "contact_sync" as const,
        name: `Contact Sync - ${sync.provider}`,
        status: sync.status,
        createdAt: sync.startedAt,
        progress: {
          total: sync.totalContacts,
          completed: sync.created + sync.updated + sync.skipped,
          failed: sync.failed,
        },
      })),
      ...activeCampaigns.map((campaign) => ({
        id: campaign._id,
        type: "email_campaign" as const,
        name: campaign.name,
        status: campaign.status,
        createdAt: campaign.createdAt,
        progress: {
          total: campaign.totalRecipients,
          completed: campaign.sent,
          failed: campaign.failed,
        },
      })),
      ...aiWorkItems.map((item) => ({
        id: item._id,
        type: `ai_${item.type}` as const, // "ai_project" | "ai_milestone" | "ai_task" | etc.
        name: item.name,
        status: item.status,
        createdAt: item.createdAt,
        progress: item.progress || {
          total: 1,
          completed: item.status === "completed" ? 1 : 0,
          failed: item.status === "failed" ? 1 : 0,
        },
      })),
    ];

    // Sort by creation date (newest first)
    return workItems.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ============================================================================
// AI WORK ITEMS MANAGEMENT
// ============================================================================

/**
 * Get work items for a specific conversation
 */
export const getAIWorkItemsForConversation = query({
  args: {
    conversationId: v.id("aiConversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiWorkItems")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a single AI work item by ID
 */
export const getAIWorkItem = query({
  args: {
    workItemId: v.id("aiWorkItems"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workItemId);
  },
});

/**
 * Create a work item after successful tool execution
 * Called internally from executeApprovedTool action
 */
export const createAIWorkItem = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    type: v.string(), // "project" | "milestone" | "task" | "contact" | "organization"
    name: v.string(),
    status: v.string(),
    previewData: v.optional(v.array(v.any())),
    results: v.optional(v.any()),
    progress: v.optional(v.object({
      total: v.number(),
      completed: v.number(),
      failed: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate status against the union type in schema
    const validStatuses = ["preview", "approved", "executing", "completed", "failed", "cancelled"];
    const status = validStatuses.includes(args.status) ? args.status : "completed";

    return await ctx.db.insert("aiWorkItems", {
      organizationId: args.organizationId,
      userId: args.userId,
      conversationId: args.conversationId,
      type: args.type,
      name: args.name,
      status: status as "preview" | "approved" | "executing" | "completed" | "failed" | "cancelled",
      previewData: args.previewData,
      results: args.results,
      progress: args.progress || {
        total: 1,
        completed: 1,
        failed: 0,
      },
      createdAt: now,
      completedAt: status === "completed" ? now : undefined,
    });
  },
});

/**
 * Update a work item's data
 */
export const updateAIWorkItem = mutation({
  args: {
    sessionId: v.string(),
    workItemId: v.id("aiWorkItems"),
    updates: v.object({
      name: v.optional(v.string()),
      status: v.optional(v.string()),
      results: v.optional(v.any()),
      progress: v.optional(v.object({
        total: v.number(),
        completed: v.number(),
        failed: v.number(),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workItem = await ctx.db.get(args.workItemId);
    if (!workItem) {
      throw new Error("Work item not found");
    }

    // Verify user has access to this work item
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!membership || workItem.organizationId !== membership.organizationId) {
      throw new Error("Access denied");
    }

    // Build update object with proper status type
    const updateData: {
      name?: string;
      status?: "preview" | "approved" | "executing" | "completed" | "failed" | "cancelled";
      completedAt?: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results?: any;
      progress?: { total: number; completed: number; failed: number };
    } = {};

    if (args.updates.name !== undefined) {
      updateData.name = args.updates.name;
    }

    if (args.updates.status !== undefined) {
      // Validate status against the union type in schema
      const validStatuses = ["preview", "approved", "executing", "completed", "failed", "cancelled"] as const;
      if (validStatuses.includes(args.updates.status as typeof validStatuses[number])) {
        updateData.status = args.updates.status as typeof validStatuses[number];
      }
      if (args.updates.status === "completed") {
        updateData.completedAt = Date.now();
      }
    }

    if (args.updates.results !== undefined) {
      updateData.results = args.updates.results;
    }

    if (args.updates.progress !== undefined) {
      updateData.progress = args.updates.progress;
    }

    // Update the work item
    await ctx.db.patch(args.workItemId, updateData);

    return { success: true, workItemId: args.workItemId };
  },
});

/**
 * Delete a work item
 */
export const deleteAIWorkItem = mutation({
  args: {
    sessionId: v.string(),
    workItemId: v.id("aiWorkItems"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workItem = await ctx.db.get(args.workItemId);
    if (!workItem) {
      throw new Error("Work item not found");
    }

    // Verify user has access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!membership || workItem.organizationId !== membership.organizationId) {
      throw new Error("Access denied");
    }

    // Delete the work item
    await ctx.db.delete(args.workItemId);

    return { success: true, workItemId: args.workItemId };
  },
});
