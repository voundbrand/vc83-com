/**
 * TRIAL EXPIRATION CRON
 *
 * Runs daily to:
 * 1. Find trials expiring within 48 hours → send reminder
 * 2. Log warnings for any missed expirations
 */

import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Find all organizations with trials expiring within 48 hours.
 */
export const getTrialsExpiringSoon = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const in48Hours = now + 48 * 60 * 60 * 1000;

    // Get all trial licenses
    const trialLicenses = await ctx.db
      .query("objects")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "organization_license"),
          q.eq(q.field("status"), "trial")
        )
      )
      .collect();

    // Filter to those expiring within 48 hours
    const expiringSoon = trialLicenses.filter((license) => {
      const trialEnd = (license.customProperties as Record<string, unknown>)?.trialEnd as number;
      return trialEnd && trialEnd > now && trialEnd <= in48Hours;
    });

    // Check which ones haven't been reminded yet
    const results = [];
    for (const license of expiringSoon) {
      const reminderSent = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", license.organizationId).eq("type", "trial_reminder_sent")
        )
        .first();

      if (!reminderSent) {
        results.push({
          organizationId: license.organizationId,
          trialEnd: (license.customProperties as Record<string, unknown>)?.trialEnd as number,
        });
      }
    }

    return results;
  },
});

/**
 * Process trial expiration reminders.
 * Called by cron daily at 7 AM UTC.
 */
export const processTrialReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const expiring = await ctx.runQuery(
      internal.stripe.trialCron.getTrialsExpiringSoon
    );

    console.log(`[Trial Cron] Found ${expiring.length} trial(s) expiring within 48 hours`);

    for (const trial of expiring) {
      try {
        // Send reminder email
        await ctx.runAction(internal.stripe.trialEmails.sendTrialReminderEmail, {
          organizationId: trial.organizationId,
          trialEnd: trial.trialEnd,
        });

        // Record that reminder was sent (prevents duplicate sends)
        await ctx.runMutation(
          internal.stripe.trialHelpers.recordTrialReminderSent,
          { organizationId: trial.organizationId }
        );

        console.log(`[Trial Cron] Sent reminder for org ${trial.organizationId}`);
      } catch (e) {
        console.error(`[Trial Cron] Failed to send reminder for org ${trial.organizationId}:`, e);
      }
    }
  },
});
