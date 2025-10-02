import { v } from "convex/values";

/**
 * Base schema fields that ALL app data tables must include.
 * Ensures consistency and proper scoping across all apps.
 */
export const appSchemaBase = {
  // 🔑 CRITICAL: Multi-tenant scoping
  // Every app data row MUST be scoped to an organization
  organizationId: v.id("organizations"),
  
  // 🔗 OPTIONAL: Link to snapshot load (for apps using templates)
  // If the app uses snapshots, this links data to the specific loaded instance
  snapshotLoadId: v.optional(v.id("snapshotLoads")),
  
  // 📝 Publishing workflow
  status: v.union(
    v.literal("draft"),
    v.literal("published"),
    v.literal("archived")
  ),
  
  // 👤 Audit trail - WHO and WHEN
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedBy: v.id("users"),
  updatedAt: v.number(),
  
  // 📊 Analytics
  viewCount: v.number(),
};

/**
 * Common indexes that ALL app data tables should have
 * These enable efficient scoped queries
 */
export const commonAppIndexes = {
  // PRIMARY scoping index - filter by organization
  byOrg: ["organizationId"] as const,
  
  // SECONDARY scoping index - filter by snapshot load
  byLoad: ["snapshotLoadId"] as const,
  
  // Status filtering
  byStatus: ["status"] as const,
  
  // Combined org + status for efficient queries
  byOrgAndStatus: ["organizationId", "status"] as const,
};

/**
 * Type helper for app-specific fields
 * Usage: defineAppTable({ ...appSchemaBase, customField: v.string() })
 */
export type AppSchemaBase = typeof appSchemaBase;
