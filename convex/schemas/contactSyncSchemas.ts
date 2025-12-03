import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * CONTACT SYNC & BULK EMAIL SCHEMAS
 *
 * Tables for AI-powered contact synchronization and bulk communication features.
 * See docs/AI_CONTACT_SYNC_TOOL.md for full implementation plan.
 */

/**
 * CONTACT SYNCS TABLE
 *
 * Audit trail for contact synchronization operations from external providers
 * (Microsoft/Google) to internal CRM (objects table).
 *
 * Workflow:
 * 1. User: "Sync my Microsoft contacts"
 * 2. Backend: Fetch contacts from Microsoft Graph API
 * 3. Backend: Create contactSync record (status: "preview")
 * 4. Frontend: Show three-pane UI with preview data
 * 5. User: Reviews and approves contacts
 * 6. Backend: Update status to "executing"
 * 7. Backend: Create/update objects (type="contact")
 * 8. Backend: Update status to "completed" with stats
 */
export const contactSyncs = defineTable({
  // Ownership
  organizationId: v.id("organizations"),
  userId: v.id("users"), // Who initiated the sync

  // Provider details
  provider: v.union(
    v.literal("microsoft"),
    v.literal("google")
  ),
  connectionId: v.id("oauthConnections"), // OAuth connection used for sync

  // Sync metadata
  syncType: v.union(
    v.literal("manual"),      // User-initiated via AI chat
    v.literal("scheduled")    // Future: automated sync
  ),
  status: v.union(
    v.literal("preview"),     // Showing preview to user (3-pane UI)
    v.literal("executing"),   // Currently syncing
    v.literal("completed"),   // Successfully completed
    v.literal("failed")       // Failed (see errorMessage)
  ),

  // Statistics
  totalContacts: v.number(),  // Total contacts fetched from provider
  created: v.number(),        // New contacts created in CRM
  updated: v.number(),        // Existing contacts updated
  skipped: v.number(),        // Contacts skipped (duplicates, invalid)
  failed: v.number(),         // Contacts that failed to sync

  // Preview data (for three-pane UI workflow)
  // Stored as array of contact preview items with AI recommendations
  // Cleared after sync completes to save storage
  previewData: v.optional(v.any()),

  // Timestamps
  startedAt: v.number(),      // When sync was initiated
  completedAt: v.optional(v.number()), // When sync finished
  errorMessage: v.optional(v.string()), // Error details if failed
})
  .index("by_org_user", ["organizationId", "userId"])       // User's sync history
  .index("by_organization", ["organizationId"])             // All org syncs
  .index("by_status", ["status"])                           // Filter by status
  .index("by_provider", ["organizationId", "provider"])     // Filter by provider
  .index("by_connection", ["connectionId"]);                // Syncs for specific OAuth connection

/**
 * EMAIL CAMPAIGNS TABLE
 *
 * Bulk email campaigns sent to CRM contacts/organizations.
 *
 * Workflow:
 * 1. User: "Email all contacts in 'Active Leads' pipeline"
 * 2. Backend: Query CRM contacts matching criteria
 * 3. Backend: AI generates personalized emails
 * 4. Backend: Create emailCampaign record (status: "draft")
 * 5. Frontend: Show three-pane UI with email previews
 * 6. User: Reviews and approves emails
 * 7. Backend: Update status to "sending"
 * 8. Backend: Send via Microsoft Graph API
 * 9. Backend: Update status to "completed" with stats
 * 10. Backend: Record actions in objectActions table
 */
export const emailCampaigns = defineTable({
  // Ownership
  organizationId: v.id("organizations"),
  userId: v.id("users"), // Campaign creator

  // Campaign metadata
  name: v.string(), // e.g., "Invoice Reminders Q1 2025"
  status: v.union(
    v.literal("draft"),       // Being created
    v.literal("pending"),     // Awaiting user approval
    v.literal("sending"),     // Currently sending
    v.literal("completed"),   // Successfully sent
    v.literal("failed")       // Failed (see errorMessage)
  ),

  // Target configuration
  targetType: v.union(
    v.literal("contacts"),        // Specific contact IDs
    v.literal("organizations"),   // Specific org IDs (email primary contact)
    v.literal("pipeline"),        // Contacts in pipeline/stage
    v.literal("tags"),            // Contacts with specific tags
    v.literal("custom_query")     // Custom CRM query
  ),
  targetCriteria: v.any(), // Query criteria (varies by targetType)

  // Email content
  subject: v.string(),
  bodyTemplate: v.string(),
  aiTone: v.optional(v.union(
    v.literal("professional"),
    v.literal("friendly"),
    v.literal("urgent"),
    v.literal("casual")
  )),

  // Sending options
  sendVia: v.union(
    v.literal("microsoft"), // Microsoft Graph API
    v.literal("smtp"),      // Future: direct SMTP
    v.literal("google")     // Future: Gmail API
  ),
  connectionId: v.optional(v.id("oauthConnections")), // OAuth connection for sending

  // Batch settings
  batchSize: v.optional(v.number()), // Send in batches (avoid rate limits)
  requireApproval: v.boolean(), // Show preview before sending (default: true)

  // Tracking options
  trackOpens: v.optional(v.boolean()),
  trackClicks: v.optional(v.boolean()),

  // Statistics
  totalRecipients: v.number(), // Number of recipients
  sent: v.number(),            // Successfully sent
  failed: v.number(),          // Failed to send
  queued: v.optional(v.number()), // Waiting to send (rate limiting)

  // Analytics (future: track via email tracking pixels)
  opened: v.optional(v.number()),   // Emails opened
  clicked: v.optional(v.number()),  // Links clicked

  // AI cost tracking
  totalCost: v.optional(v.number()), // Total AI cost (USD)
  tokensUsed: v.optional(v.number()), // Total tokens used

  // Preview data (for three-pane UI workflow)
  // Array of email previews with personalization
  // Cleared after campaign sends to save storage
  previewData: v.optional(v.any()),

  // Timestamps
  createdAt: v.number(),
  sentAt: v.optional(v.number()),      // When sending started
  completedAt: v.optional(v.number()), // When all emails sent
  errorMessage: v.optional(v.string()), // Error details if failed
})
  .index("by_org", ["organizationId"])                    // All org campaigns
  .index("by_user", ["userId"])                           // User's campaigns
  .index("by_status", ["status"])                         // Filter by status
  .index("by_org_status", ["organizationId", "status"])   // Org campaigns by status
  .index("by_created_at", ["createdAt"]);                 // Chronological order
