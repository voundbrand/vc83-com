/**
 * ORGANIZATION API SETTINGS
 *
 * Manages API key availability settings for organizations.
 * Super admins can enable/disable API key generation for each organization.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext } from "./rbacHelpers";
import { Id } from "./_generated/dataModel";

/**
 * GET API SETTINGS FOR ORGANIZATION
 * Returns whether API keys are enabled for an organization
 */
export const getApiSettings = query({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get organization_settings with subtype "api"
    const apiSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_settings")
      )
      .filter(q => q.eq(q.field("subtype"), "api"))
      .first();

    return {
      apiKeysEnabled: apiSettings?.customProperties?.apiKeysEnabled ?? false,
    };
  },
});

/**
 * GET API SETTINGS FOR ALL ORGANIZATIONS (Super Admin Only)
 * Returns API settings for all organizations
 */
export const getAllApiSettings = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can view all organization API settings
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Not authorized: Only super admins can view API settings for all organizations");
    }

    // Get all organizations
    const organizations = await ctx.db.query("organizations").collect();

    // Get API settings for each organization
    const settingsMap = new Map<Id<"organizations">, boolean>();

    for (const org of organizations) {
      const apiSettings = await ctx.db
        .query("objects")
        .withIndex("by_org_type", q =>
          q.eq("organizationId", org._id)
           .eq("type", "organization_settings")
        )
        .filter(q => q.eq(q.field("subtype"), "api"))
        .first();

      settingsMap.set(org._id, apiSettings?.customProperties?.apiKeysEnabled ?? false);
    }

    return Object.fromEntries(settingsMap);
  },
});

/**
 * TOGGLE API KEYS FOR ORGANIZATION (Super Admin Only)
 * Enables or disables API key generation for an organization
 */
export const toggleApiKeys = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can toggle API key access
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Not authorized: Only super admins can manage API key access");
    }

    // Get or create organization_settings with subtype "api"
    const apiSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_settings")
      )
      .filter(q => q.eq(q.field("subtype"), "api"))
      .first();

    const now = Date.now();

    if (apiSettings) {
      // Update existing settings
      await ctx.db.patch(apiSettings._id, {
        customProperties: {
          ...apiSettings.customProperties,
          apiKeysEnabled: args.enabled,
        },
        updatedAt: now,
      });
    } else {
      // Create new API settings object
      await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "organization_settings",
        subtype: "api",
        name: "API Settings",
        status: "active",
        customProperties: {
          apiKeysEnabled: args.enabled,
        },
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, enabled: args.enabled };
  },
});
