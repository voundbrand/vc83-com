/**
 * ACTIVITY PROTOCOL SCHEMAS
 *
 * Real-time data flow tracing for connected applications.
 * Provides debugging visibility into sync operations and data transformations.
 *
 * Use Cases:
 * - Track data flow from frontend app → API → backend → sync
 * - Debug sync issues with full request/response traces
 * - Monitor application health and performance
 * - Audit data transformations across system boundaries
 *
 * Rolling Window:
 * - Events auto-expire after retention period (default: 7 days)
 * - Configurable per organization via organization settings
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * ACTIVITY EVENTS TABLE
 * High-frequency event stream for data flow tracing
 *
 * Event Types:
 * - "api_request": Incoming API call from connected app
 * - "api_response": Outgoing response to connected app
 * - "object_created": New object created in backend
 * - "object_updated": Object modified
 * - "object_deleted": Object removed
 * - "sync_started": Sync operation initiated
 * - "sync_completed": Sync operation finished
 * - "sync_failed": Sync operation failed
 * - "transform": Data transformation applied
 * - "webhook_sent": Outbound webhook dispatched
 * - "webhook_received": Inbound webhook received
 *
 * Severity Levels:
 * - "debug": Detailed trace information (only shown in debug mode)
 * - "info": Normal operational events
 * - "warning": Potential issues that didn't fail
 * - "error": Failed operations
 */
export const activityEvents = defineTable({
  // Multi-tenancy
  organizationId: v.id("organizations"),

  // Event source
  applicationId: v.id("objects"), // connected_application object ID

  // Event classification
  eventType: v.string(), // "api_request", "object_created", "sync_started", etc.
  severity: v.union(
    v.literal("debug"),
    v.literal("info"),
    v.literal("warning"),
    v.literal("error")
  ),

  // Event context
  category: v.string(), // "sync", "api", "webhook", "transform", "object"

  // Human-readable summary (for simple mode)
  summary: v.string(), // "Contact 'John Smith' created via API"

  // Technical details (for debug mode)
  details: v.optional(v.object({
    // Request/Response tracing
    requestId: v.optional(v.string()), // Correlation ID across events
    method: v.optional(v.string()), // HTTP method: GET, POST, etc.
    endpoint: v.optional(v.string()), // API endpoint path
    statusCode: v.optional(v.number()), // HTTP status code

    // Object context
    objectType: v.optional(v.string()), // "contact", "event", "transaction"
    objectId: v.optional(v.id("objects")),
    objectName: v.optional(v.string()),

    // Data payload (sanitized - no PII in debug logs)
    inputSummary: v.optional(v.string()), // Summarized input data
    outputSummary: v.optional(v.string()), // Summarized output data

    // Sync-specific
    syncDirection: v.optional(v.string()), // "push", "pull", "bidirectional"
    recordsAffected: v.optional(v.number()),

    // Performance
    durationMs: v.optional(v.number()),

    // Error details
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    stackTrace: v.optional(v.string()), // Only for errors, truncated

    // Source location
    sourceFile: v.optional(v.string()), // For frontend tracing
    sourceLine: v.optional(v.number()),

    // Related events (for tracing chains)
    parentEventId: v.optional(v.id("activityEvents")),
    correlationId: v.optional(v.string()), // Groups related events together
  })),

  // Timestamps
  timestamp: v.number(), // Event occurrence time
  expiresAt: v.number(), // Auto-cleanup timestamp (rolling window)
})
  // Core queries
  .index("by_org", ["organizationId"])
  .index("by_org_app", ["organizationId", "applicationId"])
  .index("by_org_timestamp", ["organizationId", "timestamp"])
  .index("by_app_timestamp", ["applicationId", "timestamp"])

  // Filtering indexes
  .index("by_org_type", ["organizationId", "eventType"])
  .index("by_org_severity", ["organizationId", "severity"])
  .index("by_org_category", ["organizationId", "category"])

  // Cleanup index (for cron job)
  .index("by_expires_at", ["expiresAt"]);

/**
 * APPLICATION PAGES - STORED IN ONTOLOGY
 *
 * Pages are stored in the `objects` table with type="application_page"
 * and linked to their parent connected_application via `objectLinks`.
 *
 * Object Structure (in objects table):
 * {
 *   type: "application_page",
 *   name: "Dashboard",              // Page display name
 *   description: "/dashboard",      // Page path (stored in description for searchability)
 *   status: "active" | "inactive" | "archived",
 *   customProperties: {
 *     path: "/dashboard",           // Route path
 *     detectionMethod: "cli_auto" | "manual" | "runtime",
 *     pageType: "static" | "dynamic" | "api_route",
 *     objectBindings: [
 *       {
 *         objectType: "contact",
 *         accessMode: "read" | "write" | "read_write",
 *         boundObjectIds: [...],    // Optional: specific objects
 *         syncEnabled: true,
 *         syncDirection: "push" | "pull" | "bidirectional"
 *       }
 *     ],
 *     lastDetectedAt: number,       // CLI detection timestamp
 *     lastActivityAt: number        // Last API call timestamp
 *   }
 * }
 *
 * Link Structure (in objectLinks table):
 * {
 *   fromObjectId: <connected_application_id>,
 *   toObjectId: <application_page_id>,
 *   linkType: "has_page"
 * }
 */

/**
 * ACTIVITY PROTOCOL SETTINGS
 * Per-organization configuration for activity tracking
 */
export const activityProtocolSettings = defineTable({
  organizationId: v.id("organizations"),

  // Retention settings
  retentionDays: v.number(), // Default: 7, Max: 30

  // What to log
  logApiRequests: v.boolean(), // Log all API requests
  logSyncEvents: v.boolean(), // Log sync operations
  logObjectChanges: v.boolean(), // Log object CRUD
  logWebhooks: v.boolean(), // Log webhook activity
  logDebugEvents: v.boolean(), // Include debug-level events

  // Privacy settings
  redactPII: v.boolean(), // Redact personal info from logs

  // Timestamps
  updatedAt: v.number(),
})
  .index("by_org", ["organizationId"]);
