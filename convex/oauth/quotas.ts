/**
 * OAuth Application Quotas
 *
 * Queries to check quota usage and limits for OAuth applications.
 * Used by UI to show "2/3 custom apps" progress bars.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { ConvexError } from "convex/values";

/**
 * Get OAuth App Quota Usage for Organization
 *
 * Returns current usage and limits for both custom and third-party OAuth apps.
 * Useful for UI displays showing quota progress.
 *
 * @returns Quota information with usage counts and limits
 */
export const getOAuthQuotas = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Authentication: Must be authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Must be authenticated to view OAuth quotas",
      });
    }

    // Authorization: Must be member of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject as any).eq("organizationId", args.organizationId)
      )
      .first();

    if (!membership) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Must be an organization member to view quotas",
      });
    }

    // Get organization plan
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    // Get plan limits based on organization plan (using new tier names)
    const limits = {
      maxCustomOAuthApps: organization.plan === "free" ? 1 :
                          organization.plan === "starter" ? 2 :
                          organization.plan === "professional" ? 5 :
                          organization.plan === "agency" ? 10 : 999,
      maxThirdPartyIntegrations: organization.plan === "free" ? 0 :
                                 organization.plan === "starter" ? 5 :
                                 organization.plan === "professional" ? 20 : 999,
    };

    // Count current usage by app type
    const allApps = await ctx.db
      .query("oauthApplications")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const customApps = allApps.filter(app => app.appType === "custom");
    const thirdPartyApps = allApps.filter(app => app.appType === "third_party");

    // Calculate percentages
    const customPercentage = Math.floor((customApps.length / limits.maxCustomOAuthApps) * 100);
    const thirdPartyPercentage = limits.maxThirdPartyIntegrations === 999 ? 0 :
      Math.floor((thirdPartyApps.length / limits.maxThirdPartyIntegrations) * 100);

    return {
      plan: organization.plan,
      custom: {
        used: customApps.length,
        limit: limits.maxCustomOAuthApps,
        unlimited: limits.maxCustomOAuthApps === 999,
        percentage: customPercentage,
        canCreate: customApps.length < limits.maxCustomOAuthApps,
      },
      thirdParty: {
        used: thirdPartyApps.length,
        limit: limits.maxThirdPartyIntegrations,
        unlimited: limits.maxThirdPartyIntegrations === 999,
        percentage: thirdPartyPercentage,
        canCreate: thirdPartyApps.length < limits.maxThirdPartyIntegrations,
      },
      total: {
        used: allApps.length,
        limit: limits.maxCustomOAuthApps + limits.maxThirdPartyIntegrations,
      },
    };
  },
});

/**
 * Check if Organization Can Create OAuth App
 *
 * Quick check before showing "Create App" dialog.
 * Returns whether user can create more apps and what type.
 *
 * @param appType - Type of app to check ("custom" or "third_party")
 * @returns Whether the organization can create this type of app
 */
export const canCreateOAuthApp = query({
  args: {
    organizationId: v.id("organizations"),
    appType: v.union(v.literal("custom"), v.literal("third_party")),
  },
  handler: async (ctx, args) => {
    // Authentication: Must be authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { canCreate: false, reason: "Not authenticated" };
    }

    // Authorization: Must be member of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject as any).eq("organizationId", args.organizationId)
      )
      .first();

    if (!membership) {
      return { canCreate: false, reason: "Not a member of this organization" };
    }

    // Get organization plan
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      return { canCreate: false, reason: "Organization not found" };
    }

    // Get plan limits (using new tier names)
    const limits = {
      maxCustomOAuthApps: organization.plan === "free" ? 1 :
                          organization.plan === "starter" ? 2 :
                          organization.plan === "professional" ? 5 :
                          organization.plan === "agency" ? 10 : 999,
      maxThirdPartyIntegrations: organization.plan === "free" ? 0 :
                                 organization.plan === "starter" ? 5 :
                                 organization.plan === "professional" ? 20 : 999,
    };

    // Count existing apps of this type
    const existingApps = await ctx.db
      .query("oauthApplications")
      .withIndex("by_org_and_app_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("appType", args.appType)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const limit = args.appType === "custom" ?
      limits.maxCustomOAuthApps :
      limits.maxThirdPartyIntegrations;

    const canCreate = existingApps.length < limit;

    return {
      canCreate,
      used: existingApps.length,
      limit,
      unlimited: limit === 999,
      reason: canCreate ? null :
        `Limit reached (${existingApps.length}/${limit} ${args.appType} apps). Upgrade to ${organization.plan === "free" ? "Starter" : organization.plan === "starter" ? "Professional" : organization.plan === "professional" ? "Agency" : "Enterprise"} plan.`,
    };
  },
});
