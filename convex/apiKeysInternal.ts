/**
 * API KEY INTERNAL FUNCTIONS
 *
 * Internal queries and mutations for API key management.
 * These are called by the actions in actions/apiKeys.ts.
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 1
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * INTERNAL: Store API Key in Database
 *
 * Internal mutation called by generateApiKey action.
 * Cannot be called directly from frontend.
 */
export const storeApiKey = internalMutation({
  args: {
    keyHash: v.string(),
    keyPrefix: v.string(),
    name: v.string(),
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),
    scopes: v.array(v.string()),
    type: v.union(v.literal("simple"), v.literal("oauth")),
  },
  handler: async (ctx, args) => {
    const apiKeyId = await ctx.db.insert("apiKeys", {
      keyHash: args.keyHash,
      keyPrefix: args.keyPrefix,
      name: args.name,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      scopes: args.scopes,
      type: args.type,
      status: "active",
      createdAt: Date.now(),
    });

    return apiKeyId;
  },
});

/**
 * INTERNAL: Find API Keys by Prefix
 *
 * Internal query to find API key records by prefix.
 * Used by verifyApiKey action.
 */
export const findApiKeysByPrefix = internalQuery({
  args: {
    keyPrefix: v.string(),
  },
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_prefix", (q) => q.eq("keyPrefix", args.keyPrefix))
      .collect();

    return keys.map(key => ({
      _id: key._id,
      keyHash: key.keyHash,
      organizationId: key.organizationId,
      createdBy: key.createdBy,
      scopes: key.scopes,
      type: key.type,
      status: key.status,
      expiresAt: key.expiresAt,
      allowedDomains: key.allowedDomains,
      allowedIPs: key.allowedIPs,
    }));
  },
});

/**
 * INTERNAL: Verify Session
 *
 * Verifies user session before allowing API key generation.
 */
export const verifySession = internalQuery({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session) {
      return { valid: false, error: "Invalid session" };
    }

    if (session.expiresAt < Date.now()) {
      return { valid: false, error: "Session expired" };
    }

    if (session.organizationId !== args.organizationId) {
      return { valid: false, error: "Organization mismatch" };
    }

    return {
      valid: true,
      userId: session.userId,
    };
  },
});

/**
 * INTERNAL: Check API Key Limit
 *
 * Checks if organization can create more API keys based on license tier.
 * Standardized to match checkResourceLimit() pattern and error format.
 * Note: API keys are stored in apiKeys table, not objects table, so we use custom counting.
 */
export const checkApiKeyLimit = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Import license helper
    const { getLicenseInternal } = await import("./licensing/helpers");

    const license = await getLicenseInternal(ctx, args.organizationId);
    const limit = license.limits.maxApiKeys;

    // If unlimited, return success
    if (limit === -1) {
      return { allowed: true };
    }

    // Count existing active API keys (from apiKeys table, not objects table)
    const existingKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const currentCount = existingKeys.length;

    // Check if limit would be exceeded
    if (currentCount >= limit) {
      // Use same tier upgrade path as checkResourceLimit
      const tierNames: Record<string, string> = {
        free: "Starter (€199/month)",
        starter: "Professional (€399/month)",
        professional: "Agency (€599/month)",
        agency: "Enterprise (€1,500+/month)",
        enterprise: "Enterprise (contact sales)",
      };
      const nextTier = tierNames[license.planTier] || "a higher tier";

      // Return error in same format as checkResourceLimit (will be thrown by caller)
      return {
        allowed: false,
        error: `You've reached your maxApiKeys limit (${limit}). ` +
          `Upgrade to ${nextTier} for more capacity.`,
      };
    }

    return { allowed: true };
  },
});

/**
 * INTERNAL: Check Websites Per Key Limit
 *
 * Checks if updating an API key's allowedDomains would exceed maxWebsitesPerKey limit.
 */
export const checkWebsitesPerKeyLimit = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    allowedDomains: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Import license helper
    const { getLicenseInternal } = await import("./licensing/helpers");

    const license = await getLicenseInternal(ctx, args.organizationId);
    const limit = license.limits.maxWebsitesPerKey;

    // If unlimited, return success
    if (limit === -1) {
      return { allowed: true };
    }

    const domainsCount = args.allowedDomains.length;

    // Check if limit would be exceeded
    if (domainsCount > limit) {
      // Use same tier upgrade path as checkResourceLimit
      const tierNames: Record<string, string> = {
        free: "Starter (€199/month)",
        starter: "Professional (€399/month)",
        professional: "Agency (€599/month)",
        agency: "Enterprise (€1,500+/month)",
        enterprise: "Enterprise (contact sales)",
      };
      const nextTier = tierNames[license.planTier] || "a higher tier";

      // Return error in same format as checkResourceLimit (will be thrown by caller)
      return {
        allowed: false,
        error: `You've reached your maxWebsitesPerKey limit (${limit}). ` +
          `Upgrade to ${nextTier} for more capacity.`,
      };
    }

    return { allowed: true };
  },
});
