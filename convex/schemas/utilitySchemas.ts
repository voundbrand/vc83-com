import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Utility schemas - Supporting tables for platform functionality
 * Audit logs only
 */

export const auditLogs = defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),

  // What happened
  action: v.string(),
  resource: v.string(),
  resourceId: v.optional(v.string()),

  // Details
  metadata: v.optional(v.any()),
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),

  // Result
  success: v.boolean(),
  errorMessage: v.optional(v.string()),

  // Timestamp
  createdAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_user", ["userId"])
  .index("by_org_and_action", ["organizationId", "action"])
  .index("by_org_and_resource", ["organizationId", "resource"])
  .index("by_timestamp", ["createdAt"]);
