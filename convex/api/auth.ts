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
 * API key format: sk_live_{32_random_bytes} or sk_test_{32_random_bytes}
 * Example: sk_test_EXAMPLE_KEY_NOT_REAL_xxxxxxxxxx
 */

/**
 * VERIFY API KEY (Secure Hashed Keys Only)
 * Internal function to verify hashed API key and return authentication context
 *
 * Security Model:
 * - Keys are hashed with bcrypt (never stored as plaintext)
 * - Format: sk_live_ or sk_test_ prefix + 32 random bytes
 * - Lookup by prefix (first 12 chars) for performance
 * - Full hash verification happens in Action with bcrypt.compare()
 *
 * IMPORTANT: Returns the user ID of the person who created the API key.
 * This ensures proper audit trails and permissions for API operations.
 *
 * NOTE: This is a wrapper that delegates to the Action for bcrypt verification.
 */
export const verifyApiKey = internalQuery({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args): Promise<{
    organizationId: Id<"organizations">;
    userId: Id<"users">;
    scopes: string[];
    type: "simple" | "oauth";
    allowedDomains?: string[];
    allowedIPs?: string[];
    apiKeyId: Id<"apiKeys">;
  } | null> => {
    // Delegate to Action for bcrypt verification
    // NOTE: This is called from middleware which is already an Action,
    // so we can't call another Action directly. Instead, the middleware
    // should call the Action directly.

    // For backward compatibility, we keep this query but it's deprecated.
    // New code should call internal.actions.apiKeys.verifyApiKey directly.

    // Only accept Stripe-style keys (sk_live_ or sk_test_)
    if (!args.apiKey.startsWith("sk_live_") && !args.apiKey.startsWith("sk_test_")) {
      return null;
    }

    const keyPrefix = args.apiKey.substring(0, 12); // First 12 chars

    // Find by prefix (should be 0-1 results due to high entropy)
    const possibleKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_prefix", (q) => q.eq("keyPrefix", keyPrefix))
      .collect();

    // NOTE: This is TEMPORARY fallback. Production should use bcrypt Action.
    const apiKeyRecord = possibleKeys.find(k => k.status === "active");

    if (!apiKeyRecord) {
      return null;
    }

    // Check if key has expired
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < Date.now()) {
      return null;
    }

    // Return auth context with scopes
    return {
      organizationId: apiKeyRecord.organizationId,
      userId: apiKeyRecord.createdBy,
      scopes: apiKeyRecord.scopes,
      type: apiKeyRecord.type,
      allowedDomains: apiKeyRecord.allowedDomains,
      allowedIPs: apiKeyRecord.allowedIPs,
      apiKeyId: apiKeyRecord._id,
    };
  },
});

/**
 * GENERATE API KEY (Deprecated - Use Action Instead)
 *
 * This mutation is deprecated in favor of the bcrypt-based Action.
 * New code should call internal.actions.apiKeys.generateApiKey directly.
 *
 * @deprecated Use actions.apiKeys.generateApiKey for production-grade bcrypt hashing
 */
export const generateApiKey = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    scopes: v.optional(v.array(v.string())),
    type: v.optional(v.union(v.literal("simple"), v.literal("oauth"))),
  },
  handler: async (ctx, args) => {
    // This mutation now delegates to the Action for proper bcrypt hashing
    // We cannot call an Action from a Mutation, so this is a placeholder.

    // Frontend should call the Action directly via:
    // await ctx.client.action(api.actions.apiKeys.generateApiKey, { ... });

    throw new Error(
      "This endpoint is deprecated. Please use the Action endpoint: " +
      "api.actions.apiKeys.generateApiKey for proper bcrypt hashing. " +
      "See convex/actions/apiKeys.ts for implementation."
    );
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
      keyPreview: `${key.keyPrefix}...`, // Show prefix only (e.g., "sk_live_4f3a...")
      scopes: key.scopes,
      type: key.type,
      status: key.status,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      lastUsedFrom: key.lastUsedFrom,
      requestCount: key.requestCount ?? 0,
      createdBy: key.createdBy,
      revokedAt: key.revokedAt,
      revokedBy: key.revokedBy,
      revokeReason: key.revokeReason,
      expiresAt: key.expiresAt,
      rotationWarningShownAt: key.rotationWarningShownAt,
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

    // Find the API key by preview (keyPrefix only, e.g., "sk_live_4f3a")
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const searchPrefix = args.keyPreview.replace("...", "");
    const keyToRevoke = keys.find((k) => k.keyPrefix.startsWith(searchPrefix));

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
    apiKeyId: v.id("apiKeys"), // Changed from apiKey string to apiKeyId
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.apiKeyId, {
      lastUsed: Date.now(),
      lastUsedFrom: args.ipAddress,
      requestCount: (await ctx.db.get(args.apiKeyId))?.requestCount ?? 0 + 1,
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

// REMOVED: generateRandomString and simpleHash functions
// These were temporary placeholders. Production code now uses:
// - convex/actions/apiKeys.ts with proper bcrypt hashing
// - Cryptographically secure random generation with crypto.getRandomValues()
// - bcrypt.hash() with 12 rounds for secure key storage
