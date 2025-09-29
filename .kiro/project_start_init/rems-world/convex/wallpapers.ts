import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all wallpapers
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    try {
      const wallpapers = await ctx.db.query("wallpapers").order("asc").collect();
      return wallpapers;
    } catch (error) {
      // Handle query errors gracefully in production
      console.error("Error getting wallpapers:", error);
      return [];
    }
  },
});

// Get wallpapers by category
export const getByCategory = query({
  args: {
    category: v.union(
      v.literal("abstract"),
      v.literal("nature"),
      v.literal("geometric"),
      v.literal("retro"),
      v.literal("solid"),
    ),
  },
  handler: async (ctx, args) => {
    const wallpapers = await ctx.db
      .query("wallpapers")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .order("asc")
      .collect();
    return wallpapers;
  },
});

// Get wallpaper URL from storage
export const getWallpaperUrl = query({
  args: {
    wallpaperId: v.optional(v.id("wallpapers")),
    storageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      if (args.storageId) {
        // Direct storage ID provided (for default wallpaper)
        return await ctx.storage.getUrl(args.storageId);
      } else if (args.wallpaperId) {
        // Get wallpaper from database
        const wallpaper = await ctx.db.get(args.wallpaperId);
        if (!wallpaper) return null;
        return await ctx.storage.getUrl(wallpaper.storageId);
      }
      return null;
    } catch (error) {
      // Handle storage errors gracefully in production
      console.error("Error getting wallpaper URL:", error);
      return null;
    }
  },
});

// Get thumbnail URL from storage
export const getThumbnailUrl = query({
  args: { wallpaperId: v.id("wallpapers") },
  handler: async (ctx, args) => {
    const wallpaper = await ctx.db.get(args.wallpaperId);
    if (!wallpaper || !wallpaper.thumbnailStorageId) return null;
    return await ctx.storage.getUrl(wallpaper.thumbnailStorageId);
  },
});

// Seed wallpapers (for initial setup)
export const seedWallpapers = mutation({
  args: {
    wallpapers: v.array(
      v.object({
        name: v.string(),
        category: v.union(
          v.literal("abstract"),
          v.literal("nature"),
          v.literal("geometric"),
          v.literal("retro"),
          v.literal("solid"),
        ),
        storageId: v.string(),
        thumbnailStorageId: v.optional(v.string()),
        dominantColor: v.optional(v.string()),
        order: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const wallpaper of args.wallpapers) {
      await ctx.db.insert("wallpapers", {
        ...wallpaper,
        createdAt: Date.now(),
      });
    }
  },
});

// Update selected wallpaper for user
export const selectWallpaper = mutation({
  args: { wallpaperId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (userProfile) {
      // Update existing profile
      await ctx.db.patch(userProfile._id, {
        desktopWallpaper: args.wallpaperId,
        updatedAt: Date.now(),
      });
    } else {
      // Create new profile with wallpaper
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        desktopWallpaper: args.wallpaperId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});
