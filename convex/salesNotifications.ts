/**
 * SALES NOTIFICATIONS INTERNAL MUTATIONS
 *
 * Store and track sales notifications
 */

import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create sales notification record
 */
export const createNotification = internalMutation({
  args: {
    eventType: v.union(
      v.literal("free_signup"),
      v.literal("starter_upgrade"),
      v.literal("build_sprint_app"),
      v.literal("milestone_reached")
    ),
    recipientEmail: v.string(),
    subject: v.string(),
    body: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const notificationId = await ctx.db.insert("salesNotifications", {
      eventType: args.eventType,
      recipientEmail: args.recipientEmail,
      subject: args.subject,
      body: args.body,
      metadata: args.metadata,
      status: "pending",
      createdAt: now,
    });

    return { success: true, notificationId };
  },
});

/**
 * Get pending sales notifications
 */
export const getPendingNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const notifications = await ctx.db
      .query("salesNotifications")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(limit);

    return notifications;
  },
});

/**
 * Mark notification as sent
 */
export const markNotificationSent = internalMutation({
  args: {
    notificationId: v.id("salesNotifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      status: "sent",
      sentAt: Date.now(),
    });

    return { success: true };
  },
});
