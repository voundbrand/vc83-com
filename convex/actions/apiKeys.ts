"use node";

/**
 * API KEY ACTIONS - Bcrypt Hashing Implementation
 *
 * This file implements production-grade API key generation and verification
 * using bcrypt hashing. API keys are generated in Actions (not mutations)
 * because bcrypt is an async operation that requires Node.js crypto.
 *
 * Security Model:
 * - Keys are hashed with bcrypt (12 rounds) before storage
 * - Format: sk_live_{32_random_bytes} or sk_test_{32_random_bytes}
 * - Lookup by prefix (first 12 chars) for performance
 * - Full hash verification with bcrypt.compare()
 * - Full keys are NEVER stored in database
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 1
 */

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import bcrypt from "bcryptjs";
import { Id } from "../_generated/dataModel";

/**
 * GENERATE API KEY ACTION
 *
 * Creates a new API key with proper bcrypt hashing.
 * This is an Action (not Mutation) because bcrypt.hash() is async.
 *
 * Security:
 * - Generates cryptographically secure random key
 * - Hashes with bcrypt (12 rounds = ~250ms, secure against brute force)
 * - Stores only hash + prefix (never plaintext)
 * - Returns full key ONCE (must be saved by user)
 *
 * @returns API key details including full key (shown ONCE only)
 */
export const generateApiKey = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    scopes: v.optional(v.array(v.string())), // Optional scopes, defaults to ["*"]
    type: v.optional(v.union(v.literal("simple"), v.literal("oauth"))), // Defaults to "simple"
  },
  handler: async (ctx, args): Promise<{
    id: Id<"apiKeys">;
    key: string;
    keyPrefix: string;
    name: string;
    scopes: string[];
    createdAt: number;
    warning: string;
  }> => {
    // 1. Verify session
    // @ts-expect-error - Deep type instantiation in Convex generated types
    const session: { valid: boolean; error?: string; userId?: Id<"users"> } = await ctx.runQuery(internal.apiKeysInternal.verifySession, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });

    if (!session.valid || !session.userId) {
      throw new Error(session.error || "Invalid session");
    }

    // 2. Check license limits
    const licenseCheck: { allowed: boolean; error?: string } = await ctx.runQuery(internal.apiKeysInternal.checkApiKeyLimit, {
      organizationId: args.organizationId,
    });

    if (!licenseCheck.allowed) {
      throw new Error(licenseCheck.error || "API key limit reached");
    }

    // 3. Generate cryptographically secure API key
    // Format: sk_live_{32_random_bytes} (Stripe style)
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const randomString = Array.from(randomBytes, byte =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    const fullKey = `sk_live_${randomString}`;
    const keyPrefix = fullKey.substring(0, 12); // "sk_live_4f3a"

    // 4. Hash with bcrypt (12 rounds)
    // This takes ~250ms but provides excellent security
    // Rainbow table attacks are impossible with bcrypt
    const keyHash = await bcrypt.hash(fullKey, 12);

    // 5. Store in database (via internal mutation)
    const apiKeyId: Id<"apiKeys"> = await ctx.runMutation(internal.apiKeysInternal.storeApiKey, {
      keyHash,
      keyPrefix,
      name: args.name,
      organizationId: args.organizationId,
      createdBy: session.userId,
      scopes: args.scopes || ["*"], // Default to full access for backward compatibility
      type: args.type || "simple",
    });

    // 6. Return full key (ONLY shown once!)
    return {
      id: apiKeyId,
      key: fullKey, // ⚠️ CRITICAL: Save this now! Never shown again!
      keyPrefix,
      name: args.name,
      scopes: args.scopes || ["*"],
      createdAt: Date.now(),
      warning: "⚠️ Save this key now - it won't be shown again!",
    };
  },
});

/**
 * VERIFY API KEY ACTION
 *
 * Verifies an API key using bcrypt comparison.
 * This is an INTERNAL Action because it's called by auth middleware.
 *
 * Performance:
 * - Prefix lookup is fast (indexed)
 * - bcrypt.compare() takes ~50ms (acceptable for auth)
 * - Total verification time: ~60ms
 *
 * @returns Authentication context or null if invalid
 */
export const verifyApiKey = internalAction({
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
    // 1. Validate key format
    if (!args.apiKey.startsWith("sk_live_") && !args.apiKey.startsWith("sk_test_")) {
      return null;
    }

    const keyPrefix = args.apiKey.substring(0, 12);

    // 2. Find by prefix (fast, indexed query)
    const apiKeyRecords: Array<{
      _id: Id<"apiKeys">;
      keyHash: string;
      organizationId: Id<"organizations">;
      createdBy: Id<"users">;
      scopes: string[];
      type: "simple" | "oauth";
      status: "active" | "revoked";
      expiresAt?: number;
      allowedDomains?: string[];
      allowedIPs?: string[];
    }> = await ctx.runQuery(internal.apiKeysInternal.findApiKeysByPrefix, {
      keyPrefix,
    });

    if (!apiKeyRecords || apiKeyRecords.length === 0) {
      return null;
    }

    // 3. Try bcrypt verification against each matching record
    // (Should be 0-1 results due to high entropy, but we loop for safety)
    for (const record of apiKeyRecords as typeof apiKeyRecords) {
      // Skip inactive keys
      if (record.status !== "active") {
        continue;
      }

      // Check expiration
      if (record.expiresAt && record.expiresAt < Date.now()) {
        continue;
      }

      // Verify hash with bcrypt (~50ms)
      const isValid = await bcrypt.compare(args.apiKey, record.keyHash);

      if (isValid) {
        // 4. Update last used timestamp (async, don't block response)
        ctx.scheduler.runAfter(0, internal.api.auth.updateApiKeyUsage, {
          apiKeyId: record._id,
        });

        // 5. Return authentication context
        return {
          organizationId: record.organizationId,
          userId: record.createdBy,
          scopes: record.scopes,
          type: record.type,
          allowedDomains: record.allowedDomains,
          allowedIPs: record.allowedIPs,
          apiKeyId: record._id,
        };
      }
    }

    // No matching hash found
    return null;
  },
});
