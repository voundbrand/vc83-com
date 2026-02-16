/**
 * CREDIT THRESHOLD NOTIFICATIONS
 *
 * Alerts org owners via Pushover when credits run low or are exhausted.
 * Implements cooldown logic to prevent notification spam.
 */

import { internalAction, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";

const generatedApi: any = require("../_generated/api");

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
    const last = await (ctx as any).runQuery(generatedApi.internal.credits.notifications.getLastNotification, {
      organizationId: args.organizationId,
      reason: "exhausted",
    });

    if (last) {
      const notifiedAt = (last.customProperties as Record<string, unknown>)?.notifiedAt as number;
      if (notifiedAt && Date.now() - notifiedAt < ONE_HOUR_MS) return;
    }

    const settings = await (ctx as any).runQuery(generatedApi.internal.integrations.pushover.getOrgPushoverSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      console.warn("[CreditNotifications] Pushover not configured for org", args.organizationId);
      return;
    }

    await (ctx as any).runAction(generatedApi.internal.integrations.pushover.sendPushoverNotification, {
      organizationId: args.organizationId,
      title: "Agent Credits Exhausted",
      message: "Your AI agent ran out of credits and could not respond to a customer. Top up credits in your dashboard.",
      priority: 1,
    });

    await (ctx as any).runMutation(generatedApi.internal.credits.notifications.recordNotification, {
      organizationId: args.organizationId,
      reason: "exhausted",
    });
  },
});

// --- Internal Action: notify when child org approaches credit cap ---

export const notifyChildCreditCapApproaching = internalAction({
  args: {
    parentOrgId: v.id("organizations"),
    childOrgId: v.id("organizations"),
    usage: v.number(),
    cap: v.number(),
  },
  handler: async (ctx, args) => {
    const reason = `child_cap_${args.childOrgId}`;

    const last = await (ctx as any).runQuery(generatedApi.internal.credits.notifications.getLastNotification, {
      organizationId: args.parentOrgId,
      reason,
    });

    if (last) {
      const notifiedAt = (last.customProperties as Record<string, unknown>)?.notifiedAt as number;
      if (notifiedAt && Date.now() - notifiedAt < ONE_HOUR_MS) return;
    }

    const settings = await (ctx as any).runQuery(generatedApi.internal.integrations.pushover.getOrgPushoverSettings, {
      organizationId: args.parentOrgId,
    });

    if (!settings || !settings.enabled) return;

    const pct = Math.round((args.usage / args.cap) * 100);
    await (ctx as any).runAction(generatedApi.internal.integrations.pushover.sendPushoverNotification, {
      organizationId: args.parentOrgId,
      title: "Sub-Org Credit Cap Approaching",
      message: `A sub-org is at ${pct}% of its daily credit sharing limit (${args.usage}/${args.cap} credits).`,
      priority: 0,
    });

    await (ctx as any).runMutation(generatedApi.internal.credits.notifications.recordNotification, {
      organizationId: args.parentOrgId,
      reason,
    });
  },
});

// --- Internal Action: notify when shared pool approaches cap ---

export const notifySharedPoolApproaching = internalAction({
  args: {
    parentOrgId: v.id("organizations"),
    totalShared: v.number(),
    cap: v.number(),
  },
  handler: async (ctx, args) => {
    const reason = "shared_pool_approaching";

    const last = await (ctx as any).runQuery(generatedApi.internal.credits.notifications.getLastNotification, {
      organizationId: args.parentOrgId,
      reason,
    });

    if (last) {
      const notifiedAt = (last.customProperties as Record<string, unknown>)?.notifiedAt as number;
      if (notifiedAt && Date.now() - notifiedAt < ONE_HOUR_MS) return;
    }

    const settings = await (ctx as any).runQuery(generatedApi.internal.integrations.pushover.getOrgPushoverSettings, {
      organizationId: args.parentOrgId,
    });

    if (!settings || !settings.enabled) return;

    const pct = Math.round((args.totalShared / args.cap) * 100);
    await (ctx as any).runAction(generatedApi.internal.integrations.pushover.sendPushoverNotification, {
      organizationId: args.parentOrgId,
      title: "Shared Credit Pool Warning",
      message: `Shared credit pool is at ${pct}% across all sub-orgs (${args.totalShared}/${args.cap} credits/day).`,
      priority: 0,
    });

    await (ctx as any).runMutation(generatedApi.internal.credits.notifications.recordNotification, {
      organizationId: args.parentOrgId,
      reason,
    });
  },
});

// --- Internal Action: notify when all LLM models fail ---

export const notifyAllModelsFailed = internalAction({
  args: {
    organizationId: v.id("organizations"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reason = "all_models_failed";
    const cooldown = 30 * 60 * 1000; // 30 minutes

    const last = await (ctx as any).runQuery(generatedApi.internal.credits.notifications.getLastNotification, {
      organizationId: args.organizationId,
      reason,
    });

    if (last) {
      const notifiedAt = (last.customProperties as Record<string, unknown>)?.notifiedAt as number;
      if (notifiedAt && Date.now() - notifiedAt < cooldown) return;
    }

    const settings = await (ctx as any).runQuery(generatedApi.internal.integrations.pushover.getOrgPushoverSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) return;

    await (ctx as any).runAction(generatedApi.internal.integrations.pushover.sendPushoverNotification, {
      organizationId: args.organizationId,
      title: "Agent AI Models Unavailable",
      message: `All AI models failed for your agent. Customers received a fallback message. ${args.error ? `Error: ${args.error.slice(0, 120)}` : ""}`,
      priority: 1,
    });

    await (ctx as any).runMutation(generatedApi.internal.credits.notifications.recordNotification, {
      organizationId: args.organizationId,
      reason,
    });
  },
});

// --- Internal Action: notify when a tool is disabled after repeated failures ---

export const notifyToolDisabled = internalAction({
  args: {
    organizationId: v.id("organizations"),
    toolName: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reason = `tool_disabled_${args.toolName}`;
    const cooldown = TWENTY_FOUR_HOURS_MS; // 24 hours

    const last = await (ctx as any).runQuery(generatedApi.internal.credits.notifications.getLastNotification, {
      organizationId: args.organizationId,
      reason,
    });

    if (last) {
      const notifiedAt = (last.customProperties as Record<string, unknown>)?.notifiedAt as number;
      if (notifiedAt && Date.now() - notifiedAt < cooldown) return;
    }

    const settings = await (ctx as any).runQuery(generatedApi.internal.integrations.pushover.getOrgPushoverSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) return;

    await (ctx as any).runAction(generatedApi.internal.integrations.pushover.sendPushoverNotification, {
      organizationId: args.organizationId,
      title: "Agent Tool Disabled",
      message: `Tool "${args.toolName}" was disabled after 3 failures in a session. ${args.error ? `Last error: ${args.error.slice(0, 100)}` : ""}`,
      priority: 0,
    });

    await (ctx as any).runMutation(generatedApi.internal.credits.notifications.recordNotification, {
      organizationId: args.organizationId,
      reason,
    });
  },
});

// --- Internal Action: notify when a dead letter is abandoned ---

export const notifyDeadLetterAbandoned = internalAction({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
    recipient: v.string(),
    attempts: v.number(),
  },
  handler: async (ctx, args) => {
    const reason = "dead_letter_abandoned";
    const cooldown = ONE_HOUR_MS;

    const last = await (ctx as any).runQuery(generatedApi.internal.credits.notifications.getLastNotification, {
      organizationId: args.organizationId,
      reason,
    });

    if (last) {
      const notifiedAt = (last.customProperties as Record<string, unknown>)?.notifiedAt as number;
      if (notifiedAt && Date.now() - notifiedAt < cooldown) return;
    }

    const settings = await (ctx as any).runQuery(generatedApi.internal.integrations.pushover.getOrgPushoverSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) return;

    await (ctx as any).runAction(generatedApi.internal.integrations.pushover.sendPushoverNotification, {
      organizationId: args.organizationId,
      title: "Message Delivery Failed",
      message: `A ${args.channel} message to ${args.recipient.slice(0, 10)}... was abandoned after ${args.attempts} delivery attempts. Check your channel configuration.`,
      priority: 0,
    });

    await (ctx as any).runMutation(generatedApi.internal.credits.notifications.recordNotification, {
      organizationId: args.organizationId,
      reason,
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

      const last = await (ctx as any).runQuery(generatedApi.internal.credits.notifications.getLastNotification, {
        organizationId: args.organizationId,
        reason: t.reason,
      });

      if (last) {
        const notifiedAt = (last.customProperties as Record<string, unknown>)?.notifiedAt as number;
        if (notifiedAt && Date.now() - notifiedAt < TWENTY_FOUR_HOURS_MS) continue;
      }

      const settings = await (ctx as any).runQuery(generatedApi.internal.integrations.pushover.getOrgPushoverSettings, {
        organizationId: args.organizationId,
      });

      if (!settings || !settings.enabled) {
        console.warn("[CreditNotifications] Pushover not configured for org", args.organizationId);
        return;
      }

      await (ctx as any).runAction(generatedApi.internal.integrations.pushover.sendPushoverNotification, {
        organizationId: args.organizationId,
        title: "Credit Balance Warning",
        message: t.message,
        priority: t.priority,
      });

      await (ctx as any).runMutation(generatedApi.internal.credits.notifications.recordNotification, {
        organizationId: args.organizationId,
        reason: t.reason,
      });
    }
  },
});
