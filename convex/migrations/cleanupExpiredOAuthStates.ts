/**
 * MIGRATION: Delete all expired OAuth states
 *
 * OAuth states are temporary (10 minute expiry) and should be cleaned up.
 * This migration removes all expired state tokens from the database.
 *
 * Run with: npx convex run migrations/cleanupExpiredOAuthStates:cleanup --prod
 */

import { internalMutation } from "../_generated/server";

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting migration: Delete expired OAuth states");

    const now = Date.now();

    // Get all OAuth states
    const allStates = await ctx.db.query("oauthStates").collect();
    console.log(`📊 Found ${allStates.length} OAuth states total`);

    // Filter expired states
    const expiredStates = allStates.filter(state => state.expiresAt < now);
    console.log(`⏰ Found ${expiredStates.length} expired states to delete`);

    let deletedCount = 0;

    for (const state of expiredStates) {
      const ageInDays = Math.floor((now - state.expiresAt) / (1000 * 60 * 60 * 24));
      console.log(`  🗑️  Deleting state ${state.state.substring(0, 8)}... (expired ${ageInDays} days ago)`);
      await ctx.db.delete(state._id);
      deletedCount++;
    }

    console.log(`✅ Deleted ${deletedCount} expired OAuth states`);
    console.log(`📊 Remaining active states: ${allStates.length - deletedCount}`);

    return {
      success: true,
      totalStates: allStates.length,
      expiredCount: expiredStates.length,
      deletedCount,
      remainingCount: allStates.length - deletedCount,
    };
  },
});
