/**
 * EMAIL QUEUE SCHEMA
 *
 * Stores emails for delivery via external services
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const emailQueue = defineTable({
  // Optional org/workflow context
  organizationId: v.optional(v.id("organizations")),
  dossierObjectId: v.optional(v.id("objects")),
  operatorConfirmedByUserId: v.optional(v.id("users")),
  operatorConfirmedAt: v.optional(v.number()),

  // Recipient
  to: v.string(),

  // Email content
  subject: v.string(),
  htmlBody: v.string(),
  textBody: v.string(),

  // Email type
  type: v.union(
    v.literal("welcome"),
    v.literal("sales_notification"),
    v.literal("transactional"),
    v.literal("marketing"),
    v.literal("compliance_avv_outreach")
  ),

  // Delivery status
  status: v.union(
    v.literal("pending"),
    v.literal("sent"),
    v.literal("failed")
  ),

  // Delivery tracking
  sentAt: v.optional(v.number()),
  externalId: v.optional(v.string()), // ID from email service (Resend, SendGrid, etc.)

  // Error handling
  lastError: v.optional(v.string()),
  retryCount: v.optional(v.number()),
  maxRetries: v.optional(v.number()),
  nextRetryAt: v.optional(v.number()),
  workflowMetadata: v.optional(v.record(v.string(), v.any())),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_status", ["status"])
  .index("by_status_type", ["status", "type"])
  .index("by_status_next_retry", ["status", "nextRetryAt"])
  .index("by_type", ["type"])
  .index("by_created_at", ["createdAt"]);
