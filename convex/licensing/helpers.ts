/**
 * LICENSE HELPER FUNCTIONS
 *
 * Core utilities for checking organization licenses, limits, and feature access.
 * Used throughout the platform to enforce tier restrictions.
 *
 * Usage:
 * - Call getLicense() to get current license for an organization
 * - Call checkResourceLimit() before creating resources (contacts, projects, etc.)
 * - Call checkFeatureAccess() before allowing premium features
 */

import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { TIER_CONFIGS, type TierConfig } from "./tierConfigs";

/**
 * GET ORGANIZATION LICENSE
 *
 * Returns the active license for an organization.
 * If no license exists, returns default free tier configuration.
 *
 * This is the primary function for checking what an organization can do.
 */
export const getLicense = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await getLicenseInternal(ctx, args.organizationId);
  },
});

/**
 * INTERNAL: Get License
 *
 * Internal version that can be called from mutations and actions.
 * Returns resolved license with all limits and features.
 */
export async function getLicenseInternal(
  ctx: QueryCtx,
  organizationId: Id<"organizations">
) {
  // Query for active license in objects table
  const licenseObject = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "organization_license")
    )
    .filter((q) => q.eq(q.field("status"), "active"))
    .first();

  // If no license exists, return free tier defaults
  if (!licenseObject || !licenseObject.customProperties) {
    return {
      exists: false,
      licenseId: null,
      planTier: "free" as const,
      status: "active" as const,
      ...TIER_CONFIGS.free,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      trialEnd: null,
      manualOverride: null,
    };
  }

  // Extract plan tier from custom properties (with type assertion since we checked above)
  const customProps = licenseObject.customProperties as {
    planTier: "free" | "starter" | "professional" | "agency" | "enterprise";
    priceInCents?: number;
    currency?: string;
    limits?: Partial<TierConfig["limits"]>;
    features?: Partial<TierConfig["features"]>;
    currentPeriodStart?: number;
    currentPeriodEnd?: number;
    trialEnd?: number;
    manualOverride?: {
      customLimits?: Partial<TierConfig["limits"]>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };

  const planTier = customProps.planTier;
  const tierConfig = TIER_CONFIGS[planTier];

  // Merge limits: tier defaults → custom limits → manual override limits
  const limits = {
    ...tierConfig.limits,
    ...(customProps.limits || {}),
    ...(customProps.manualOverride?.customLimits || {}),
  };

  // Merge features: tier defaults → custom features
  const features = {
    ...tierConfig.features,
    ...(customProps.features || {}),
  };

  return {
    exists: true,
    licenseId: licenseObject._id,
    planTier,
    status: licenseObject.status as "active" | "trial" | "expired" | "suspended",
    name: tierConfig.name,
    description: tierConfig.description,
    priceInCents: customProps.priceInCents || tierConfig.priceInCents,
    currency: customProps.currency || tierConfig.currency,
    supportLevel: tierConfig.supportLevel,
    limits,
    features,
    currentPeriodStart: customProps.currentPeriodStart || null,
    currentPeriodEnd: customProps.currentPeriodEnd || null,
    trialEnd: customProps.trialEnd || null,
    manualOverride: customProps.manualOverride || null,
  };
}

/**
 * CHECK RESOURCE LIMIT (Internal Helper)
 *
 * Checks if creating a new resource would exceed the organization's limit.
 * Throws an error if limit would be exceeded.
 *
 * @param ctx - Query/Mutation context
 * @param organizationId - Organization ID
 * @param resourceType - Ontology type to count (e.g., "crm_contact", "project")
 * @param limitKey - Key in limits object (e.g., "maxContacts", "maxProjects")
 * @returns Object with currentCount, limit, and remaining
 * @throws Error if limit exceeded
 */
export async function checkResourceLimit(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  resourceType: string,
  limitKey: keyof TierConfig["limits"]
): Promise<{
  currentCount: number;
  limit: number;
  remaining: number;
}> {
  // Get license
  const license = await getLicenseInternal(ctx, organizationId);

  // Get limit (-1 means unlimited)
  const limit = license.limits[limitKey];

  // If unlimited, skip counting
  if (limit === -1) {
    return {
      currentCount: 0,
      limit: -1,
      remaining: -1,
    };
  }

  // Count current resources in objects table
  const resources = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", resourceType)
    )
    .collect();

  const currentCount = resources.length;

  // Check if limit exceeded
  if (currentCount >= limit) {
    throw new Error(
      `You've reached your ${limitKey} limit (${limit}). ` +
        `Upgrade to ${getNextTier(license.planTier)} for more capacity.`
    );
  }

  return {
    currentCount,
    limit,
    remaining: limit - currentCount,
  };
}

/**
 * CHECK MONTHLY RESOURCE LIMIT (Internal Helper)
 *
 * Similar to checkResourceLimit but for monthly limits (e.g., invoices, emails).
 * Counts resources created within the current calendar month.
 *
 * @param ctx - Query/Mutation context
 * @param organizationId - Organization ID
 * @param resourceType - Ontology type to count
 * @param limitKey - Key in limits object (e.g., "maxInvoicesPerMonth")
 * @returns Object with currentCount, limit, and remaining
 * @throws Error if limit exceeded
 */
export async function checkMonthlyResourceLimit(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  resourceType: string,
  limitKey: keyof TierConfig["limits"]
): Promise<{
  currentCount: number;
  limit: number;
  remaining: number;
}> {
  // Get license
  const license = await getLicenseInternal(ctx, organizationId);

  // Get limit (-1 means unlimited)
  const limit = license.limits[limitKey];

  // If unlimited, skip counting
  if (limit === -1) {
    return {
      currentCount: 0,
      limit: -1,
      remaining: -1,
    };
  }

  // Calculate start of current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Count resources created this month
  const resources = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", resourceType)
    )
    .filter((q) => q.gte(q.field("createdAt"), monthStart))
    .collect();

  const currentCount = resources.length;

  // Check if limit exceeded
  if (currentCount >= limit) {
    throw new Error(
      `You've reached your monthly ${limitKey} limit (${limit}). ` +
        `Upgrade to ${getNextTier(license.planTier)} or wait until next month.`
    );
  }

  return {
    currentCount,
    limit,
    remaining: limit - currentCount,
  };
}

/**
 * CHECK FEATURE ACCESS (Internal Helper)
 *
 * Checks if an organization has access to a specific feature.
 * Throws an error if feature is not enabled for their tier.
 *
 * @param ctx - Query/Mutation context
 * @param organizationId - Organization ID
 * @param featureKey - Key in features object (e.g., "aiEnabled", "customDomainsEnabled")
 * @throws Error if feature not enabled
 */
export async function checkFeatureAccess(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  featureKey: keyof TierConfig["features"]
): Promise<void> {
  // Get license
  const license = await getLicenseInternal(ctx, organizationId);

  // Check feature flag
  const hasAccess = license.features[featureKey];

  if (!hasAccess) {
    throw new Error(
      `This feature requires ${getFeatureRequiredTier(featureKey)}. ` +
        `Current tier: ${license.planTier}. Upgrade to unlock this feature.`
    );
  }
}

/**
 * CHECK FEATURE ACCESS (Public Query)
 *
 * Public query version of checkFeatureAccess that can be called from actions.
 * Throws error if feature not available.
 */
export const checkFeatureAccessQuery = query({
  args: {
    organizationId: v.id("organizations"),
    featureName: v.string(),
  },
  handler: async (ctx, args) => {
    await checkFeatureAccess(
      ctx,
      args.organizationId,
      args.featureName as keyof TierConfig["features"]
    );
    return { success: true };
  },
});

/**
 * GET RESOURCE COUNT (Query)
 *
 * Public query to get current resource count for usage dashboards.
 * Returns count and limit for a specific resource type.
 */
export const getResourceCount = query({
  args: {
    organizationId: v.id("organizations"),
    resourceType: v.string(),
    limitKey: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await getLicenseInternal(ctx, args.organizationId);
    const limit = license.limits[args.limitKey as keyof TierConfig["limits"]];

    // Count resources
    const resources = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", args.resourceType)
      )
      .collect();

    const currentCount = resources.length;

    return {
      currentCount,
      limit,
      remaining: limit === -1 ? -1 : Math.max(0, limit - currentCount),
      percentUsed: limit === -1 ? 0 : Math.round((currentCount / limit) * 100),
      isUnlimited: limit === -1,
    };
  },
});

/**
 * GET MONTHLY RESOURCE COUNT (Query)
 *
 * Public query to get current month's resource count for usage dashboards.
 */
export const getMonthlyResourceCount = query({
  args: {
    organizationId: v.id("organizations"),
    resourceType: v.string(),
    limitKey: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await getLicenseInternal(ctx, args.organizationId);
    const limit = license.limits[args.limitKey as keyof TierConfig["limits"]];

    // Calculate start of current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // Count resources this month
    const resources = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", args.resourceType)
      )
      .filter((q) => q.gte(q.field("createdAt"), monthStart))
      .collect();

    const currentCount = resources.length;

    return {
      currentCount,
      limit,
      remaining: limit === -1 ? -1 : Math.max(0, limit - currentCount),
      percentUsed: limit === -1 ? 0 : Math.round((currentCount / limit) * 100),
      isUnlimited: limit === -1,
      monthStart,
    };
  },
});

/**
 * GET ALL USAGE STATS (Query)
 *
 * Returns comprehensive usage statistics for an organization.
 * Used for usage dashboards and upgrade prompts.
 */
export const getAllUsageStats = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const license = await getLicenseInternal(ctx, args.organizationId);

    // Helper to count resources
    const countResources = async (type: string) => {
      const resources = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .collect();
      return resources.length;
    };

    // Helper to count monthly resources
    const countMonthlyResources = async (type: string) => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const resources = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .filter((q) => q.gte(q.field("createdAt"), monthStart))
        .collect();
      return resources.length;
    };

    // Count all resources in parallel
    const [
      contactsCount,
      organizationsCount,
      projectsCount,
      eventsCount,
      productsCount,
      formsCount,
      pagesCount,
      workflowsCount,
      certificatesCount,
      invoicesThisMonth,
    ] = await Promise.all([
      countResources("crm_contact"),
      countResources("crm_organization"),
      countResources("project"),
      countResources("event"),
      countResources("product"),
      countResources("form"),
      countResources("published_page"),
      countResources("workflow"),
      countResources("certificate"),
      countMonthlyResources("invoice"),
    ]);

    // Build usage object
    const usage = {
      contacts: {
        current: contactsCount,
        limit: license.limits.maxContacts,
        percentUsed:
          license.limits.maxContacts === -1
            ? 0
            : Math.round((contactsCount / license.limits.maxContacts) * 100),
      },
      organizations: {
        current: organizationsCount,
        limit: license.limits.maxOrganizations,
        percentUsed:
          license.limits.maxOrganizations === -1
            ? 0
            : Math.round((organizationsCount / license.limits.maxOrganizations) * 100),
      },
      projects: {
        current: projectsCount,
        limit: license.limits.maxProjects,
        percentUsed:
          license.limits.maxProjects === -1
            ? 0
            : Math.round((projectsCount / license.limits.maxProjects) * 100),
      },
      events: {
        current: eventsCount,
        limit: license.limits.maxEvents,
        percentUsed:
          license.limits.maxEvents === -1
            ? 0
            : Math.round((eventsCount / license.limits.maxEvents) * 100),
      },
      products: {
        current: productsCount,
        limit: license.limits.maxProducts,
        percentUsed:
          license.limits.maxProducts === -1
            ? 0
            : Math.round((productsCount / license.limits.maxProducts) * 100),
      },
      forms: {
        current: formsCount,
        limit: license.limits.maxForms,
        percentUsed:
          license.limits.maxForms === -1
            ? 0
            : Math.round((formsCount / license.limits.maxForms) * 100),
      },
      pages: {
        current: pagesCount,
        limit: license.limits.maxPages,
        percentUsed:
          license.limits.maxPages === -1
            ? 0
            : Math.round((pagesCount / license.limits.maxPages) * 100),
      },
      workflows: {
        current: workflowsCount,
        limit: license.limits.maxWorkflows,
        percentUsed:
          license.limits.maxWorkflows === -1
            ? 0
            : Math.round((workflowsCount / license.limits.maxWorkflows) * 100),
      },
      certificates: {
        current: certificatesCount,
        limit: license.limits.maxCertificates,
        percentUsed:
          license.limits.maxCertificates === -1
            ? 0
            : Math.round((certificatesCount / license.limits.maxCertificates) * 100),
      },
      invoicesThisMonth: {
        current: invoicesThisMonth,
        limit: license.limits.maxInvoicesPerMonth,
        percentUsed:
          license.limits.maxInvoicesPerMonth === -1
            ? 0
            : Math.round((invoicesThisMonth / license.limits.maxInvoicesPerMonth) * 100),
      },
    };

    // Find resources approaching limits (>75%)
    const approachingLimits = Object.entries(usage)
      .filter(([_, stat]) => stat.percentUsed >= 75 && stat.limit !== -1)
      .map(([resource, stat]) => ({
        resource,
        ...stat,
      }));

    return {
      license: {
        planTier: license.planTier,
        status: license.status,
        name: license.name,
      },
      usage,
      approachingLimits,
      hasUnlimitedResources: Object.values(usage).some((stat) => stat.limit === -1),
    };
  },
});

/**
 * INTERNAL QUERY: Get License (for other mutations/actions)
 */
export const getLicenseInternalQuery = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await getLicenseInternal(ctx, args.organizationId);
  },
});

/**
 * INTERNAL QUERY: Check Feature Access (for actions)
 *
 * Similar to checkFeatureAccess but can be called from actions.
 * Throws if feature is not enabled.
 */
export const checkFeatureAccessInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    featureFlag: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await getLicenseInternal(ctx, args.organizationId);
    const featureKey = args.featureFlag as keyof TierConfig["features"];
    const hasAccess = license.features[featureKey];

    if (!hasAccess) {
      throw new Error(
        `This feature requires ${getFeatureRequiredTier(featureKey)}. ` +
          `Current tier: ${license.planTier}. Upgrade to unlock this feature.`
      );
    }
  },
});

/**
 * CHECK SYSTEM TEMPLATE ACCESS (Internal Helper)
 *
 * Checks if an organization can access/deploy system templates.
 * System templates are pre-built templates like Freelancer Portal that
 * organizations can deploy to their own infrastructure.
 *
 * Free tier: 1 system template (Freelancer Portal)
 * Paid tiers: Unlimited system templates
 *
 * @param ctx - Query/Mutation context
 * @param organizationId - Organization ID
 * @returns Object with canAccess, currentCount, limit, remaining
 * @throws Error if limit exceeded
 */
export async function checkSystemTemplateAccess(
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<{
  canAccess: boolean;
  templateSetsEnabled: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
}> {
  // Get license
  const license = await getLicenseInternal(ctx, organizationId);

  // Check if template sets feature is enabled
  const templateSetsEnabled = license.features.templateSetsEnabled;

  if (!templateSetsEnabled) {
    return {
      canAccess: false,
      templateSetsEnabled: false,
      currentCount: 0,
      limit: 0,
      remaining: 0,
      isUnlimited: false,
    };
  }

  // Get limit (-1 means unlimited)
  const limit = license.limits.maxSystemTemplates;

  // If unlimited, skip counting
  if (limit === -1) {
    return {
      canAccess: true,
      templateSetsEnabled: true,
      currentCount: 0,
      limit: -1,
      remaining: -1,
      isUnlimited: true,
    };
  }

  // Count deployed system templates
  const deployedTemplates = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "deployed_system_template")
    )
    .collect();

  const currentCount = deployedTemplates.length;
  const remaining = limit - currentCount;

  return {
    canAccess: remaining > 0,
    templateSetsEnabled: true,
    currentCount,
    limit,
    remaining,
    isUnlimited: false,
  };
}

/**
 * CHECK SYSTEM TEMPLATE ACCESS (Public Query)
 *
 * Public query version for UI to check template access before showing deploy options.
 */
export const checkSystemTemplateAccessQuery = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await checkSystemTemplateAccess(ctx, args.organizationId);
  },
});

/**
 * INTERNAL QUERY: Check System Template Access
 *
 * For use in mutations and actions that need to verify template access.
 */
export const checkSystemTemplateAccessInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await checkSystemTemplateAccess(ctx, args.organizationId);
  },
});

/**
 * HELPER FUNCTIONS
 */

/**
 * Get next tier name for upgrade prompts
 */
function getNextTier(
  currentTier: "free" | "starter" | "professional" | "agency" | "enterprise"
): string {
  const tierUpgradePath: Record<string, string> = {
    free: "Starter (€199/month)",
    starter: "Professional (€399/month)",
    professional: "Agency (€599/month)",
    agency: "Enterprise (€1,500+/month)",
    enterprise: "Enterprise (contact sales)",
  };

  return tierUpgradePath[currentTier] || "a higher tier";
}

/**
 * Get minimum tier required for a feature
 */
function getFeatureRequiredTier(featureKey: keyof TierConfig["features"]): string {
  // Map features to minimum required tier
  const featureTierMap: Partial<Record<keyof TierConfig["features"], string>> = {
    // Starter tier features
    aiEnabled: "Starter (€199/month)",
    stripeConnectEnabled: "Starter (€199/month)",
    invoicePaymentEnabled: "Starter (€199/month)",
    manualPaymentEnabled: "Starter (€199/month)",
    multiLanguageEnabled: "Starter (€199/month)",
    stripeTaxEnabled: "Starter (€199/month)",

    // Professional tier features
    customDomainsEnabled: "Professional (€399/month)",
    whiteLabelEnabled: "Professional (€399/month)",
    contactSyncEnabled: "Professional (€399/month)",
    advancedReportsEnabled: "Professional (€399/month)",
    customRolesEnabled: "Professional (€399/month)",
    templateSetOverridesEnabled: "Professional (€399/month)",

    // Agency tier features
    subOrgsEnabled: "Agency (€599/month)",
    templateSharingEnabled: "Agency (€599/month)",

    // Enterprise tier features
    ssoEnabled: "Enterprise (€1,500+/month)",
  };

  return featureTierMap[featureKey] || "a higher tier";
}

/**
 * GET DETAILED USAGE COUNTS (Query)
 *
 * Returns detailed counts for all resource types not covered by getAllUsageStats.
 * Used by the license overview UI to show accurate current usage.
 */
export const getDetailedUsageCounts = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Helper to count resources by type
    const countByType = async (type: string) => {
      const resources = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .collect();
      return resources.length;
    };

    // Helper to count monthly resources
    const countMonthlyByType = async (type: string) => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const resources = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .filter((q) => q.gte(q.field("createdAt"), monthStart))
        .collect();
      return resources.length;
    };

    // Count users (organization members)
    const usersCount = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect()
      .then((members) => members.length);

    // Count API keys
    const apiKeysCount = await ctx.db
      .query("apiKeys")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect()
      .then((keys) => keys.length);

    // Count sub-organizations (not implemented yet - organizations don't have parent field)
    const subOrganizationsCount = 0;

    // Count custom domains
    const customDomainsCount = await countByType("domain_config");

    // Count pipelines
    const pipelinesCount = await countByType("crm_pipeline");

    // Count emails sent this month
    const emailsThisMonthCount = await countMonthlyByType("email_campaign");

    // Count milestones
    const milestonesCount = await countByType("project_milestone");

    // Count tasks
    const tasksCount = await countByType("project_task");

    // Count attendees
    const attendeesCount = await countByType("event_attendee");

    // Count sponsors
    const sponsorsCount = await countByType("event_sponsor");

    // Count product addons
    const addonsCount = await countByType("product_addon");

    // Count checkout instances
    const checkoutInstancesCount = await countByType("checkout_instance");

    // Count form responses
    const formResponsesCount = await countByType("form_response");

    // Count workflow behaviors
    const behaviorsCount = await countByType("workflow_behavior");

    // Count custom templates
    const customTemplatesCount = await countByType("custom_template");

    // Count languages
    const languagesCount = await countByType("translation_language");

    // Count websites configured for API keys
    const websitesCount = await countByType("api_key_website");

    // Count OAuth applications
    const oauthAppsCount = await ctx.db
      .query("oauthApplications")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect()
      .then((apps) => apps.length);

    // Count third-party integrations
    const integrationsCount = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect()
      .then((conns) => conns.length);

    // Count webhooks
    const webhooksCount = await countByType("webhook");

    // Get storage usage (in GB)
    const storageData = await ctx.db
      .query("organizationStorage")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();
    const storageUsedGB = storageData ? Math.round((storageData.totalSizeBytes / (1024 * 1024 * 1024)) * 100) / 100 : 0;

    // Get per-user storage (average)
    const perUserStorageUsedGB = usersCount > 0 ? Math.round((storageUsedGB / usersCount) * 100) / 100 : 0;

    return {
      usersCount,
      apiKeysCount,
      subOrganizationsCount,
      customDomainsCount,
      pipelinesCount,
      emailsThisMonthCount,
      milestonesCount,
      tasksCount,
      attendeesCount,
      sponsorsCount,
      addonsCount,
      checkoutInstancesCount,
      formResponsesCount,
      behaviorsCount,
      customTemplatesCount,
      storageUsedGB,
      perUserStorageUsedGB,
      languagesCount,
      websitesCount,
      oauthAppsCount,
      integrationsCount,
      webhooksCount,
    };
  },
});
