/**
 * Work Items Queries
 *
 * Real-time queries for contact syncs and email campaigns
 * Powers the three-pane UI work item display
 */

import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

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
 * Combines contact syncs and email campaigns into a unified view
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
    ];

    // Sort by creation date (newest first)
    return workItems.sort((a, b) => b.createdAt - a.createdAt);
  },
});
