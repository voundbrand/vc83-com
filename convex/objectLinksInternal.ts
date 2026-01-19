/**
 * OBJECT LINKS INTERNAL QUERIES
 *
 * Internal queries for accessing object links from actions.
 * Used by transactionHelpers to fetch event sponsors, etc.
 */

import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * GET LINKS FROM OBJECT (INTERNAL)
 *
 * Get all outgoing links from a source object.
 * Example: event --[sponsored_by]--> crm_organization
 */
export const getLinksFromObject = internalQuery({
  args: {
    fromObjectId: v.id("objects"),
    linkType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.fromObjectId));

    if (args.linkType) {
      query = query.filter((q) => q.eq(q.field("linkType"), args.linkType));
    }

    return await query.collect();
  },
});

/**
 * GET LINKS TO OBJECT (INTERNAL)
 *
 * Get all incoming links to a target object.
 * Example: event --[offers]--> product (query from product's perspective)
 */
export const getLinksToObject = internalQuery({
  args: {
    toObjectId: v.id("objects"),
    linkType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.toObjectId));

    if (args.linkType) {
      query = query.filter((q) => q.eq(q.field("linkType"), args.linkType));
    }

    return await query.collect();
  },
});
