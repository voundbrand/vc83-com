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

    // API keys are initialized to enabled during onboarding (per tierConfigs.ts)
    // Super admins can explicitly disable them via toggleApiKeys mutation
    return {
      apiKeysEnabled: apiSettings?.customProperties?.apiKeysEnabled ?? false,
    };
  },
});

/**
 * GET API SETTINGS FOR ALL ORGANIZATIONS (Super Admin Only)
 * Returns API settings rows for organizations that have explicit API settings.
 *
 * NOTE: This intentionally returns an array instead of an object map.
 * Convex limits object field counts (1024 max), which can be exceeded
 * when using organization IDs as object keys at scale.
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

    // Pull all API settings objects in one query and return rows.
    const apiSettingsObjects = await ctx.db
      .query("objects")
      .withIndex("by_type_subtype", (q) =>
        q.eq("type", "organization_settings").eq("subtype", "api")
      )
      .collect();

    // If duplicate settings rows exist for an org, keep the latest by updatedAt.
    const latestByOrg = new Map<
      Id<"organizations">,
      { organizationId: Id<"organizations">; apiKeysEnabled: boolean; updatedAt: number }
    >();

    for (const doc of apiSettingsObjects) {
      const customProperties = doc.customProperties as { apiKeysEnabled?: boolean } | undefined;
      const current = latestByOrg.get(doc.organizationId);
      if (current && current.updatedAt > doc.updatedAt) {
        continue;
      }

      latestByOrg.set(doc.organizationId, {
        organizationId: doc.organizationId,
        apiKeysEnabled: customProperties?.apiKeysEnabled ?? false,
        updatedAt: doc.updatedAt,
      });
    }

    return Array.from(latestByOrg.values()).map(({ organizationId, apiKeysEnabled }) => ({
      organizationId,
      apiKeysEnabled,
    }));
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
