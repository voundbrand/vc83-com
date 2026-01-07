/**
 * RATE LIMITING MIDDLEWARE
 *
 * Token bucket rate limiting for API abuse prevention.
 * Each identifier (API key, user, IP) gets a bucket of tokens that refill over time.
 *
 * Algorithm: Token Bucket
 * - Bucket has max capacity (burst)
 * - Tokens refill at constant rate (tokensPerMinute)
 * - Each request consumes 1 token
 * - If bucket empty, request is rate limited (HTTP 429)
 *
 * Plan-Based Limits:
 * - Free: 10 req/min, burst 20
 * - Personal: 30 req/min, burst 60
 * - Pro: 100 req/min, burst 200
 * - Business: 500 req/min, burst 1000
 * - Enterprise: Unlimited
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 2
 */

import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Rate limit configuration per plan
 */
interface RateLimitConfig {
  tokensPerMinute: number; // How many tokens refill per minute
  burst: number; // Max tokens in bucket (allows bursts)
  dailyLimit: number; // Total requests per day (-1 = unlimited)
}

/**
 * Plan-based rate limits
 *
 * Follows Stripe/GitHub model where higher tiers get higher limits.
 * Uses licensing tier names: free, starter, professional, agency, enterprise
 * Values align with rateLimitPerMinute and rateLimitPerDay from tier configs.
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    tokensPerMinute: 30, // Matches FREE_TIER.rateLimitPerMinute
    burst: 60,
    dailyLimit: 1000, // Matches FREE_TIER.rateLimitPerDay
  },
  starter: {
    tokensPerMinute: 60, // Matches STARTER_TIER.rateLimitPerMinute
    burst: 120,
    dailyLimit: 5000, // Matches STARTER_TIER.rateLimitPerDay
  },
  professional: {
    tokensPerMinute: 120, // Matches PROFESSIONAL_TIER.rateLimitPerMinute
    burst: 240,
    dailyLimit: 25000, // Matches PROFESSIONAL_TIER.rateLimitPerDay
  },
  agency: {
    tokensPerMinute: 300, // Matches AGENCY_TIER.rateLimitPerMinute
    burst: 600,
    dailyLimit: 100000, // Matches AGENCY_TIER.rateLimitPerDay
  },
  enterprise: {
    tokensPerMinute: Infinity, // Matches ENTERPRISE_TIER.rateLimitPerMinute (-1 = unlimited)
    burst: Infinity,
    dailyLimit: -1, // Unlimited, matches ENTERPRISE_TIER.rateLimitPerDay
  },
};

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean; // Whether request is allowed
  retryAfter?: number; // Seconds to wait before retry (if rate limited)
  remainingTokens?: number; // Tokens remaining in bucket
  resetAt?: number; // Timestamp when bucket refills to full
  limit?: number; // Total tokens per minute
  used?: number; // Tokens used in current window
}

/**
 * CHECK RATE LIMIT
 *
 * Token bucket algorithm implementation.
 * Checks if identifier has tokens available and consumes one.
 *
 * Performance: ~10-15ms overhead per request
 *
 * @param ctx - Action context
 * @param identifier - Unique identifier (apiKeyId, userId, or IP)
 * @param identifierType - Type of identifier
 * @param plan - Rate limit plan (free, pro, etc.)
 * @returns Rate limit result
 */
export async function checkRateLimit(
  ctx: ActionCtx,
  identifier: string,
  identifierType: "api_key" | "user" | "ip",
  plan: string
): Promise<RateLimitResult> {
  // Enterprise plan has unlimited rate limits
  const config = RATE_LIMITS[plan] || RATE_LIMITS.free;
  if (config.tokensPerMinute === Infinity) {
    return {
      allowed: true,
      remainingTokens: Infinity,
      limit: Infinity,
      used: 0,
    };
  }

  const now = Date.now();

  // 1. Get or create bucket
  let bucket = await ctx.runQuery(internal.middleware.rateLimitDb.getBucket, {
    identifier,
  });

  if (!bucket) {
    // Create new bucket with full tokens
    bucket = await ctx.runMutation(internal.middleware.rateLimitDb.createBucket, {
      identifier,
      identifierType,
      plan,
      tokensPerMinute: config.tokensPerMinute,
      burst: config.burst,
      tokens: config.burst, // Start with full bucket
      lastRefill: now,
    });
  }

  // 2. Calculate token refill (linear refill over time)
  const timeSinceRefillMs = now - bucket.lastRefill;
  const timeSinceRefillSec = timeSinceRefillMs / 1000;
  const tokensToAdd = (timeSinceRefillSec / 60) * config.tokensPerMinute;
  const newTokens = Math.min(bucket.tokens + tokensToAdd, config.burst);

  // 3. Check if request is allowed (need at least 1 token)
  if (newTokens < 1) {
    // Rate limited! Calculate retry after
    const tokensNeeded = 1 - newTokens;
    const secondsUntilToken = (tokensNeeded / config.tokensPerMinute) * 60;
    const retryAfter = Math.ceil(secondsUntilToken);

    // Log violation (async, don't block)
    ctx.scheduler.runAfter(0, internal.middleware.rateLimitDb.logViolation, {
      identifier,
      identifierType,
      plan,
      tokensPerMinute: config.tokensPerMinute,
      retryAfter,
    });

    return {
      allowed: false,
      retryAfter,
      remainingTokens: 0,
      resetAt: now + secondsUntilToken * 1000,
      limit: config.tokensPerMinute,
      used: bucket.requestCount || 0,
    };
  }

  // 4. Consume 1 token and update bucket
  await ctx.runMutation(internal.middleware.rateLimitDb.consumeToken, {
    identifier,
    tokensRemaining: newTokens - 1,
    lastRefill: now,
  });

  return {
    allowed: true,
    remainingTokens: Math.floor(newTokens - 1),
    resetAt: now + 60 * 1000, // Reset in 1 minute
    limit: config.tokensPerMinute,
    used: (bucket.requestCount || 0) + 1,
  };
}

/**
 * ADD RATE LIMIT HEADERS
 *
 * Adds standard rate limit headers to HTTP response.
 * Follows GitHub/Stripe conventions.
 *
 * Headers:
 * - X-RateLimit-Limit: Total tokens per minute
 * - X-RateLimit-Remaining: Tokens remaining
 * - X-RateLimit-Reset: Unix timestamp when limit resets
 * - X-RateLimit-Used: Requests made in current window
 * - Retry-After: Seconds to wait (only when rate limited)
 *
 * @param response - HTTP response
 * @param result - Rate limit check result
 * @returns Response with rate limit headers
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);

  if (result.allowed) {
    // Success - show remaining tokens
    headers.set("X-RateLimit-Limit", (result.limit || 0).toString());
    headers.set("X-RateLimit-Remaining", (result.remainingTokens || 0).toString());
    headers.set("X-RateLimit-Reset", (result.resetAt || Date.now()).toString());
    headers.set("X-RateLimit-Used", (result.used || 0).toString());
  } else {
    // Rate limited - show retry info
    headers.set("X-RateLimit-Limit", (result.limit || 0).toString());
    headers.set("X-RateLimit-Remaining", "0");
    headers.set("X-RateLimit-Reset", (result.resetAt || Date.now()).toString());
    headers.set("Retry-After", (result.retryAfter || 60).toString());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * GET IDENTIFIER FOR RATE LIMITING
 *
 * Determines the identifier to use for rate limiting based on auth context.
 * Priority: API Key > User ID > IP Address
 *
 * @param authContext - Authentication context (if authenticated)
 * @param request - HTTP request (for IP fallback)
 * @returns Identifier and type
 */
export function getRateLimitIdentifier(
  authContext?: {
    apiKeyId?: Id<"apiKeys">;
    userId?: Id<"users">;
    authMethod?: "api_key" | "oauth" | "cli_session";
  },
  request?: Request
): { identifier: string; identifierType: "api_key" | "user" | "ip" } {
  // Priority 1: API Key (most specific)
  if (authContext?.apiKeyId) {
    return {
      identifier: `apikey:${authContext.apiKeyId}`,
      identifierType: "api_key",
    };
  }

  // Priority 2: User ID (OAuth authenticated)
  if (authContext?.userId) {
    return {
      identifier: `user:${authContext.userId}`,
      identifierType: "user",
    };
  }

  // Priority 3: IP Address (unauthenticated fallback)
  const ip =
    request?.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request?.headers.get("x-real-ip") ||
    "unknown";

  return {
    identifier: `ip:${ip}`,
    identifierType: "ip",
  };
}

/**
 * GET RATE LIMIT PLAN
 *
 * Determines the rate limit plan for an organization based on licensing tier.
 * Defaults to "free" if no organization context.
 *
 * Maps licensing tiers (free, starter, professional, agency, enterprise) to rate limit plans.
 * Also supports legacy plan names for backward compatibility.
 *
 * @param organizationPlan - Organization's subscription plan/tier from licensing system
 * @returns Rate limit plan name matching RATE_LIMITS keys
 */
export function getRateLimitPlan(organizationPlan?: string): string {
  if (!organizationPlan) {
    return "free";
  }

  const plan = organizationPlan.toLowerCase();

  // Map licensing tiers to rate limit plans (primary mapping)
  const tierMap: Record<string, string> = {
    free: "free",
    starter: "starter",
    professional: "professional",
    agency: "agency",
    enterprise: "enterprise",
  };

  // Legacy plan name mapping (for backward compatibility)
  const legacyMap: Record<string, string> = {
    personal: "starter", // Legacy "personal" maps to "starter"
    pro: "professional", // Legacy "pro" maps to "professional"
    business: "agency", // Legacy "business" maps to "agency"
  };

  // Check licensing tier first
  if (tierMap[plan]) {
    return tierMap[plan];
  }

  // Fall back to legacy mapping
  if (legacyMap[plan]) {
    return legacyMap[plan];
  }

  // Default to free
  return "free";
}
