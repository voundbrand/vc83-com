import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  userProfiles: defineTable({
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    desktopTheme: v.optional(v.string()),
    desktopWallpaper: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        soundEnabled: v.boolean(),
        animationSpeed: v.string(),
        defaultWindowSize: v.object({
          width: v.number(),
          height: v.number(),
        }),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  desktopStates: defineTable({
    userId: v.id("users"),
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
    desktopIcons: v.array(
      v.object({
        id: v.string(),
        appId: v.string(),
        position: v.object({
          x: v.number(),
          y: v.number(),
        }),
      }),
    ),
    lastActive: v.number(),
  }).index("by_userId", ["userId"]),

  applications: defineTable({
    id: v.string(),
    name: v.string(),
    icon: v.string(),
    type: v.union(v.literal("internal"), v.literal("external")),
    url: v.optional(v.string()),
    component: v.optional(v.string()),
    description: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    category: v.string(),
    order: v.number(),
    isSystem: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_category", ["category"]),

  wallpapers: defineTable({
    name: v.string(),
    category: v.union(
      v.literal("abstract"),
      v.literal("nature"),
      v.literal("geometric"),
      v.literal("retro"),
      v.literal("solid"),
    ),
    storageId: v.string(), // Using string for storage ID
    thumbnailStorageId: v.optional(v.string()),
    dominantColor: v.optional(v.string()),
    order: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_category", ["category"]),
});
