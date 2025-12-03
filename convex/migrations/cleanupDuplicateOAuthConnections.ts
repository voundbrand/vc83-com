/**
 * Migration: Cleanup Duplicate OAuth Connections
 *
 * This migration removes duplicate OAuth connection records that were created
 * before the fix in storeConnection function.
 *
 * For each user+organization+provider combination:
 * - Keeps the NEWEST (most recent) connection record
 * - Deletes all older duplicate records
 *
 * Run once after deploying the fix:
 * npx convex run migrations/cleanupDuplicateOAuthConnections:cleanup --prod
 */

import { internalMutation } from "../_generated/server";

export const cleanup = internalMutation({
  handler: async (ctx) => {
    console.log("🧹 Starting OAuth connections cleanup...");

    // Get all non-revoked OAuth connections
    const allConnections = await ctx.db
      .query("oauthConnections")
      .filter((q) => q.neq(q.field("status"), "revoked"))
      .collect();

    console.log(`Found ${allConnections.length} total OAuth connections`);

    // Group by user+org+provider
    const groups = new Map<string, typeof allConnections>();

    for (const conn of allConnections) {
      const key = `${conn.userId || "null"}_${conn.organizationId}_${conn.provider}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(conn);
    }

    console.log(`Found ${groups.size} unique user+org+provider combinations`);

    let deletedCount = 0;
    let keptCount = 0;

    // For each group, keep the newest and delete the rest
    for (const [key, connections] of groups.entries()) {
      if (connections.length === 1) {
        keptCount++;
        continue;
      }

      // Sort by updatedAt (newest first)
      connections.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      const [newest, ...duplicates] = connections;

      console.log(`\n📦 Group: ${key}`);
      console.log(`  Keeping: ${newest._id} (${newest.providerEmail}, status: ${newest.status}, updated: ${new Date(newest.updatedAt || 0).toISOString()})`);

      // Delete all duplicates
      for (const dup of duplicates) {
        console.log(`  Deleting: ${dup._id} (${dup.providerEmail}, status: ${dup.status}, updated: ${new Date(dup.updatedAt || 0).toISOString()})`);
        await ctx.db.delete(dup._id);
        deletedCount++;
      }

      keptCount++;
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`  Kept: ${keptCount} connections`);
    console.log(`  Deleted: ${deletedCount} duplicate connections`);

    return {
      success: true,
      kept: keptCount,
      deleted: deletedCount,
      totalBefore: allConnections.length,
      totalAfter: keptCount,
    };
  },
});
