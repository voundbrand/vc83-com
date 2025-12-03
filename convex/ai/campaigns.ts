/**
 * AI Email Campaign Management
 *
 * Handles bulk email campaign creation and tracking for the AI bulk email tool.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * CREATE CAMPAIGN
 *
 * Creates a new email campaign record for tracking bulk emails.
 * Called when generating preview emails in bulk email tool.
 */
export const createCampaign = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    name: v.string(),
    status: v.union(v.literal("draft"), v.literal("scheduled"), v.literal("sending"), v.literal("completed"), v.literal("failed")),
    targetType: v.string(),
    targetCriteria: v.any(),
    subject: v.string(),
    bodyTemplate: v.string(),
    aiTone: v.optional(v.string()),
    totalRecipients: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const campaignId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "email_campaign",
      subtype: "bulk_ai_email",
      name: args.name,
      status: args.status as "draft" | "active" | "completed",
      customProperties: {
        targetType: args.targetType,
        targetCriteria: args.targetCriteria,
        subject: args.subject,
        bodyTemplate: args.bodyTemplate,
        aiTone: args.aiTone,
        totalRecipients: args.totalRecipients,
        sentCount: 0,
        failedCount: 0,
        scheduledAt: null,
        completedAt: null,
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return campaignId;
  },
});

/**
 * UPDATE CAMPAIGN STATS
 *
 * Updates campaign statistics after sending emails.
 */
export const updateCampaignStats = mutation({
  args: {
    campaignId: v.id("objects"),
    sent: v.number(),
    failed: v.number(),
    status: v.union(v.literal("draft"), v.literal("scheduled"), v.literal("sending"), v.literal("completed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    await ctx.db.patch(args.campaignId, {
      status: args.status as "draft" | "active" | "completed",
      customProperties: {
        ...campaign.customProperties,
        sentCount: args.sent,
        failedCount: args.failed,
        completedAt: args.status === "completed" ? Date.now() : campaign.customProperties?.completedAt,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * GET CAMPAIGN
 *
 * Retrieves a campaign by ID.
 */
export const getCampaign = query({
  args: {
    campaignId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.type !== "email_campaign") {
      return null;
    }
    return campaign;
  },
});

/**
 * LIST CAMPAIGNS
 *
 * Lists all campaigns for an organization.
 */
export const listCampaigns = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const campaigns = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "email_campaign")
      )
      .order("desc")
      .collect();

    return campaigns;
  },
});
