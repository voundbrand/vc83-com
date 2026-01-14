/**
 * MESSAGE QUEUE SCHEMA
 *
 * Stores scheduled messages for the Sequences automation system.
 * Supports multi-channel delivery (email, SMS, WhatsApp).
 *
 * This is a dedicated table (not objects) because:
 * 1. High-volume: Could have thousands of scheduled messages
 * 2. Needs specific indexes for cron-based processing
 * 3. Frequent status updates during delivery
 *
 * Lifecycle:
 * 1. Enrollment created → stepExecutor schedules messages
 * 2. Cron job picks up due messages (scheduledFor <= now)
 * 3. messageSender delivers via appropriate channel
 * 4. Status updated to sent/failed
 * 5. Failed messages retry up to 3 times with exponential backoff
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sequenceMessageQueue = defineTable({
  // Multi-tenancy
  organizationId: v.id("organizations"),

  // Channel
  channel: v.union(
    v.literal("email"),
    v.literal("sms"),
    v.literal("whatsapp")
  ),

  // Recipient (CRM contact reference + direct contact info for delivery)
  recipientId: v.optional(v.id("objects")), // crm_contact reference
  recipientEmail: v.optional(v.string()),
  recipientPhone: v.optional(v.string()),
  recipientName: v.optional(v.string()), // For personalization fallback

  // Content - Template Reference
  templateId: v.optional(v.id("objects")), // message_template reference

  // Content - Rendered (filled in at schedule time)
  subject: v.optional(v.string()), // Email only
  body: v.string(), // Plain text content (rendered with variables)
  bodyHtml: v.optional(v.string()), // Email HTML version

  // WhatsApp-specific (Meta-approved templates)
  whatsappTemplateName: v.optional(v.string()),
  whatsappTemplateParams: v.optional(v.array(v.string())),

  // Scheduling
  scheduledFor: v.number(), // Unix timestamp (ms) - when to send

  // Sequence Context
  sequenceId: v.optional(v.id("objects")), // automation_sequence reference
  sequenceStepIndex: v.optional(v.number()), // Which step (0-indexed)
  enrollmentId: v.optional(v.id("objects")), // sequence_enrollment reference

  // Source Context (what triggered this message)
  bookingId: v.optional(v.id("objects")), // If triggered by booking
  pipelineContactId: v.optional(v.id("objects")), // If triggered by pipeline

  // Delivery Status
  status: v.union(
    v.literal("scheduled"), // Waiting to be sent
    v.literal("sending"), // Currently being processed (prevents duplicate sends)
    v.literal("sent"), // Successfully delivered
    v.literal("failed"), // Delivery failed (after max retries)
    v.literal("cancelled") // Cancelled (enrollment exited, booking cancelled, etc.)
  ),

  // Delivery Tracking
  sentAt: v.optional(v.number()), // When actually sent
  externalId: v.optional(v.string()), // Provider message ID (for tracking)

  // Error Handling
  lastError: v.optional(v.string()),
  retryCount: v.number(), // Number of retry attempts (max 3)

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  // Primary index for cron processing: find due messages
  .index("by_status_scheduled", ["status", "scheduledFor"])

  // Organization-scoped queries
  .index("by_org_status", ["organizationId", "status"])

  // Find all messages for a booking (to cancel on booking cancellation)
  .index("by_booking", ["bookingId"])

  // Find all messages for a recipient (message history)
  .index("by_recipient", ["recipientId"])

  // Find all messages for a sequence (analytics)
  .index("by_sequence", ["sequenceId"])

  // Find all messages for an enrollment (progress tracking)
  .index("by_enrollment", ["enrollmentId"]);
