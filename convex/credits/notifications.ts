/**
 * CREDIT THRESHOLD NOTIFICATIONS
 *
 * Alerts org owners via Pushover when credits run low or are exhausted.
 * Implements cooldown logic to prevent notification spam.
 */

import { internalAction, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;

// --- Internal Query: get last notification for cooldown checks ---

export const getLastNotification = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "credit_notification_log")
      )
      .order("desc")
      .collect();

    return logs.find(
      (log) => (log.customProperties as Record<string, unknown>)?.reason === args.reason
    ) ?? null;
  },
});

// --- Internal Mutation: record a notification ---

export const recordNotification = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("objects", {
      type: "credit_notification_log",
      name: "Credit Notification",
      organizationId: args.organizationId,
      status: "active",
      customProperties: { reason: args.reason, notifiedAt: Date.now() },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// --- Internal Action: notify when credits are fully exhausted ---

export const notifyCreditExhausted = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const last = await ctx.runQuery(internal.credits.notifications.getLastNotification, {
      organizationId: args.organizationId,
      reason: "exhausted",
    });

    if (last) {
      const notifiedAt = (last.customProperties as Record<string, unknown>)?.notifiedAt as number;
      if (notifiedAt && Date.now() - notifiedAt < ONE_HOUR_MS) return;
    }

    const settings = await ctx.runQuery(internal.integrations.pushover.getOrgPushoverSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      console.warn("[CreditNotifications] Pushover not configured for org", args.organizationId);
      return;
    }

    await ctx.runAction(internal.integrations.pushover.sendPushoverNotification, {
      organizationId: args.organizationId,
      title: "Agent Credits Exhausted",
      message: "Your AI agent ran out of credits and could not respond to a customer. Top up credits in your dashboard.",
      priority: 1,
    });

    await ctx.runMutation(internal.credits.notifications.recordNotification, {
      organizationId: args.organizationId,
      reason: "exhausted",
    });
  },
});

// --- Internal Action: check percentage thresholds ---

export const checkThresholds = internalAction({
  args: {
    organizationId: v.id("organizations"),
    currentBalance: v.number(),
    monthlyTotal: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.monthlyTotal <= 0) return;
    const pct = (args.currentBalance / args.monthlyTotal) * 100;

    const thresholds: Array<{ pct: number; reason: string; message: string; priority: number }> = [
      { pct: 0, reason: "threshold_0", message: "Credits depleted \u2014 agent cannot respond", priority: 1 },
      { pct: 10, reason: "threshold_10", message: `Credits at 10% \u2014 ${args.currentBalance} remaining`, priority: 1 },
      { pct: 20, reason: "threshold_20", message: `Credits at 20% \u2014 ${args.currentBalance} remaining`, priority: 0 },
    ];

    for (const t of thresholds) {
      if (pct > t.pct) continue;

      const last = await ctx.runQuery(internal.credits.notifications.getLastNotification, {
        organizationId: args.organizationId,
        reason: t.reason,
      });

      if (last) {
        const notifiedAt = (last.customProperties as Record<string, unknown>)?.notifiedAt as number;
        if (notifiedAt && Date.now() - notifiedAt < TWENTY_FOUR_HOURS_MS) continue;
      }

      const settings = await ctx.runQuery(internal.integrations.pushover.getOrgPushoverSettings, {
        organizationId: args.organizationId,
      });

      if (!settings || !settings.enabled) {
        console.warn("[CreditNotifications] Pushover not configured for org", args.organizationId);
        return;
      }

      await ctx.runAction(internal.integrations.pushover.sendPushoverNotification, {
        organizationId: args.organizationId,
        title: "Credit Balance Warning",
        message: t.message,
        priority: t.priority,
      });

      await ctx.runMutation(internal.credits.notifications.recordNotification, {
        organizationId: args.organizationId,
        reason: t.reason,
      });
    }
  },
});
