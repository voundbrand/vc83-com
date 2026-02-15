/**
 * AGENCY SUB-ORG BOOTSTRAP
 *
 * Orchestrates the creation of a client sub-org:
 * 1. Validate parent has agency/enterprise tier
 * 2. Create the organization under the parent
 * 3. Bootstrap a PM agent with soul generation
 * 4. Register Telegram deep link slug for routing
 */

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../_generated/api").internal;
  }
  return _apiCache;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _publicApiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPublicApi(): any {
  if (!_publicApiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _publicApiCache = require("../_generated/api").api;
  }
  return _publicApiCache;
}

/**
 * Full bootstrap pipeline for a client sub-org.
 * Called by the create_client_org tool.
 */
export const bootstrapClientOrg = internalAction({
  args: {
    parentOrganizationId: v.id("organizations"),
    businessName: v.string(),
    industry: v.string(),
    description: v.string(),
    targetAudience: v.string(),
    language: v.optional(v.string()),
    tonePreference: v.optional(v.string()),
    agentNameHint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Validate parent has sub-org capability
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parentLicense: any = await ctx.runQuery(
      getInternal().licensing.helpers.getLicenseInternalQuery,
      { organizationId: args.parentOrganizationId }
    );

    if (!parentLicense.features.subOrgsEnabled) {
      return {
        error: "Sub-organizations require Agency or Enterprise tier",
        upgradeRequired: true,
      };
    }

    // 2. Check sub-org limit
    const currentCount = await ctx.runQuery(
      getInternal().organizations.countSubOrganizations,
      { parentOrganizationId: args.parentOrganizationId }
    );
    const limit = parentLicense.limits.maxSubOrganizations;
    if (limit !== -1 && currentCount >= limit) {
      return {
        error: `Sub-org limit reached (${currentCount}/${limit}). Contact support or upgrade.`,
        currentCount,
        limit,
      };
    }

    // 3. Verify parent org exists
    const parent = await ctx.runQuery(
      getInternal().organizations.getOrgById,
      { organizationId: args.parentOrganizationId }
    );

    if (!parent) {
      return { error: "Parent organization not found" };
    }

    // 4. Generate slug from business name only (no parent prefix)
    const baseSlug = args.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

    // Ensure slug uniqueness — append counter if needed
    let slug = baseSlug;
    let attempt = 0;
    while (attempt < 10) {
      const existing = await ctx.runQuery(
        getInternal().organizations.getOrgBySlug,
        { slug }
      );
      if (!existing) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }
    if (attempt >= 10) {
      return { error: `Could not generate a unique slug for "${args.businessName}". Try a different name.` };
    }

    // 5. Create the sub-org
    const childOrgResult = await ctx.runMutation(
      getInternal().api.v1.subOrganizationsInternal.createChildOrganizationInternal,
      {
        parentOrganizationId: args.parentOrganizationId,
        name: args.businessName,
        slug,
        businessName: args.businessName,
      }
    );

    const childOrgId = childOrgResult.childOrganizationId;

    // 6. Add parent org owners as members of the child org
    //    so sub-orgs appear in the org switcher
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parentOwners: any[] = await ctx.runQuery(
      getInternal().onboarding.agencySubOrgBootstrap.getOrgOwnerUserIds,
      { organizationId: args.parentOrganizationId }
    );
    for (const ownerId of parentOwners) {
      try {
        await ctx.runMutation(
          getInternal().organizations.addCreatorAsOwner,
          { userId: ownerId, organizationId: childOrgId }
        );
      } catch {
        // Non-fatal — owner may already be a member
      }
    }

    // 7. Assign all apps to the new sub-org
    if (parentOwners.length > 0) {
      try {
        await ctx.runMutation(
          getInternal().onboarding.assignAllAppsToOrg,
          { organizationId: childOrgId, userId: parentOwners[0] }
        );
      } catch {
        // Non-fatal
      }
    }

    // 8. Bootstrap PM agent for sub-org (creates agent + generates soul + activates)
    const agentName = args.agentNameHint || `${args.businessName} Agent`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bootstrapResult: any = await ctx.runAction(
      getPublicApi().ai.soulGenerator.bootstrapAgent,
      {
        organizationId: childOrgId,
        name: agentName,
        subtype: "pm",
        industry: args.industry,
        targetAudience: args.targetAudience,
        tonePreference: args.tonePreference || undefined,
        additionalContext: args.description,
      }
    );

    // 8b. Bootstrap L4 customer_service agent for sub-org
    //     This agent handles end-customer conversations; the PM handles internal ops.
    let customerServiceAgentId = null;
    try {
      const csAgentName = `${args.businessName} Customer Service`;
      customerServiceAgentId = await ctx.runMutation(
        getInternal().agentOntology.createAgentInternal,
        {
          organizationId: childOrgId,
          name: csAgentName,
          subtype: "customer_service",
          autonomyLevel: "supervised" as const,
          displayName: csAgentName,
          modelId: "anthropic/claude-haiku-4-5",
          soul: bootstrapResult?.soul || null,
        }
      );
      // Activate the customer service agent
      if (customerServiceAgentId) {
        await ctx.runMutation(
          getInternal().agentOntology.activateAgentInternal,
          { agentId: customerServiceAgentId }
        );
      }
    } catch (e) {
      // Non-fatal — sub-org works fine with just the PM (backward compatible)
      console.error("[bootstrapClientOrg] L4 agent creation failed:", e);
    }

    // 9. Register the deep link slug for routing
    await ctx.runMutation(
      getInternal().onboarding.agencySubOrgBootstrap.registerDeepLinkSlug,
      {
        organizationId: childOrgId,
        slug,
      }
    );

    // 10. Get agent name from bootstrap result
    const finalAgentName = bootstrapResult?.agentName || agentName;

    return {
      success: true,
      childOrganizationId: childOrgId,
      slug,
      agentId: bootstrapResult?.agentId,
      agentName: finalAgentName,
      deepLink: `${process.env.NEXT_PUBLIC_API_ENDPOINT_URL || "https://aromatic-akita-723.convex.site"}/start?slug=${slug}`,
      telegramMode: "testing" as const,
      message: `Created "${args.businessName}" with agent "${finalAgentName}". ` +
        `The deep link is for TESTING — messages go through the platform bot. ` +
        `When ready to go live, create a bot via @BotFather and use deploy_telegram_bot.`,
    };
  },
});

/**
 * Register a deep link slug -> org mapping.
 * Stored in telegramMappings as a special entry with "deeplink:" prefix
 * so the resolver can find it.
 */
export const registerDeepLinkSlug = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if slug already registered
    const existing = await ctx.db
      .query("telegramMappings")
      .withIndex("by_chat_id", (q) =>
        q.eq("telegramChatId", `deeplink:${args.slug}`)
      )
      .first();

    if (existing) {
      // Update to point to new org
      await ctx.db.patch(existing._id, {
        organizationId: args.organizationId,
      });
      return;
    }

    await ctx.db.insert("telegramMappings", {
      telegramChatId: `deeplink:${args.slug}`,
      organizationId: args.organizationId,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

/**
 * Resolve a deep link slug to an organization.
 */
export const resolveDeepLink = internalQuery({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query("telegramMappings")
      .withIndex("by_chat_id", (q) =>
        q.eq("telegramChatId", `deeplink:${args.slug}`)
      )
      .first();

    if (!mapping) return null;
    return { organizationId: mapping.organizationId };
  },
});

/**
 * Get all org_owner user IDs for a given organization.
 * Used by bootstrapClientOrg to mirror parent owners into child sub-orgs.
 */
export const getOrgOwnerUserIds = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter to org_owner role
    const ownerIds = [];
    for (const member of members) {
      const role = await ctx.db.get(member.role);
      if (role?.name === "org_owner") {
        ownerIds.push(member.userId);
      }
    }
    return ownerIds;
  },
});
