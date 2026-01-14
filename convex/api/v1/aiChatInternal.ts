/**
 * AI Chat Internal Functions
 *
 * Internal queries and mutations for AI Chat HTTP API.
 * These are not exposed publicly and are used by the HTTP handlers.
 */

import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

/**
 * Validate a session and return user context
 *
 * Used by HTTP handlers to authenticate requests.
 * Returns null if session is invalid or expired.
 *
 * Session schema (from coreSchemas.ts):
 * - userId: Id<"users"> (REQUIRED)
 * - email: string
 * - organizationId: Id<"organizations"> (REQUIRED)
 * - createdAt: number
 * - expiresAt: number
 */
export const validateSession = internalQuery({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args): Promise<{
    userId: Id<"users">;
    organizationId: Id<"organizations">;
  } | null> => {
    // Get the session
    const session = await ctx.db.get(args.sessionId);

    if (!session) {
      console.log("[AI Chat Internal] Session not found:", args.sessionId);
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      console.log("[AI Chat Internal] Session expired:", args.sessionId);
      return null;
    }

    // Session schema requires both userId and organizationId
    return {
      userId: session.userId,
      organizationId: session.organizationId,
    };
  },
});

/**
 * Get organization details by ID
 *
 * Used by switchOrganization HTTP handler to return org info after switching.
 */
export const getOrganization = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) return null;
    return {
      _id: org._id,
      name: org.name,
      slug: org.slug,
    };
  },
});
