/**
 * MIGRATION: Delete all existing sessions before schema change
 *
 * Sessions are temporary (24 hour expiry) so it's safe to delete them all.
 * Users will simply need to log in again.
 *
 * Run with: npx convex run migrations/deleteOldSessions:deleteAllSessions
 */

import { internalMutation } from "../_generated/server";

export const deleteAllSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting migration: Delete all existing sessions");

    // Get all sessions
    const sessions = await ctx.db.query("sessions").collect();
    console.log(`📊 Found ${sessions.length} sessions to delete`);

    let deletedCount = 0;

    for (const session of sessions) {
      await ctx.db.delete(session._id);
      deletedCount++;
    }

    console.log(`✅ Deleted ${deletedCount} sessions`);
    console.log("ℹ️  Users will need to log in again (sessions are temporary anyway)");

    return {
      success: true,
      deletedCount,
      message: "All sessions deleted successfully. Users will need to log in again.",
    };
  },
});
