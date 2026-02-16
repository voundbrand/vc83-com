/**
 * Work Item Actions
 *
 * Mutations for approving and canceling contact syncs and email campaigns
 */

import { mutation, action } from "../_generated/server";
import { v } from "convex/values";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

// ============================================================================
// CONTACT SYNC ACTIONS
// ============================================================================

/**
 * Approve and execute a contact sync
 * Transitions from "preview" to "executing" then "completed"
 */
export const approveContactSync = action({
  args: {
    syncId: v.id("contactSyncs"),
  },
  handler: async (ctx, args) => {
    // Get and validate the sync
    const sync = await (ctx as any).runQuery(generatedApi.api.ai.workItems.getContactSync, {
      syncId: args.syncId,
    });

    if (!sync) {
      throw new Error("Contact sync not found");
    }

    if (sync.status !== "preview") {
      throw new Error(`Cannot approve sync with status: ${sync.status}`);
    }

    // Mark as executing
    await (ctx as any).runMutation(generatedApi.api.ai.workItemActions.updateContactSyncStatus, {
      syncId: args.syncId,
      status: "executing",
    });

    // TODO: Actually execute the sync by calling contact sync tool
    // For now, just mark as completed
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work

    // Mark as completed
    await (ctx as any).runMutation(generatedApi.api.ai.workItemActions.updateContactSyncStatus, {
      syncId: args.syncId,
      status: "completed",
    });

    return { success: true, syncId: args.syncId };
  },
});

/**
 * Update contact sync status (internal mutation)
 */
export const updateContactSyncStatus = mutation({
  args: {
    syncId: v.id("contactSyncs"),
    status: v.union(
      v.literal("preview"),
      v.literal("executing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const sync = await ctx.db.get(args.syncId);
    if (!sync) throw new Error("Contact sync not found");

    const updates: Record<string, any> = { status: args.status };

    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
      updates.previewData = undefined; // Clear to save space
    }

    await ctx.db.patch(args.syncId, updates);
    return { success: true };
  },
});

/**
 * Cancel a contact sync
 */
export const cancelContactSync = mutation({
  args: {
    syncId: v.id("contactSyncs"),
  },
  handler: async (ctx, args) => {
    const sync = await ctx.db.get(args.syncId);
    if (!sync) throw new Error("Contact sync not found");

    if (sync.status !== "preview") {
      throw new Error(`Cannot cancel sync with status: ${sync.status}`);
    }

    await ctx.db.delete(args.syncId);
    return { success: true, syncId: args.syncId };
  },
});

// ============================================================================
// EMAIL CAMPAIGN ACTIONS
// ============================================================================

/**
 * Approve and send an email campaign
 * Transitions from "draft" to "sending" then "completed"
 */
export const approveEmailCampaign = action({
  args: {
    campaignId: v.id("emailCampaigns"),
  },
  handler: async (ctx, args) => {
    // Get and validate the campaign
    const campaign = await (ctx as any).runQuery(generatedApi.api.ai.workItems.getEmailCampaign, {
      campaignId: args.campaignId,
    });

    if (!campaign) {
      throw new Error("Email campaign not found");
    }

    if (campaign.status !== "draft" && campaign.status !== "pending") {
      throw new Error(`Cannot approve campaign with status: ${campaign.status}`);
    }

    // Mark as sending
    await (ctx as any).runMutation(generatedApi.api.ai.workItemActions.updateEmailCampaignStatus, {
      campaignId: args.campaignId,
      status: "sending",
    });

    // TODO: Actually send the emails by calling bulk email tool
    // For now, just mark as completed
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work

    // Mark as completed
    await (ctx as any).runMutation(generatedApi.api.ai.workItemActions.updateEmailCampaignStatus, {
      campaignId: args.campaignId,
      status: "completed",
    });

    return { success: true, campaignId: args.campaignId };
  },
});

/**
 * Update email campaign status (internal mutation)
 */
export const updateEmailCampaignStatus = mutation({
  args: {
    campaignId: v.id("emailCampaigns"),
    status: v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("sending"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Email campaign not found");

    const updates: Record<string, any> = { status: args.status };

    if (args.status === "sending" && !campaign.sentAt) {
      updates.sentAt = Date.now();
    }

    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
      updates.previewData = undefined; // Clear to save space
    }

    await ctx.db.patch(args.campaignId, updates);
    return { success: true };
  },
});

/**
 * Cancel an email campaign
 */
export const cancelEmailCampaign = mutation({
  args: {
    campaignId: v.id("emailCampaigns"),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Email campaign not found");

    if (campaign.status !== "draft" && campaign.status !== "pending") {
      throw new Error(`Cannot cancel campaign with status: ${campaign.status}`);
    }

    await ctx.db.delete(args.campaignId);
    return { success: true, campaignId: args.campaignId };
  },
});

// Need to import api for the runQuery/runMutation calls
import { api } from "../_generated/api";
