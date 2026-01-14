/**
 * Account Linking Internal Queries
 *
 * Internal queries used by the account linking HTTP endpoints.
 * These are separated to avoid TS2589 type depth issues with large schemas.
 */

import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Get user's default organization
 *
 * Returns the first organization the user is a member of.
 * Used when creating a session after account linking.
 */
export const getUserDefaultOrg = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Find the user's first organization membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!membership) {
      // User has no organization - this shouldn't happen for platform users
      // but handle gracefully
      return null;
    }

    return membership.organizationId;
  },
});
