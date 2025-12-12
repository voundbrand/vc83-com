/**
 * EMAIL QUEUE SYSTEM
 *
 * Stores emails for delivery via external service (Resend, SendGrid, etc.)
 * This allows us to track email delivery status and retry failures.
 */

import { mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * INTERNAL: Queue an email for delivery
 */
export const queueEmail = internalMutation({
  args: {
    organizationId: v.id("organizations"), // Added for license checks
    to: v.string(),
    subject: v.string(),
    htmlBody: v.string(),
    textBody: v.string(),
    type: v.union(
      v.literal("welcome"),
      v.literal("sales_notification"),
      v.literal("transactional"),
      v.literal("marketing")
    ),
  },
  handler: async (ctx, args) => {
    // CHECK MONTHLY LIMIT: Emails per month (Free: 0, Starter: 500)
    // Skip for transactional emails (receipts, password resets, etc.)
    if (args.type === "marketing") {
      const { checkMonthlyResourceLimit } = await import("./licensing/helpers");
      await checkMonthlyResourceLimit(
        ctx,
        args.organizationId,
        "email_sent", // Note: We need to track sent emails in objects table
        "maxEmailsPerMonth"
      );
    }

    const now = Date.now();

    const emailId = await ctx.db.insert("emailQueue", {
      to: args.to,
      subject: args.subject,
      htmlBody: args.htmlBody,
      textBody: args.textBody,
      type: args.type,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, emailId };
  },
});

/**
 * Get pending emails (for delivery worker)
 */
export const getPendingEmails = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    const emails = await ctx.db
      .query("emailQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(limit);

    return emails;
  },
});

/**
 * Mark email as sent
 */
export const markEmailSent = mutation({
  args: {
    emailId: v.id("emailQueue"),
    externalId: v.optional(v.string()), // ID from email service
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      status: "sent",
      sentAt: Date.now(),
      externalId: args.externalId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark email as failed
 */
export const markEmailFailed = mutation({
  args: {
    emailId: v.id("emailQueue"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");

    const retryCount = (email.retryCount || 0) + 1;
    const maxRetries = 3;

    await ctx.db.patch(args.emailId, {
      status: retryCount >= maxRetries ? "failed" : "pending",
      lastError: args.error,
      retryCount,
      updatedAt: Date.now(),
    });

    return { success: true, willRetry: retryCount < maxRetries };
  },
});
