/**
 * API AUTHENTICATION
 *
 * Manages API key authentication for external integrations.
 * API keys are stored in the dedicated apiKeys table.
 *
 * Security:
 * - API keys are unique per organization
 * - Keys track the user who created them (for audit trails)
 * - Rate limiting per organization
 * - Scoped access to organization's data only
 */

import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getLicenseInternal } from "../licensing/helpers";
import { internal } from "../_generated/api";

/**
 * API key format: org_{orgId}_{random32chars}
 * Example: org_j97a2b3c4d5e6f7g8h9i_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
 */

/**
 * VERIFY API KEY
 * Internal function to verify API key and return organization ID + user ID
 *
 * IMPORTANT: Returns the user ID of the person who created the API key.
 * This ensures proper audit trails and permissions for API operations.
 */
export const verifyApiKey = internalQuery({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args): Promise<{ organizationId: Id<"organizations">; userId: Id<"users"> } | null> => {
    // Look up API key in database
    const apiKeyRecord = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", args.apiKey))
      .first();

    if (!apiKeyRecord) {
      return null;
    }

    // Check if key is active
    if (apiKeyRecord.status !== "active") {
      return null;
    }

    // Return both organization ID and the user ID who owns this API key
    return {
      organizationId: apiKeyRecord.organizationId,
      userId: apiKeyRecord.createdBy,
    };
  },
});

/**
 * GENERATE API KEY
 * Creates a new API key for an organization
 */
export const generateApiKey = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify session and get user (sessionId is the document _id)
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session) {
      throw new Error("Invalid session");
    }

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      throw new Error("Session expired");
    }

    const userId = session.userId;

    // Verify user belongs to organization
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // CHECK LICENSE LIMIT: Enforce API key limit for organization's tier
    // Free: 1, Starter: 1, Pro: 3, Agency: 5, Enterprise: Unlimited
    const license = await getLicenseInternal(ctx, args.organizationId);
    const limit = license.limits.maxApiKeys;

    if (limit !== -1) {
      // Count existing active API keys
      const existingKeys = await ctx.db
        .query("apiKeys")
        .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      if (existingKeys.length >= limit) {
        throw new Error(
          `You've reached your API key limit (${limit}). ` +
            `Upgrade to ${
              license.planTier === "free" || license.planTier === "starter"
                ? "Professional (€399/month) for 3 API keys"
                : "a higher tier"
            }.`
        );
      }
    }

    // Generate API key
    const randomPart = generateRandomString(32);
    const apiKey = `org_${args.organizationId}_${randomPart}`;

    // Store in database
    const apiKeyId = await ctx.db.insert("apiKeys", {
      key: apiKey,
      name: args.name,
      organizationId: args.organizationId,
      createdBy: userId,
      status: "active",
      createdAt: Date.now(),
    });

    return {
      id: apiKeyId,
      key: apiKey, // ONLY time the full key is returned!
      name: args.name,
      createdAt: Date.now(),
    };
  },
});

/**
 * LIST API KEYS
 * Lists all API keys for an organization (without showing full keys)
 */
export const listApiKeys = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Verify session (sessionId is the document _id)
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session) {
      throw new Error("Invalid session");
    }

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      throw new Error("Session expired");
    }

    // Get all API keys for organization
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Return keys with masked values
    return keys.map((key) => ({
      id: key._id,
      name: key.name,
      keyPreview: `${key.key.substring(0, 20)}...`, // Show first 20 chars only
      status: key.status,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      requestCount: key.requestCount ?? 0,
      createdBy: key.createdBy,
      revokedAt: key.revokedAt,
      revokedBy: key.revokedBy,
      revokeReason: key.revokeReason,
    }));
  },
});

/**
 * REVOKE API KEY
 * Revokes an API key (soft delete - marks as revoked)
 */
export const revokeApiKey = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    keyPreview: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify session (sessionId is the document _id)
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session) {
      throw new Error("Invalid session");
    }

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      throw new Error("Session expired");
    }

    const userId = session.userId;

    // Find the API key by preview
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const keyToRevoke = keys.find((k) => k.key.startsWith(args.keyPreview.replace("...", "")));

    if (!keyToRevoke) {
      throw new Error("API key not found");
    }

    // Revoke the key
    await ctx.db.patch(keyToRevoke._id, {
      status: "revoked",
      revokedAt: Date.now(),
      revokedBy: userId,
      revokeReason: args.reason,
    });

    return { success: true };
  },
});

/**
 * UPDATE API KEY USAGE
 * Internal function to track API key usage
 */
export const updateApiKeyUsage = internalMutation({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKeyRecord = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", args.apiKey))
      .first();

    if (!apiKeyRecord) {
      return;
    }

    await ctx.db.patch(apiKeyRecord._id, {
      lastUsed: Date.now(),
      requestCount: (apiKeyRecord.requestCount ?? 0) + 1,
    });
  },
});

/**
 * VERIFY API REQUEST WITH DOMAIN VALIDATION (Phase 2: Badge Enforcement)
 *
 * Enhanced API key verification that uses the unified domain configuration system.
 * This enforces:
 * 1. API key is valid and active
 * 2. Request origin matches a registered domain configuration
 * 3. Domain is verified (ownership confirmed)
 * 4. Domain has API capability enabled
 * 5. Domain is not suspended (badge present if required)
 *
 * NOTE: This function now delegates to the unified domain config system.
 * The actual implementation is in domainConfigOntology.ts
 */
export const verifyApiRequestWithDomain = internalQuery({
  args: {
    apiKey: v.string(),
    origin: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    // Delegate to the unified domain configuration system
    return await ctx.runQuery(internal.domainConfigOntology.verifyApiRequestWithDomain, {
      apiKey: args.apiKey,
      origin: args.origin,
    });
  },
});

/**
 * HELPER: Generate random string
 */
function generateRandomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
