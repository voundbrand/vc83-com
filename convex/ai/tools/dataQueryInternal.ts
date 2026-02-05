/**
 * DATA QUERY INTERNAL
 *
 * Internal queries for the data query tool.
 * Separated to keep the tool file focused on definition + execution logic.
 *
 * SECURITY: All queries scoped by organizationId via index.
 */

import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Query objects by org + type
 * Returns all matching objects (filtering happens in the action layer)
 */
export const queryObjects = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    objectType: v.string(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", args.objectType)
      )
      .collect();

    return results;
  },
});
