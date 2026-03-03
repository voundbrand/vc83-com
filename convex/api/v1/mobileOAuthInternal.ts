/**
 * Mobile OAuth Internal Functions
 *
 * Internal queries and mutations for mobile OAuth authentication.
 * These are used by the mobileOAuth.ts HTTP handler.
 */

import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";

/**
 * Get User Profile for Mobile Response
 *
 * Returns the full user profile needed for the mobile OAuth response.
 */
export const getUserProfileForMobile = internalQuery({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    // Get user's organizations with roles
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        const role = await ctx.db.get(membership.role);
        if (!org || !org.isActive) return null;
        return {
          id: org._id,
          name: org.name,
          slug: org.slug,
          role: role?.name || "member",
        };
      })
    );

    const validOrganizations = organizations.filter(
      (org): org is NonNullable<typeof org> => org !== null
    );

    // Find current organization
    const currentOrg = validOrganizations.find(
      (org) => org.id === args.organizationId
    ) || validOrganizations[0];

    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isPasswordSet: user.isPasswordSet || false,
      betaAccessStatus: user.betaAccessStatus || "none",
      organizations: validOrganizations,
      currentOrganization: currentOrg
        ? {
            id: currentOrg.id,
            name: currentOrg.name,
            slug: currentOrg.slug,
          }
        : null,
    };
  },
});

/**
 * Get Organization By ID
 *
 * Returns organization details for the mobile OAuth response.
 */
export const getOrganizationById = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});

/**
 * Determine whether pending-beta notification emails should be re-sent for a user.
 * Uses auditLogs action cooldown to avoid repeated sends on each login attempt.
 */
export const shouldNotifyPendingBetaAccess = internalQuery({
  args: {
    userId: v.id("users"),
    cooldownMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return {
        shouldNotify: false,
        user: null,
      };
    }

    if (user.betaAccessStatus !== "pending") {
      return {
        shouldNotify: false,
        user,
      };
    }

    const cooldownMs = Math.max(0, args.cooldownMs ?? 6 * 60 * 60 * 1000);
    const cutoff = Date.now() - cooldownMs;
    const recentNotificationLog = await ctx.db
      .query("auditLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("action"), "mobile_oauth_pending_beta_notification_sent"),
          q.gte(q.field("createdAt"), cutoff)
        )
      )
      .first();

    return {
      shouldNotify: !recentNotificationLog,
      user,
    };
  },
});
