import { internalMutation } from "../_generated/server";
const generatedApi: any = require("../_generated/api");

/**
 * Beta Access Migration Scripts
 *
 * These migrations set up the beta access system:
 * 1. Backfill existing users with approved status
 * 2. Initialize platform setting for beta gating (default: OFF)
 */

/**
 * Backfill all existing users with approved beta access status
 * Run this once after schema deployment to grandfather existing users
 *
 * Usage: npx convex run migrations/betaAccessMigration:backfillExistingUsers
 */
export const backfillExistingUsers = internalMutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let approvedCount = 0;
    let alreadySet = 0;

    for (const user of users) {
      // Only update users without beta status
      if (!user.betaAccessStatus) {
        await ctx.db.patch(user._id, {
          betaAccessStatus: "approved",
          betaAccessApprovedAt: user.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
        approvedCount++;
      } else {
        alreadySet++;
      }
    }

    return {
      total: users.length,
      approved: approvedCount,
      alreadySet,
      message: `Migration complete: Approved ${approvedCount} existing users, ${alreadySet} already had status set`
    };
  },
});

/**
 * Initialize the beta access gating setting (default: OFF)
 * Run this once after schema deployment
 *
 * Usage: npx convex run migrations/betaAccessMigration:initializeBetaSetting
 */
export const initializeBetaSetting = internalMutation({
  handler: async (ctx) => {
    // Check if setting already exists
    const existing = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", "betaAccessEnabled"))
      .first();

    if (existing) {
      return {
        initialized: false,
        currentValue: existing.value,
        message: "Beta access setting already exists, no changes made"
      };
    }

    // Create setting with gate OFF by default
    await ctx.db.insert("platformSettings", {
      key: "betaAccessEnabled",
      value: false,  // Start with gate OFF for smooth migration
      description: "Controls whether beta access gating is enabled platform-wide",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      initialized: true,
      message: "Beta access setting initialized (gate OFF by default)"
    };
  },
});

/**
 * Run both migrations in sequence
 * Convenience function to run full migration
 *
 * Usage: npx convex run migrations/betaAccessMigration:runFullMigration
 */
export const runFullMigration = internalMutation({
  handler: async (ctx): Promise<{
    backfill: { total: number; approved: number; alreadySet: number; message: string };
    setting: { initialized: boolean; currentValue?: any; message: string };
    message: string;
  }> => {
    console.log("Step 1/2: Backfilling existing users...");
    const backfillResult = await (ctx as any).runMutation(generatedApi.internal.migrations.betaAccessMigration.backfillExistingUsers, {});

    console.log("Step 2/2: Initializing beta gating setting...");
    const settingResult = await (ctx as any).runMutation(generatedApi.internal.migrations.betaAccessMigration.initializeBetaSetting, {});

    return {
      backfill: backfillResult,
      setting: settingResult,
      message: "Full migration complete. Beta gating is OFF by default - existing users approved."
    };
  },
});
