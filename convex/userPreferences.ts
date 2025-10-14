import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * User Preferences - Sync UI settings across devices
 *
 * Simple key-value storage for user UI preferences:
 * - Theme (win95-light, win95-dark, etc.)
 * - Window style (windows, mac)
 * - Future: language, fontSize, etc.
 */

/**
 * Get user preferences by sessionId
 * Returns default values if no preferences exist
 */
export const get = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    // Get user from session (sessionId is the Convex ID)
    const session = await ctx.db.get(sessionId as Id<"sessions">);

    if (!session) {
      return null;
    }

    // Get preferences (or return defaults)
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    // Return preferences or defaults
    return prefs || {
      themeId: "win95-light",
      windowStyle: "windows",
      language: "en",
    };
  },
});

/**
 * Update user preferences
 * Creates new preferences if they don't exist (upsert pattern)
 */
export const update = mutation({
  args: {
    sessionId: v.string(),
    themeId: v.optional(v.string()),
    windowStyle: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, themeId, windowStyle, language }) => {
    // Get user from session (sessionId is the Convex ID)
    const session = await ctx.db.get(sessionId as Id<"sessions">);

    if (!session) {
      throw new Error("Ungültige Sitzung");
    }

    // Find existing preferences
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        ...(themeId && { themeId }),
        ...(windowStyle && { windowStyle }),
        ...(language && { language }),
        updatedAt: now,
      });
    } else {
      // Create new
      await ctx.db.insert("userPreferences", {
        userId: session.userId,
        themeId: themeId || "win95-light",
        windowStyle: windowStyle || "windows",
        language: language || "en",
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
