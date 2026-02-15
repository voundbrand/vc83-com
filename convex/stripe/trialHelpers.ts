/**
 * TRIAL HELPER QUERIES & MUTATIONS
 *
 * Non-Node.js functions for trial management.
 * Separated from trialCheckout.ts because Convex requires
 * queries/mutations to run in the default runtime, not Node.js.
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Check if an organization has previously used a trial.
 * Prevents trial abuse (one trial per org, ever).
 */
export const checkPreviousTrial = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check audit logs for previous trial activation
    const trialLog = await ctx.db
      .query("auditLogs")
      .withIndex("by_org_and_action", (q) =>
        q.eq("organizationId", args.organizationId).eq("action", "organization.trial_started")
      )
      .first();

    return !!trialLog;
  },
});

/**
 * Record trial start in the license object.
 * Adds trialStart/trialEnd timestamps for cron job to check.
 */
export const recordTrialStart = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    trialStart: v.number(),
    trialEnd: v.number(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_license")
      )
      .first();

    if (license) {
      await ctx.db.patch(license._id, {
        customProperties: {
          ...(license.customProperties as Record<string, unknown>),
          trialStart: args.trialStart,
          trialEnd: args.trialEnd,
          stripeSubscriptionId: args.stripeSubscriptionId,
        },
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Log a trial-related audit event.
 */
export const logTrialEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    action: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      action: args.action,
      resource: "organizations",
      resourceId: args.organizationId as unknown as string,
      metadata: args.metadata || {},
      success: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Record that a trial reminder was sent (cooldown tracking).
 */
export const recordTrialReminderSent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("objects", {
      type: "trial_reminder_sent",
      name: "Trial Reminder",
      organizationId: args.organizationId,
      status: "active",
      customProperties: { sentAt: Date.now() },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
