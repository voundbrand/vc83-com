/**
 * FILE UTILITIES
 *
 * Helper queries for working with Convex file storage.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * GET FILE URL
 *
 * Returns a public URL for a file stored in Convex storage.
 * Used for displaying images, documents, etc.
 */
export const getFileUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Get the URL from Convex storage
    const url = await ctx.storage.getUrl(args.storageId);
    return url;
  },
});
