import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Utility schemas - Supporting tables for platform functionality
 * Audit logs only
 */

export const auditLogs = defineTable({
  organizationId: v.optional(v.id("organizations")), // Optional for user-level actions (passkeys, password changes, etc.)
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

export const workflowExecutionLogs = defineTable({
  workflowId: v.id("objects"),
  workflowName: v.string(),
  status: v.union(v.literal("running"), v.literal("success"), v.literal("failed")),
  logs: v.array(
    v.object({
      timestamp: v.number(),
      level: v.union(v.literal("info"), v.literal("success"), v.literal("error"), v.literal("warning")),
      message: v.string(),
      data: v.optional(v.any()),
    })
  ),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  result: v.optional(v.any()),
})
  .index("by_workflow", ["workflowId"])
  .index("by_status", ["status"])
  .index("by_started", ["startedAt"]);
