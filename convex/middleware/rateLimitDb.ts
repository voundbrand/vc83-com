/**
 * RATE LIMIT DATABASE OPERATIONS
 *
 * Internal mutations and queries for rate limit bucket management.
 * These are called by the rate limit middleware.
 *
 * @see convex/middleware/rateLimit.ts
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * GET BUCKET
 *
 * Retrieves rate limit bucket for an identifier.
 * Returns null if bucket doesn't exist.
 */
export const getBucket = internalQuery({
  args: {
    identifier: v.string(),
  },
  handler: async (ctx, args) => {
    const bucket = await ctx.db
      .query("rateLimitBuckets")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .first();

    if (!bucket) {
      return null;
    }

    return {
      identifier: bucket.identifier,
      identifierType: bucket.identifierType,
      tokens: bucket.tokens,
      lastRefill: bucket.lastRefill,
      plan: bucket.plan,
      tokensPerMinute: bucket.tokensPerMinute,
      burst: bucket.burst,
      requestCount: bucket.requestCount || 0,
    };
  },
});

/**
 * CREATE BUCKET
 *
 * Creates a new rate limit bucket for an identifier.
 */
export const createBucket = internalMutation({
  args: {
    identifier: v.string(),
    identifierType: v.union(
      v.literal("api_key"),
      v.literal("user"),
      v.literal("ip")
    ),
    plan: v.string(),
    tokensPerMinute: v.number(),
    burst: v.number(),
    tokens: v.number(),
    lastRefill: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("rateLimitBuckets", {
      identifier: args.identifier,
      identifierType: args.identifierType,
      tokens: args.tokens,
      lastRefill: args.lastRefill,
      plan: args.plan,
      tokensPerMinute: args.tokensPerMinute,
      burst: args.burst,
      requestCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      identifier: args.identifier,
      identifierType: args.identifierType,
      tokens: args.tokens,
      lastRefill: args.lastRefill,
      plan: args.plan,
      tokensPerMinute: args.tokensPerMinute,
      burst: args.burst,
      requestCount: 0,
    };
  },
});

/**
 * CONSUME TOKEN
 *
 * Consumes a token from the bucket and updates state.
 * Also increments request counter.
 */
export const consumeToken = internalMutation({
  args: {
    identifier: v.string(),
    tokensRemaining: v.number(),
    lastRefill: v.number(),
  },
  handler: async (ctx, args) => {
    const bucket = await ctx.db
      .query("rateLimitBuckets")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .first();

    if (!bucket) {
      throw new Error(`Rate limit bucket not found: ${args.identifier}`);
    }

    const now = Date.now();

    await ctx.db.patch(bucket._id, {
      tokens: args.tokensRemaining,
      lastRefill: args.lastRefill,
      requestCount: (bucket.requestCount || 0) + 1,
      lastRequestAt: now,
      updatedAt: now,
    });
  },
});

/**
 * LOG VIOLATION
 *
 * Logs a rate limit violation for monitoring and abuse detection.
 */
export const logViolation = internalMutation({
  args: {
    identifier: v.string(),
    identifierType: v.union(
      v.literal("api_key"),
      v.literal("user"),
      v.literal("ip")
    ),
    plan: v.string(),
    tokensPerMinute: v.number(),
    retryAfter: v.number(),
    endpoint: v.optional(v.string()),
    method: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const bucket = await ctx.db
      .query("rateLimitBuckets")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .first();

    await ctx.db.insert("rateLimitViolations", {
      identifier: args.identifier,
      identifierType: args.identifierType,
      organizationId: args.organizationId,
      endpoint: args.endpoint || "unknown",
      method: args.method || "GET",
      plan: args.plan,
      tokensPerMinute: args.tokensPerMinute,
      requestCount: bucket?.requestCount || 0,
      retryAfter: args.retryAfter,
      statusCode: 429,
      timestamp: Date.now(),
    });
  },
});

/**
 * CLEANUP OLD BUCKETS
 *
 * Scheduled job to clean up inactive rate limit buckets.
 * Run daily to remove buckets not used in 7+ days.
 */
export const cleanupOldBuckets = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const oldBuckets = await ctx.db
      .query("rateLimitBuckets")
      .withIndex("by_last_refill")
      .filter((q) => q.lt(q.field("lastRefill"), sevenDaysAgo))
      .collect();

    for (const bucket of oldBuckets) {
      await ctx.db.delete(bucket._id);
    }

    return {
      deletedCount: oldBuckets.length,
      message: `Cleaned up ${oldBuckets.length} inactive rate limit buckets`,
    };
  },
});

/**
 * CLEANUP OLD VIOLATIONS
 *
 * Scheduled job to clean up old rate limit violations.
 * Run daily to remove violations older than 30 days.
 */
export const cleanupOldViolations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldViolations = await ctx.db
      .query("rateLimitViolations")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), thirtyDaysAgo))
      .collect();

    for (const violation of oldViolations) {
      await ctx.db.delete(violation._id);
    }

    return {
      deletedCount: oldViolations.length,
      message: `Cleaned up ${oldViolations.length} old rate limit violations`,
    };
  },
});

/**
 * GET VIOLATION STATS
 *
 * Query to get rate limit violation statistics for an identifier.
 * Useful for monitoring abuse patterns.
 */
export const getViolationStats = internalQuery({
  args: {
    identifier: v.string(),
    since: v.optional(v.number()), // Timestamp (default: last 24 hours)
  },
  handler: async (ctx, args) => {
    const since = args.since || Date.now() - 24 * 60 * 60 * 1000;

    const violations = await ctx.db
      .query("rateLimitViolations")
      .withIndex("by_identifier_and_timestamp", (q) =>
        q.eq("identifier", args.identifier).gt("timestamp", since)
      )
      .collect();

    return {
      totalViolations: violations.length,
      endpoints: [...new Set(violations.map((v) => v.endpoint))],
      averageRetryAfter:
        violations.reduce((sum, v) => sum + v.retryAfter, 0) / violations.length || 0,
      firstViolation: violations[0]?.timestamp,
      lastViolation: violations[violations.length - 1]?.timestamp,
    };
  },
});
