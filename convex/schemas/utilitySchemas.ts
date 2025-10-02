import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Utility schemas - Supporting tables for platform functionality
 * Audit logs, invitations, email verifications, etc.
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

export const invitations = defineTable({
  organizationId: v.id("organizations"),
  email: v.string(),
  
  // Invitation details
  role: v.union(
    v.literal("admin"),
    v.literal("member"),
    v.literal("viewer")
  ),
  
  // Status
  status: v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("declined"),
    v.literal("expired")
  ),
  
  // Token for invitation link
  token: v.string(),
  expiresAt: v.number(),
  
  // Metadata
  invitedBy: v.id("users"),
  invitedAt: v.number(),
  acceptedAt: v.optional(v.number()),
})
  .index("by_organization", ["organizationId"])
  .index("by_email", ["email"])
  .index("by_token", ["token"])
  .index("by_status", ["status"]);

export const emailVerifications = defineTable({
  userId: v.id("users"),
  email: v.string(),
  token: v.string(),
  expiresAt: v.number(),
  createdAt: v.number(),
  verified: v.boolean(),
  verifiedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_token", ["token"])
  .index("by_email", ["email"]);

export const resetTokens = defineTable({
  userId: v.id("users"),
  email: v.string(),
  token: v.string(),
  expiresAt: v.number(),
  createdAt: v.number(),
  used: v.boolean(),
  usedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_token", ["token"])
  .index("by_email", ["email"]);

export const rateLimits = defineTable({
  key: v.string(),
  count: v.number(),
  windowStart: v.number(),
  expiresAt: v.number(),
})
  .index("by_key", ["key"])
  .index("by_expiry", ["expiresAt"]);
