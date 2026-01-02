/**
 * ANOMALY DETECTION DATABASE OPERATIONS
 *
 * Internal mutations and queries for anomaly detection system.
 * These are called by the anomaly detection middleware.
 *
 * Performance: All operations are designed to be async and non-blocking.
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 3
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * CREATE SECURITY EVENT
 *
 * Logs a security event for admin review.
 * Called by anomaly detection algorithms when suspicious patterns are detected.
 *
 * @internal
 */
export const createSecurityEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    eventType: v.union(
      v.literal("geographic_anomaly"),
      v.literal("velocity_spike"),
      v.literal("failed_auth_spike"),
      v.literal("unusual_scopes"),
      v.literal("midnight_activity"),
      v.literal("suspicious_ip")
    ),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    metadata: v.any(),
    apiKeyId: v.optional(v.id("apiKeys")),
    apiKeyPrefix: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    endpoint: v.optional(v.string()),
    method: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const eventId = await ctx.db.insert("securityEvents", {
      organizationId: args.organizationId,
      eventType: args.eventType,
      severity: args.severity,
      metadata: args.metadata,
      apiKeyId: args.apiKeyId,
      apiKeyPrefix: args.apiKeyPrefix,
      userId: args.userId,
      endpoint: args.endpoint,
      method: args.method,
      ipAddress: args.ipAddress,
      country: args.country,
      acknowledged: false,
      timestamp: now,
    });

    return eventId;
  },
});

/**
 * LOG USAGE METADATA
 *
 * Stores detailed request metadata for anomaly detection analysis.
 * Called asynchronously after each API request (doesn't block response).
 *
 * @internal
 */
export const logUsageMetadata = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    authMethod: v.union(v.literal("api_key"), v.literal("oauth"), v.literal("none")),
    apiKeyId: v.optional(v.id("apiKeys")),
    userId: v.optional(v.id("users")),
    endpoint: v.string(),
    method: v.string(),
    statusCode: v.number(),
    ipAddress: v.string(),
    country: v.optional(v.string()),
    scopes: v.optional(v.array(v.string())),
    responseTimeMs: v.optional(v.number()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("usageMetadata", {
      organizationId: args.organizationId,
      authMethod: args.authMethod,
      apiKeyId: args.apiKeyId,
      userId: args.userId,
      endpoint: args.endpoint,
      method: args.method,
      statusCode: args.statusCode,
      ipAddress: args.ipAddress,
      country: args.country,
      scopes: args.scopes,
      responseTimeMs: args.responseTimeMs,
      userAgent: args.userAgent,
      timestamp: now,
    });
  },
});

/**
 * LOG FAILED AUTH ATTEMPT
 *
 * Records failed authentication attempts for brute force detection.
 * Called when API key or OAuth token verification fails.
 *
 * @internal
 */
export const logFailedAuth = internalMutation({
  args: {
    apiKeyPrefix: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    endpoint: v.string(),
    method: v.string(),
    ipAddress: v.string(),
    country: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    failureReason: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("failedAuthAttempts", {
      apiKeyPrefix: args.apiKeyPrefix,
      tokenType: args.tokenType,
      endpoint: args.endpoint,
      method: args.method,
      ipAddress: args.ipAddress,
      country: args.country,
      userAgent: args.userAgent,
      failureReason: args.failureReason,
      timestamp: now,
    });
  },
});

/**
 * GET RECENT COUNTRIES FOR API KEY
 *
 * Returns list of countries an API key was used from in a time window.
 * Used for geographic anomaly detection.
 *
 * @internal
 */
export const getRecentCountries = internalQuery({
  args: {
    apiKeyId: v.id("apiKeys"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query("usageMetadata")
      .withIndex("by_api_key_and_timestamp", (q) =>
        q.eq("apiKeyId", args.apiKeyId).gte("timestamp", args.since)
      )
      .collect();

    // Extract unique countries
    const countries = new Set<string>();
    for (const record of usage) {
      if (record.country) {
        countries.add(record.country);
      }
    }

    return Array.from(countries);
  },
});

/**
 * GET REQUEST COUNT IN TIME WINDOW
 *
 * Returns number of requests made by an organization in a time window.
 * Used for velocity spike detection.
 *
 * @internal
 */
export const getRequestCount = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query("usageMetadata")
      .withIndex("by_organization_and_timestamp", (q) =>
        q.eq("organizationId", args.organizationId).gte("timestamp", args.since)
      )
      .collect();

    return usage.length;
  },
});

/**
 * GET AVERAGE REQUEST RATE
 *
 * Returns average requests per 5 minutes over a time window.
 * Used for velocity spike detection baseline.
 *
 * @internal
 */
export const getAverageRequestRate = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query("usageMetadata")
      .withIndex("by_organization_and_timestamp", (q) =>
        q.eq("organizationId", args.organizationId).gte("timestamp", args.since)
      )
      .collect();

    const timeWindowMs = Date.now() - args.since;
    const fiveMinuteWindows = timeWindowMs / (5 * 60 * 1000);

    // Average requests per 5 minutes
    return usage.length / fiveMinuteWindows;
  },
});

/**
 * GET FAILED AUTH ATTEMPTS IN TIME WINDOW
 *
 * Returns number of failed auth attempts from an IP in a time window.
 * Used for brute force detection.
 *
 * @internal
 */
export const getFailedAuthAttempts = internalQuery({
  args: {
    ipAddress: v.string(),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const attempts = await ctx.db
      .query("failedAuthAttempts")
      .withIndex("by_ip_and_timestamp", (q) =>
        q.eq("ipAddress", args.ipAddress).gte("timestamp", args.since)
      )
      .collect();

    return attempts.length;
  },
});

/**
 * GET RECENT SECURITY EVENTS
 *
 * Returns recent security events for an organization.
 * Used to avoid duplicate alerts for the same issue.
 *
 * @internal
 */
export const getRecentSecurityEvents = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    eventType: v.string(),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("securityEvents")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("eventType"), args.eventType),
          q.gte(q.field("timestamp"), args.since)
        )
      )
      .collect();

    return events;
  },
});

/**
 * ACKNOWLEDGE SECURITY EVENT
 *
 * Marks a security event as reviewed by an admin.
 * Prevents re-alerting for the same issue.
 *
 * @internal
 */
export const acknowledgeSecurityEvent = internalMutation({
  args: {
    eventId: v.id("securityEvents"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.eventId, {
      acknowledged: true,
      acknowledgedBy: args.userId,
      acknowledgedAt: now,
    });
  },
});

/**
 * CLEANUP OLD USAGE METADATA
 *
 * Deletes usage metadata older than 30 days.
 * Should be run as a scheduled job (daily).
 *
 * @internal
 */
export const cleanupOldUsageMetadata = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldRecords = await ctx.db
      .query("usageMetadata")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", thirtyDaysAgo))
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return oldRecords.length;
  },
});

/**
 * CLEANUP OLD FAILED AUTH ATTEMPTS
 *
 * Deletes failed auth attempts older than 7 days.
 * Should be run as a scheduled job (daily).
 *
 * @internal
 */
export const cleanupOldFailedAuth = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const oldRecords = await ctx.db
      .query("failedAuthAttempts")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", sevenDaysAgo))
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return oldRecords.length;
  },
});
