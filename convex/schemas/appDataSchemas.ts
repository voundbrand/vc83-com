import { defineTable } from "convex/server";
import { v } from "convex/values";
import { appSchemaBase } from "./appSchemaBase";

/**
 * Individual App Data Schemas
 * Each app gets its own self-contained table following the appSchemaBase pattern
 * 
 * NAMING CONVENTION: Use the app's code as the table name (e.g., "L4YERCAK3pod")
 * REQUIRED FIELDS: All apps must include appSchemaBase fields
 * APP-SPECIFIC FIELDS: Add custom fields after the base fields
 */

/**
 * Podcasting App (Episodes Table)
 * Code: "app_podcasting"
 * Type: installer-owned (Each org creates their own podcast episodes)
 * 
 * NOTE: Generic reusable podcast app for any organization.
 * Any org can install and create their own podcast episodes.
 */
export const app_podcasting = defineTable({
  // ✅ REQUIRED: Base fields for all apps (includes organizationId for scoping)
  ...appSchemaBase,
  
  // 📻 PODCAST-SPECIFIC: Episode data
  title: v.string(),
  slug: v.string(),
  description: v.string(),
  audioUrl: v.string(),
  embedUrl: v.optional(v.string()),
  episodeNumber: v.number(),
  season: v.optional(v.number()),
  duration: v.optional(v.number()),
  publishDate: v.string(),
  
  // 📻 PODCAST-SPECIFIC: Rich content
  featuredImage: v.optional(v.string()),
  showNotes: v.optional(v.string()),
  guests: v.optional(v.array(v.string())),
  tags: v.optional(v.array(v.string())),
})
  // PRIMARY scoping index - filter by organization
  .index("by_org", ["organizationId"])
  // SECONDARY scoping - filter by snapshot load (optional)
  .index("by_load", ["snapshotLoadId"])
  // Status filtering
  .index("by_status", ["status"])
  // Combined org + status
  .index("by_org_and_status", ["organizationId", "status"])
  // URL lookups
  .index("by_slug", ["slug"])
  // Episode number sorting
  .index("by_episode_number", ["episodeNumber"])
  // Search functionality
  .searchIndex("search_episodes", {
    searchField: "title",
    filterFields: ["organizationId", "status"],
  });

/**
 * TEMPLATE: Copy this for new apps
 * 
 * export const app_yourappname = defineTable({
 *   // ✅ REQUIRED: Base fields
 *   ...appSchemaBase,
 *   
 *   // 🎯 YOUR APP: Custom fields
 *   yourCustomField: v.string(),
 *   // ... more fields
 * })
 *   .index("by_creator", ["creatorOrgId"])
 *   .index("by_status", ["status"]);
 * 
 * NAMING CONVENTION: Always prefix with "app_"
 * - Table name: app_yourappname
 * - File name: convex/app_yourappname.ts
 * - App code: "app_yourappname"
 */
