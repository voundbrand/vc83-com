import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

// Save desktop state (including all windows)
export const saveDesktopState = mutation({
  args: {
    windows: v.array(
      v.object({
        id: v.string(),
        appId: v.string(),
        position: v.object({
          x: v.number(),
          y: v.number(),
        }),
        size: v.object({
          width: v.number(),
          height: v.number(),
        }),
        minimized: v.boolean(),
        maximized: v.boolean(),
        zIndex: v.number(),
      }),
    ),
    desktopIcons: v.optional(
      v.array(
        v.object({
          id: v.string(),
          appId: v.string(),
          position: v.object({
            x: v.number(),
            y: v.number(),
          }),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Find existing desktop state
    const existing = await ctx.db
      .query("desktopStates")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      // Update existing state
      await ctx.db.patch(existing._id, {
        windows: args.windows,
        desktopIcons: args.desktopIcons || existing.desktopIcons || [],
        lastActive: Date.now(),
      });
    } else {
      // Create new state
      await ctx.db.insert("desktopStates", {
        userId,
        windows: args.windows,
        desktopIcons: args.desktopIcons || [],
        lastActive: Date.now(),
      });
    }
  },
});

// Get desktop state for a user
export const getDesktopState = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const desktopState = await ctx.db
      .query("desktopStates")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return desktopState || null;
  },
});

// Clear desktop state (reset to defaults)
export const clearDesktopState = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const desktopState = await ctx.db
      .query("desktopStates")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (desktopState) {
      await ctx.db.delete(desktopState._id);
    }
  },
});
