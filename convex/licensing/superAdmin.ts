/**
 * SUPER ADMIN LICENSE MANAGEMENT
 *
 * Tools for super admins to manually manage organization licenses.
 * Allows setting tiers, custom limits, trial periods, and manual grants.
 *
 * Security: All functions require super_admin role with isGlobal = true.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthenticatedUser, getUserContext } from "../rbacHelpers";
import { TIER_CONFIGS } from "./tierConfigs";
import type { Id } from "../_generated/dataModel";

/**
 * SET ORGANIZATION LICENSE
 *
 * Super admin can set/update an organization's license tier.
 * This creates a new license and expires any existing active license.
 *
 * Use cases:
 * - Upgrade beta testers from free to paid
 * - Grant custom licenses with special limits
 * - Set trial periods
 * - Create custom enterprise deals
 */
export const setOrganizationLicense = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    planTier: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("starter"),
      v.literal("professional"),
      v.literal("agency"),
      v.literal("enterprise")
    ),
    priceInCents: v.optional(v.number()),
    billingCycle: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
    trialUntil: v.optional(v.number()),
    customLimits: v.optional(v.any()), // Partial<TierLimits>
    customFeatures: v.optional(v.any()), // Partial<TierFeatures>
    manualGrant: v.optional(
      v.object({
        reason: v.string(),
        invoiceManually: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check super admin permission
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin only");
    }

    // Get tier configuration
    const tierConfig = TIER_CONFIGS[args.planTier];

    // Calculate billing period
    const now = Date.now();
    const periodStart = now;
    const periodEnd =
      args.billingCycle === "annual"
        ? now + 365 * 24 * 60 * 60 * 1000 // 1 year
        : now + 30 * 24 * 60 * 60 * 1000; // 1 month

    // Expire any existing active license
    const existingLicense = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_license")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existingLicense) {
      await ctx.db.patch(existingLicense._id, {
        status: "expired",
        updatedAt: now,
      });
    }

    // Merge limits: tier defaults + custom limits
    const mergedLimits = {
      ...tierConfig.limits,
      ...(args.customLimits || {}),
    };

    // Merge features: tier defaults + custom features
    const mergedFeatures = {
      ...tierConfig.features,
      ...(args.customFeatures || {}),
    };

    // Create new license object
    const licenseId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "organization_license",
      subtype: "platform_tier",
      name: `${tierConfig.name} Plan`,
      description: tierConfig.description,
      status: args.trialUntil ? "trial" : "active",

      customProperties: {
        // Tier & Billing
        planTier: args.planTier,
        billingCycle: args.billingCycle || "monthly",
        priceInCents: args.priceInCents ?? tierConfig.priceInCents,
        currency: tierConfig.currency,

        // Limits & Features
        limits: mergedLimits,
        features: mergedFeatures,

        // Trial Period
        ...(args.trialUntil && {
          trialStart: now,
          trialEnd: args.trialUntil,
        }),

        // Manual Grant Tracking
        ...(args.manualGrant && {
          manualOverride: {
            granted: true,
            grantedBy: userId,
            grantedAt: now,
            reason: args.manualGrant.reason,
            invoiceManually: args.manualGrant.invoiceManually,
            customLimits: args.customLimits,
            customFeatures: args.customFeatures,
          },
        }),

        // Billing Period
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,

        // Version History
        version: existingLicense ? (existingLicense.customProperties?.version || 0) + 1 : 1,
        previousVersionId: existingLicense?._id,
        effectiveDate: now,
      },

      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Get organization name for response
    const org = await ctx.db.get(args.organizationId);

    return {
      success: true,
      licenseId,
      organizationName: org?.name,
      planTier: args.planTier,
      message: `License set to ${args.planTier} tier for ${org?.name}`,
    };
  },
});

/**
 * LIST ORGANIZATION LICENSES
 *
 * Super admin can view all organization licenses.
 * Useful for dashboard and management interface.
 */
export const listOrganizationLicenses = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")), // Filter by org
    planTier: v.optional(
      v.union(
        v.literal("free"),
        v.literal("pro"),
        v.literal("starter"),
        v.literal("professional"),
        v.literal("agency"),
        v.literal("enterprise")
      )
    ), // Filter by tier
    status: v.optional(
      v.union(v.literal("active"), v.literal("trial"), v.literal("expired"), v.literal("suspended"))
    ), // Filter by status
    limit: v.optional(v.number()), // Pagination
  },
  handler: async (ctx, args) => {
    // Check super admin permission
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin only");
    }

    // Build query
    let licenses;

    // Apply organization filter
    if (args.organizationId) {
      licenses = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId as Id<"organizations">).eq("type", "organization_license")
        )
        .collect();
    } else {
      licenses = await ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", "organization_license"))
        .collect();
    }

    // Apply additional filters
    if (args.planTier) {
      licenses = licenses.filter(
        (l) => l.customProperties && l.customProperties.planTier === args.planTier
      );
    }

    if (args.status) {
      licenses = licenses.filter((l) => l.status === args.status);
    }

    // Apply limit
    if (args.limit) {
      licenses = licenses.slice(0, args.limit);
    }

    // Enrich with organization details
    const enrichedLicenses = await Promise.all(
      licenses.map(async (license) => {
        const org = license.organizationId ? await ctx.db.get(license.organizationId) : null;
        const createdBy = license.createdBy ? await ctx.db.get(license.createdBy as Id<"users">) : null;

        return {
          ...license,
          organizationName: org?.name,
          organizationSlug: org?.slug,
          createdByName: createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : "System",
          createdByEmail: createdBy?.email,
        };
      })
    );

    return enrichedLicenses;
  },
});

/**
 * GET LICENSE HISTORY
 *
 * Super admin can view complete license history for an organization.
 * Shows all license changes including expired ones.
 */
export const getLicenseHistory = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check super admin permission
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin only");
    }

    // Get all licenses for this organization (active + expired)
    const licenses = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_license")
      )
      .order("desc") // Most recent first
      .collect();

    // Enrich with user details
    const enrichedLicenses = await Promise.all(
      licenses.map(async (license) => {
        const createdBy = license.createdBy ? await ctx.db.get(license.createdBy as Id<"users">) : null;

        return {
          ...license,
          createdByName: createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : "System",
          createdByEmail: createdBy?.email,
        };
      })
    );

    return enrichedLicenses;
  },
});

/**
 * UPDATE LICENSE LIMITS
 *
 * Super admin can update specific limits without changing the tier.
 * Useful for one-off limit increases for customer success.
 */
export const updateLicenseLimits = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    customLimits: v.any(), // Partial<TierLimits>
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // Check super admin permission
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin only");
    }

    // Get current active license
    const currentLicense = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_license")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!currentLicense || !currentLicense.customProperties) {
      throw new Error("No active license found");
    }

    // Update custom properties
    const updatedCustomProps = {
      ...currentLicense.customProperties,
      limits: {
        ...currentLicense.customProperties.limits,
        ...args.customLimits,
      },
      manualOverride: {
        ...(currentLicense.customProperties.manualOverride || {}),
        granted: true,
        grantedBy: userId,
        grantedAt: Date.now(),
        reason: args.reason,
        customLimits: {
          ...(currentLicense.customProperties.manualOverride?.customLimits || {}),
          ...args.customLimits,
        },
      },
      version: (currentLicense.customProperties.version || 1) + 1,
    };

    // Update license
    await ctx.db.patch(currentLicense._id, {
      customProperties: updatedCustomProps,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "License limits updated",
    };
  },
});

/**
 * EXTEND TRIAL PERIOD
 *
 * Super admin can extend a trial period.
 */
export const extendTrialPeriod = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    newTrialEnd: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // Check super admin permission
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin only");
    }

    // Get current active license
    const currentLicense = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_license")
      )
      .filter((q) => q.eq(q.field("status"), "trial"))
      .first();

    if (!currentLicense || !currentLicense.customProperties) {
      throw new Error("No active trial found");
    }

    // Update trial end
    const updatedCustomProps = {
      ...currentLicense.customProperties,
      trialEnd: args.newTrialEnd,
      version: (currentLicense.customProperties.version || 1) + 1,
    };

    await ctx.db.patch(currentLicense._id, {
      customProperties: updatedCustomProps,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Trial extended until ${new Date(args.newTrialEnd).toLocaleDateString()}`,
    };
  },
});

/**
 * GET LICENSE STATS (Dashboard)
 *
 * Super admin dashboard showing distribution of licenses.
 */
export const getLicenseStats = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check super admin permission
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin only");
    }

    // Get all active licenses
    const activeLicenses = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "organization_license"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Count by tier
    const tierCounts = {
      free: 0,
      pro: 0,
      agency: 0,
      enterprise: 0,
    };

    const legacyTierCounts = {
      starter: 0,
      professional: 0,
    };

    let manualGrants = 0;
    let trials = 0;

    activeLicenses.forEach((license) => {
      if (license.customProperties) {
        const tier = license.customProperties.planTier as string;
        if (tier === "starter" || tier === "professional") {
          legacyTierCounts[tier]++;
          tierCounts.pro++;
        } else if (tier === "free" || tier === "pro" || tier === "agency" || tier === "enterprise") {
          tierCounts[tier]++;
        } else {
          tierCounts.free++;
        }

        if (license.customProperties.manualOverride) {
          manualGrants++;
        }

        if (license.status === "trial") {
          trials++;
        }
      }
    });

    return {
      total: activeLicenses.length,
      byTier: tierCounts,
      legacyCompatibilityByTier: legacyTierCounts,
      manualGrants,
      trials,
    };
  },
});
