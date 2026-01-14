/**
 * MIGRATION: Add organizationId to existing sessions
 *
 * This migration updates all existing session records to include organizationId.
 * The organizationId is taken from the user's defaultOrgId.
 *
 * Run with: npx convex run migrations/addOrganizationIdToSessions:migrateExistingSessions
 */

import { internalMutation } from "../_generated/server";

export const migrateExistingSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting migration: Add organizationId to sessions");

    // Get all sessions
    const sessions = await ctx.db.query("sessions").collect();
    console.log(`📊 Found ${sessions.length} sessions to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const session of sessions) {
      try {
        // Check if already has organizationId (in case migration runs twice)
        if ((session as any).organizationId) {
          console.log(`⏭️  Session ${session._id} already has organizationId, skipping`);
          skippedCount++;
          continue;
        }

        // Get user to find their defaultOrgId
        const user = await ctx.db.get(session.userId);

        if (!user) {
          const error = `❌ User ${session.userId} not found for session ${session._id}`;
          console.error(error);
          errors.push(error);
          errorCount++;
          continue;
        }

        if (!user.defaultOrgId) {
          const error = `❌ User ${session.userId} has no defaultOrgId for session ${session._id}`;
          console.error(error);
          errors.push(error);
          errorCount++;
          continue;
        }

        // Update session with organizationId
        await ctx.db.patch(session._id, {
          organizationId: user.defaultOrgId,
        } as any);

        console.log(`✅ Migrated session ${session._id} → organizationId: ${user.defaultOrgId}`);
        migratedCount++;
      } catch (error) {
        const errorMsg = `❌ Error migrating session ${session._id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        errorCount++;
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`✅ Migrated: ${migratedCount}`);
    console.log(`⏭️  Skipped (already migrated): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      errors.forEach(err => console.log(err));
    }

    return {
      success: errorCount === 0,
      totalSessions: sessions.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
      errorMessages: errors,
    };
  },
});
