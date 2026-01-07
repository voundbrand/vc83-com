/**
 * ASYNC USAGE TRACKING
 *
 * Collects detailed request metadata asynchronously to avoid adding latency
 * to API responses. This data is used for:
 * - Anomaly detection
 * - Usage analytics
 * - Billing/metering
 * - Security auditing
 *
 * Performance Impact: 0ms (fully async via scheduler)
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 4
 */

import { internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
// Id type not needed - commented for clarity

/**
 * Track API Usage (Async Action)
 *
 * Called via scheduler to track request metadata without blocking the response.
 * Stores data in usageMetadata table for anomaly detection and analytics.
 *
 * Usage:
 * ```typescript
 * ctx.scheduler.runAfter(0, internal.security.usageTracking.trackUsageAsync, {
 *   organizationId: authContext.organizationId,
 *   authMethod: "api_key",
 *   apiKeyId: authContext.apiKeyId,
 *   endpoint: request.url,
 *   method: request.method,
 *   statusCode: 200,
 *   ipAddress: request.headers.get("x-forwarded-for") || "unknown",
 *   userAgent: request.headers.get("user-agent") || "unknown",
 *   responseTimeMs: Date.now() - startTime,
 *   scopes: authContext.scopes,
 * });
 * ```
 */
export const trackUsageAsync = internalAction({
  args: {
    organizationId: v.id("organizations"),
    authMethod: v.union(v.literal("api_key"), v.literal("oauth"), v.literal("cli_session"), v.literal("none")),
    apiKeyId: v.optional(v.id("apiKeys")),
    userId: v.optional(v.id("users")),
    endpoint: v.string(),
    method: v.string(),
    statusCode: v.number(),
    ipAddress: v.string(),
    userAgent: v.optional(v.string()),
    responseTimeMs: v.optional(v.number()),
    scopes: v.optional(v.array(v.string())),
    country: v.optional(v.string()), // Can be derived from IP if GeoIP service available
  },
  handler: async (ctx, args) => {
    // Store usage metadata
    await ctx.runMutation(internal.security.usageTracking.storeUsageMetadata, {
      organizationId: args.organizationId,
      authMethod: args.authMethod,
      apiKeyId: args.apiKeyId,
      userId: args.userId,
      endpoint: args.endpoint,
      method: args.method,
      statusCode: args.statusCode,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      responseTimeMs: args.responseTimeMs,
      scopes: args.scopes,
      country: args.country,
      timestamp: Date.now(),
    });

    // If API key, update last used timestamp
    if (args.apiKeyId) {
      await ctx.runMutation(internal.security.usageTracking.updateApiKeyLastUsed, {
        apiKeyId: args.apiKeyId,
      });
    }

    // TODO: Trigger anomaly detection (async, non-blocking)
    // Requires: convex/security/actions.ts to be exported
    // if (args.apiKeyId) {
    //   ctx.scheduler.runAfter(0, internal.security.actions.detectAnomaliesAction, {
    //     usage: {
    //       organizationId: args.organizationId,
    //       authMethod: args.authMethod,
    //       apiKeyId: args.apiKeyId,
    //       userId: args.userId,
    //       endpoint: args.endpoint,
    //       method: args.method,
    //       statusCode: args.statusCode,
    //       ipAddress: args.ipAddress,
    //       country: args.country,
    //       scopes: args.scopes || [],
    //       timestamp: Date.now(),
    //     },
    //   });
    // }
  },
});

/**
 * Store Usage Metadata (Internal Mutation)
 *
 * Stores detailed request metadata in usageMetadata table.
 */
export const storeUsageMetadata = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    authMethod: v.union(v.literal("api_key"), v.literal("oauth"), v.literal("cli_session"), v.literal("none")),
    apiKeyId: v.optional(v.id("apiKeys")),
    userId: v.optional(v.id("users")),
    endpoint: v.string(),
    method: v.string(),
    statusCode: v.number(),
    ipAddress: v.string(),
    userAgent: v.optional(v.string()),
    responseTimeMs: v.optional(v.number()),
    scopes: v.optional(v.array(v.string())),
    country: v.optional(v.string()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("usageMetadata", {
      organizationId: args.organizationId,
      authMethod: args.authMethod,
      apiKeyId: args.apiKeyId,
      userId: args.userId,
      endpoint: args.endpoint,
      method: args.method,
      statusCode: args.statusCode,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      responseTimeMs: args.responseTimeMs,
      scopes: args.scopes,
      country: args.country,
      timestamp: args.timestamp,
    });
  },
});

/**
 * Update API Key Last Used (Internal Mutation)
 *
 * Updates the lastUsedAt timestamp for an API key.
 * This is called asynchronously to avoid blocking the response.
 */
export const updateApiKeyLastUsed = internalMutation({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey) {
      return;
    }

    await ctx.db.patch(args.apiKeyId, {
      lastUsed: Date.now(),
    });
  },
});

/**
 * Track Failed Auth Attempt (Async Action)
 *
 * Records failed authentication attempts for brute force detection.
 *
 * Usage:
 * ```typescript
 * ctx.scheduler.runAfter(0, internal.security.usageTracking.trackFailedAuthAsync, {
 *   apiKeyPrefix: "sk_live_abcd",
 *   tokenType: "api_key",
 *   endpoint: request.url,
 *   method: request.method,
 *   ipAddress: request.headers.get("x-forwarded-for") || "unknown",
 *   userAgent: request.headers.get("user-agent"),
 *   failureReason: "invalid_key",
 * });
 * ```
 */
export const trackFailedAuthAsync = internalAction({
  args: {
    apiKeyPrefix: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    endpoint: v.string(),
    method: v.string(),
    ipAddress: v.string(),
    userAgent: v.optional(v.string()),
    failureReason: v.string(),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Store failed attempt
    await ctx.runMutation(internal.security.usageTracking.storeFailedAuthAttempt, {
      apiKeyPrefix: args.apiKeyPrefix,
      tokenType: args.tokenType,
      endpoint: args.endpoint,
      method: args.method,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      failureReason: args.failureReason,
      country: args.country,
      timestamp: Date.now(),
    });

    // Check for failed auth spike (brute force detection)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    // TODO: Use recentFailures count for security event triggering
    // Currently commented out as createSecurityEvent is not exported
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _recentFailures = await ctx.runMutation(
      internal.security.usageTracking.getRecentFailedAuthCount,
      {
        ipAddress: args.ipAddress,
        since: fiveMinutesAgo,
      }
    );

    // TODO: If 20+ failures in 5 minutes, trigger security event
    // Requires: convex/security/actions.ts to export createSecurityEvent
    // if (recentFailures >= 20) {
    //   await ctx.runMutation(internal.security.actions.createSecurityEvent, {
    //     organizationId: null as any, // Will be set if we can identify org
    //     eventType: "failed_auth_spike",
    //     severity: "critical",
    //     metadata: {
    //       ipAddress: args.ipAddress,
    //       failureCount: recentFailures,
    //       timeWindow: "5 minutes",
    //     },
    //     endpoint: args.endpoint,
    //     method: args.method,
    //     ipAddress: args.ipAddress,
    //     country: args.country,
    //     acknowledged: false,
    //     timestamp: Date.now(),
    //   });
    // }
  },
});

/**
 * Store Failed Auth Attempt (Internal Mutation)
 */
export const storeFailedAuthAttempt = internalMutation({
  args: {
    apiKeyPrefix: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    endpoint: v.string(),
    method: v.string(),
    ipAddress: v.string(),
    userAgent: v.optional(v.string()),
    failureReason: v.string(),
    country: v.optional(v.string()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("failedAuthAttempts", {
      apiKeyPrefix: args.apiKeyPrefix,
      tokenType: args.tokenType,
      endpoint: args.endpoint,
      method: args.method,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      failureReason: args.failureReason,
      country: args.country,
      timestamp: args.timestamp,
    });
  },
});

/**
 * Get Recent Failed Auth Count (Internal Query)
 */
export const getRecentFailedAuthCount = internalMutation({
  args: {
    ipAddress: v.string(),
    since: v.number(),
  },
  handler: async (ctx, args): Promise<number> => {
    const failures = await ctx.db
      .query("failedAuthAttempts")
      .withIndex("by_ip_and_timestamp", (q) =>
        q.eq("ipAddress", args.ipAddress).gte("timestamp", args.since)
      )
      .collect();

    return failures.length;
  },
});

/**
 * Cleanup Old Usage Metadata (Scheduled Action)
 *
 * Removes usage metadata older than 30 days to prevent unbounded growth.
 * Should be scheduled to run daily.
 *
 * Schedule:
 * ```typescript
 * // In convex/crons.ts
 * export default {
 *   "cleanup-usage-metadata": {
 *     schedule: "0 2 * * *", // 2 AM daily
 *     handler: internal.security.usageTracking.cleanupOldMetadata,
 *   },
 * };
 * ```
 */
export const cleanupOldMetadata = internalAction({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    await ctx.runMutation(internal.security.usageTracking.deleteOldUsageMetadata, {
      before: thirtyDaysAgo,
    });

    await ctx.runMutation(internal.security.usageTracking.deleteOldFailedAuthAttempts, {
      before: thirtyDaysAgo,
    });
  },
});

/**
 * Delete Old Usage Metadata (Internal Mutation)
 */
export const deleteOldUsageMetadata = internalMutation({
  args: {
    before: v.number(),
  },
  handler: async (ctx, args) => {
    const oldRecords = await ctx.db
      .query("usageMetadata")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", args.before))
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return oldRecords.length;
  },
});

/**
 * Delete Old Failed Auth Attempts (Internal Mutation)
 */
export const deleteOldFailedAuthAttempts = internalMutation({
  args: {
    before: v.number(),
  },
  handler: async (ctx, args) => {
    const oldRecords = await ctx.db
      .query("failedAuthAttempts")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", args.before))
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return oldRecords.length;
  },
});
