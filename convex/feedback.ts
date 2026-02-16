/**
 * USER FEEDBACK
 *
 * Stores user feedback in the objects table and sends email notification.
 */

import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Submit feedback (public action)
 *
 * Stores feedback in objects table and sends email to support team.
 */
export const submitFeedback = action({
  args: {
    organizationId: v.id("organizations"),
    category: v.union(
      v.literal("bug"),
      v.literal("feature"),
      v.literal("feedback"),
      v.literal("billing")
    ),
    rating: v.number(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    if (!args.message.trim()) {
      throw new Error("Feedback message cannot be empty");
    }

    // Get org details
    const org = await ctx.runQuery(api.organizations.get, { id: args.organizationId });

    // Store feedback in objects table
    await ctx.runMutation(internal.feedback.insertFeedback, {
      organizationId: args.organizationId,
      category: args.category,
      rating: args.rating,
      message: args.message.trim(),
    });

    // Send email notification (non-blocking)
    try {
      await ctx.runAction(internal.actions.feedbackEmail.sendFeedbackNotification, {
        category: args.category,
        rating: args.rating,
        message: args.message.trim(),
        userEmail: org?.email || "",
        userName: org?.name || "Unknown User",
        organizationName: org?.name || "Unknown Organization",
      });
    } catch (error) {
      console.error("[Feedback] Failed to send email notification:", error);
    }

    return { success: true };
  },
});

/**
 * Insert feedback record (internal mutation)
 */
export const insertFeedback = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    category: v.string(),
    rating: v.number(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "user_feedback",
      subtype: args.category,
      name: `${args.category} feedback`,
      status: "active",
      customProperties: {
        category: args.category,
        rating: args.rating,
        message: args.message,
        submittedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });
  },
});
