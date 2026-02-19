/**
 * Account Linking Internal Queries
 *
 * Internal queries used by the account linking HTTP endpoints.
 * These are separated to avoid TS2589 type depth issues with large schemas.
 */

import { internalQuery } from "../../_generated/server";
import type { Doc, Id } from "../../_generated/dataModel";
import { v } from "convex/values";

/**
 * Get user's default organization
 *
 * Returns the first organization the user is a member of.
 * Used when creating a session after account linking.
 */
export const getUserDefaultOrg = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Find the user's first organization membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!membership) {
      // User has no organization - this shouldn't happen for platform users
      // but handle gracefully
      return null;
    }

    return membership.organizationId;
  },
});

/**
 * Resolve and validate a platform session used by claim endpoint.
 */
export type PlatformSessionLookupResult =
  | { status: "invalid_session_id" }
  | { status: "invalid_or_expired" }
  | {
      status: "active";
      session: Doc<"sessions">;
    };

type PlatformSessionLookupDb = {
  normalizeId: (tableName: "sessions", id: string) => Id<"sessions"> | null;
  get: (id: Id<"sessions">) => Promise<Doc<"sessions"> | null>;
};

export async function resolvePlatformSessionForClaim(
  db: PlatformSessionLookupDb,
  sessionId: string,
  now = Date.now()
): Promise<PlatformSessionLookupResult> {
  const normalizedSessionId = db.normalizeId("sessions", sessionId);
  if (!normalizedSessionId) {
    return { status: "invalid_session_id" };
  }

  const session = await db.get(normalizedSessionId);
  if (!session || session.expiresAt < now) {
    return { status: "invalid_or_expired" };
  }

  return { status: "active", session };
}

export const getPlatformSession = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return resolvePlatformSessionForClaim(ctx.db, args.sessionId);
  },
});
