/**
 * OBJECTS INTERNAL QUERIES
 *
 * Internal queries for accessing generic objects from actions.
 */

import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * GET OBJECT (INTERNAL)
 *
 * Get any object by ID without auth check.
 * Use sparingly - prefer type-specific queries when possible.
 */
export const getObjectInternal = internalQuery({
  args: {
    objectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.objectId);
  },
});
