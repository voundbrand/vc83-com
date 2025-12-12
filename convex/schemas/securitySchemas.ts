/**
 * SECURITY EVENT SCHEMAS
 *
 * Anomaly detection and security event logging.
 * Tracks suspicious patterns like geographic anomalies, velocity spikes, and failed auth attempts.
 *
 * Security Model:
 * - Real-time anomaly detection
 * - Multi-level severity (low, medium, high, critical)
 * - Acknowledgement tracking
 * - Audit trail for compliance
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 3
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const securitySchemas = {
  /**
   * Security Events - Anomaly detection and security incidents
   *
   * Tracks suspicious activity patterns for proactive security monitoring.
   * Admins can acknowledge events to mark them as reviewed.
   */
  securityEvents: defineTable({
    // Organization affected
    organizationId: v.id("organizations"),

    // Event classification
    eventType: v.union(
      v.literal("geographic_anomaly"),     // API key used from multiple countries
      v.literal("velocity_spike"),         // Request rate 10x higher than average
      v.literal("failed_auth_spike"),      // Multiple failed auth attempts
      v.literal("unusual_scopes"),         // Scope never used before
      v.literal("midnight_activity"),      // Heavy usage during off-hours
      v.literal("suspicious_ip")           // Known malicious IP
    ),

    // Severity level
    severity: v.union(
      v.literal("low"),       // Informational, no immediate action needed
      v.literal("medium"),    // Investigate when convenient
      v.literal("high"),      // Requires prompt attention
      v.literal("critical")   // Immediate action required
    ),

    // Event-specific metadata (JSON)
    metadata: v.any(), // Flexible structure for different event types

    // API key context (if applicable)
    apiKeyId: v.optional(v.id("apiKeys")),
    apiKeyPrefix: v.optional(v.string()),

    // User context (if applicable)
    userId: v.optional(v.id("users")),

    // Request details
    endpoint: v.optional(v.string()),
    method: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    country: v.optional(v.string()),

    // Acknowledgement (for tracking if admin reviewed)
    acknowledged: v.boolean(),
    acknowledgedBy: v.optional(v.id("users")),
    acknowledgedAt: v.optional(v.number()),

    // Additional actions taken
    actionTaken: v.optional(v.string()), // "key_suspended", "ip_blocked", etc.

    // Timestamp
    timestamp: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_severity", ["organizationId", "severity"])
    .index("by_organization_and_acknowledged", ["organizationId", "acknowledged"])
    .index("by_timestamp", ["timestamp"])
    .index("by_event_type", ["eventType"])
    .index("by_api_key", ["apiKeyId"]),

  /**
   * Usage Metadata - Detailed request tracking for anomaly detection
   *
   * Stores metadata about each API request for pattern analysis.
   * Used by anomaly detection algorithms to identify suspicious patterns.
   */
  usageMetadata: defineTable({
    // Organization context
    organizationId: v.id("organizations"),

    // Authentication method
    authMethod: v.union(v.literal("api_key"), v.literal("oauth"), v.literal("none")),
    apiKeyId: v.optional(v.id("apiKeys")),
    userId: v.optional(v.id("users")),

    // Request details
    endpoint: v.string(),
    method: v.string(),
    statusCode: v.number(),

    // Geographic data
    ipAddress: v.string(),
    country: v.optional(v.string()), // Derived from IP (requires GeoIP service)

    // Scopes used
    scopes: v.optional(v.array(v.string())),

    // Performance data
    responseTimeMs: v.optional(v.number()),

    // User agent
    userAgent: v.optional(v.string()),

    // Timestamp
    timestamp: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_api_key", ["apiKeyId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_organization_and_timestamp", ["organizationId", "timestamp"])
    .index("by_api_key_and_timestamp", ["apiKeyId", "timestamp"])
    .index("by_ip_and_timestamp", ["ipAddress", "timestamp"]),

  /**
   * Failed Auth Attempts - Track authentication failures
   *
   * Used to detect brute force attacks and credential stuffing.
   */
  failedAuthAttempts: defineTable({
    // Attempted credentials
    apiKeyPrefix: v.optional(v.string()), // First 12 chars of API key
    tokenType: v.optional(v.string()),    // "api_key" or "oauth"

    // Request details
    endpoint: v.string(),
    method: v.string(),
    ipAddress: v.string(),
    country: v.optional(v.string()),
    userAgent: v.optional(v.string()),

    // Failure reason
    failureReason: v.string(), // "invalid_key", "expired_token", "invalid_signature", etc.

    // Timestamp
    timestamp: v.number(),
  })
    .index("by_ip", ["ipAddress"])
    .index("by_ip_and_timestamp", ["ipAddress", "timestamp"])
    .index("by_api_key_prefix", ["apiKeyPrefix"])
    .index("by_timestamp", ["timestamp"]),
};
