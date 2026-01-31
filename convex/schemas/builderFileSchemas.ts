/**
 * BUILDER FILE SCHEMAS
 *
 * Virtual File System for builder apps.
 * Replaces the flat generatedFiles[] array in customProperties
 * with individual file records for reactivity and granular access.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const builderFiles = defineTable({
  appId: v.id("objects"),
  path: v.string(),
  content: v.string(),
  language: v.string(),
  contentHash: v.string(),
  lastModifiedAt: v.number(),
  lastModifiedBy: v.union(
    v.literal("v0"),
    v.literal("user"),
    v.literal("self-heal"),
    v.literal("scaffold")
  ),
  isScaffold: v.boolean(),
})
  .index("by_app", ["appId"])
  .index("by_app_path", ["appId", "path"]);
