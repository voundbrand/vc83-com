/**
 * RATE LIMITING SCHEMAS
 *
 * Token bucket rate limiting for API abuse prevention.
 * Each identifier (API key, user, IP) gets a bucket with tokens that refill over time.
 *
 * Security Model:
 * - Plan-based limits (Free: 10/min, Pro: 100/min, etc.)
 * - Token bucket algorithm (allows bursts)
 * - Per-identifier rate limiting
 * - Automatic token refill
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 2
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const rateLimitSchemas = {
  /**
   * Rate Limit Buckets - Token bucket state per identifier
   *
   * Each API key, user, or IP address gets a bucket of tokens.
   * Tokens are consumed on requests and refilled over time.
   */
  rateLimitBuckets: defineTable({
    // Identifier: apiKeyId, userId, or IP address
    identifier: v.string(), // e.g., "apikey:abc123", "user:xyz789", "ip:192.168.1.1"
    identifierType: v.union(
      v.literal("api_key"),
      v.literal("user"),
      v.literal("ip")
    ),

    // Token bucket state
    tokens: v.number(), // Current tokens available (0 to burst)
    lastRefill: v.number(), // Timestamp of last refill (ms)

    // Rate limit configuration (cached from plan)
    plan: v.string(), // "free", "personal", "pro", "business", "enterprise"
    tokensPerMinute: v.number(), // Refill rate (e.g., 10 for Free plan)
    burst: v.number(), // Max tokens (bucket size, e.g., 20 for Free plan)

    // Request tracking
    requestCount: v.optional(v.number()), // Total requests made
    lastRequestAt: v.optional(v.number()), // Last request timestamp

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_identifier", ["identifier"]) // Fast lookup by identifier
    .index("by_identifier_type", ["identifierType"]) // Find all buckets by type
    .index("by_last_refill", ["lastRefill"]), // Cleanup old buckets

  /**
   * Rate Limit Violations - Track when limits are exceeded
   *
   * Useful for monitoring abuse patterns and adjusting limits.
   */
  rateLimitViolations: defineTable({
    // Who violated the limit
    identifier: v.string(),
    identifierType: v.union(
      v.literal("api_key"),
      v.literal("user"),
      v.literal("ip")
    ),

    // Organization context (if available)
    organizationId: v.optional(v.id("organizations")),

    // Violation details
    endpoint: v.string(), // Which endpoint was being accessed
    method: v.string(), // HTTP method (GET, POST, etc.)
    plan: v.string(), // Rate limit plan at time of violation
    tokensPerMinute: v.number(), // Limit that was exceeded
    requestCount: v.number(), // How many requests in the window

    // Response sent
    retryAfter: v.number(), // Seconds client should wait
    statusCode: v.number(), // HTTP status (429)

    // Metadata
    timestamp: v.number(),
  })
    .index("by_identifier", ["identifier"])
    .index("by_organization", ["organizationId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_identifier_and_timestamp", ["identifier", "timestamp"]), // Find recent violations per identifier
};
