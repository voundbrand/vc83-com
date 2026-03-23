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
import {
  AGENCY_CHILD_ORG_CUSTOMER_SERVICE_TEMPLATE_ROLE,
  AGENCY_CHILD_ORG_PM_TEMPLATE_ROLE,
} from "./seedPlatformAgents";

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

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function buildAgencyAdditionalLanguages(primaryLanguage: string | undefined): string[] {
  const ordered = [primaryLanguage, "en"];
  return Array.from(
    new Set(
      ordered.filter(
        (language): language is string =>
          typeof language === "string" && language.trim().length > 0
      )
    )
  );
}

function buildPmSpecialistOverlay(args: {
  businessName: string;
  industry: string;
  description: string;
  targetAudience: string;
  language?: string;
  tonePreference?: string;
  agentName: string;
}) {
  const primaryLanguage = normalizeOptionalString(args.language) || "en";
  return {
    displayName: args.agentName,
    language: primaryLanguage,
    voiceLanguage: primaryLanguage,
    additionalLanguages: buildAgencyAdditionalLanguages(primaryLanguage),
    personality:
      `${args.agentName} is the internal project manager specialist for ${args.businessName}. `
      + `They coordinate delivery for a ${args.industry} business, keep internal follow-through tight, `
      + `and prepare issues for the default One-of-One Operator without becoming the default authority route.`,
    brandVoiceInstructions:
      normalizeOptionalString(args.tonePreference)
      || `Use a calm, internal operations tone tailored to ${args.businessName}.`,
    systemPrompt:
      `You are the internal PM specialist for ${args.businessName}. `
      + `Support the default One-of-One Operator, keep customer-facing work routed outward, `
      + `and treat ${args.targetAudience} as the primary audience context for planning decisions. `
      + `Business context: ${args.description}`,
    soul: {
      contractVersion: "agency_child_org_pm_overlay_v1",
      name: args.agentName,
      businessName: args.businessName,
      industry: args.industry,
      targetAudience: args.targetAudience,
      tonePreference: normalizeOptionalString(args.tonePreference) || null,
      context: args.description,
    },
  };
}

function buildCustomerServiceOverlay(args: {
  businessName: string;
  industry: string;
  description: string;
  targetAudience: string;
  language?: string;
  tonePreference?: string;
  agentName: string;
}) {
  const primaryLanguage = normalizeOptionalString(args.language) || "en";
  return {
    displayName: args.agentName,
    language: primaryLanguage,
    voiceLanguage: primaryLanguage,
    additionalLanguages: buildAgencyAdditionalLanguages(primaryLanguage),
    personality:
      `${args.agentName} is the customer-facing specialist for ${args.businessName}. `
      + `They help ${args.targetAudience}, answer questions clearly, and escalate internal-only requests `
      + `without exposing hierarchy.`,
    brandVoiceInstructions:
      normalizeOptionalString(args.tonePreference)
      || `Use a helpful, customer-safe tone that fits ${args.businessName}.`,
    systemPrompt:
      `You are the customer-facing specialist for ${args.businessName}, a ${args.industry} business. `
      + `Handle inbound Telegram and webchat conversations for ${args.targetAudience}. `
      + `Do not impersonate the internal operator or PM. Business context: ${args.description}`,
    soul: {
      contractVersion: "agency_child_org_customer_service_overlay_v1",
      name: args.agentName,
      businessName: args.businessName,
      targetAudience: args.targetAudience,
      tonePreference: normalizeOptionalString(args.tonePreference) || null,
    },
  };
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

    // 6. Resolve parent org owners so the child org inherits the same signed-in baseline.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parentOwners: any[] = await ctx.runQuery(
      getInternal().onboarding.agencySubOrgBootstrap.getOrgOwnerUserIds,
      { organizationId: args.parentOrganizationId }
    );
    const baselineUserId =
      parentOwners[0]
      || (parent as { createdBy?: string | null }).createdBy
      || null;
    if (!baselineUserId) {
      throw new Error(
        "Agency child-org bootstrap failed: parent org has no owner/creator available for baseline provisioning."
      );
    }

    // 7. Apply the same signed-in baseline used by normal org creation.
    const baselineResult = await ctx.runMutation(
      getInternal().organizations.provisionOrganizationBaselineInternal,
      {
        organizationId: childOrgId,
        createdByUserId: baselineUserId,
        ownerUserIds: parentOwners,
        appProvisioningUserId: baselineUserId,
        language: args.language,
        industry: args.industry,
        description: args.description,
        appSurface: "platform_web",
      }
    );

    // 8. Provision a managed PM specialist clone for the child org.
    const projectManagerName =
      normalizeOptionalString(args.agentNameHint) || `${args.businessName} Project Manager`;
    const projectManagerProvisioning = await ctx.runMutation(
      getInternal().agentOntology.ensureManagedTemplateSpecialistAgentForOrgInternal,
      {
        organizationId: childOrgId,
        templateRole: AGENCY_CHILD_ORG_PM_TEMPLATE_ROLE,
        name: projectManagerName,
        description: `Internal PM specialist for ${args.businessName}`,
        subtype: "pm",
        agentClass: "internal_operator",
        operatorId: "__org_default__",
        isPrimary: false,
        customPropertiesOverlay: buildPmSpecialistOverlay({
          businessName: args.businessName,
          industry: args.industry,
          description: args.description,
          targetAudience: args.targetAudience,
          language: args.language,
          tonePreference: args.tonePreference,
          agentName: projectManagerName,
        }),
      }
    );

    // 8b. Provision a managed customer-facing specialist clone for Telegram/webchat.
    const customerServiceName = `${args.businessName} Customer Service`;
    const customerServiceProvisioning = await ctx.runMutation(
      getInternal().agentOntology.ensureManagedTemplateSpecialistAgentForOrgInternal,
      {
        organizationId: childOrgId,
        templateRole: AGENCY_CHILD_ORG_CUSTOMER_SERVICE_TEMPLATE_ROLE,
        name: customerServiceName,
        description: `Customer-facing specialist for ${args.businessName}`,
        subtype: "customer_service",
        agentClass: "external_customer_facing",
        isPrimary: false,
        channelBindings: [
          { channel: "desktop", enabled: false },
          { channel: "slack", enabled: false },
          { channel: "webchat", enabled: true },
          { channel: "telegram", enabled: true },
          { channel: "native_guest", enabled: true },
          { channel: "phone_call", enabled: false },
        ],
        customPropertiesOverlay: buildCustomerServiceOverlay({
          businessName: args.businessName,
          industry: args.industry,
          description: args.description,
          targetAudience: args.targetAudience,
          language: args.language,
          tonePreference: args.tonePreference,
          agentName: customerServiceName,
        }),
      }
    );

    // 9. Register the deep link slug for customer-facing routing.
    await ctx.runMutation(
      getInternal().onboarding.agencySubOrgBootstrap.registerDeepLinkSlug,
      {
        organizationId: childOrgId,
        slug,
        targetAgentId: customerServiceProvisioning.agentId,
      }
    );

    return {
      success: true,
      childOrganizationId: childOrgId,
      slug,
      operatorAgentId: baselineResult?.operatorAgentId || null,
      agentId: projectManagerProvisioning.agentId,
      agentName: projectManagerName,
      projectManagerAgentId: projectManagerProvisioning.agentId,
      customerServiceAgentId: customerServiceProvisioning.agentId,
      customerFacingAgentId: customerServiceProvisioning.agentId,
      deepLink: `${process.env.NEXT_PUBLIC_API_ENDPOINT_URL || "https://aromatic-akita-723.convex.site"}/start?slug=${slug}`,
      telegramMode: "testing" as const,
      message: `Created "${args.businessName}" with the default One-of-One Operator, `
        + `an internal PM specialist, and a customer-facing specialist. `
        + `The deep link is for TESTING through the platform bot until a dedicated Telegram bot is deployed.`,
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
    targetAgentId: v.optional(v.id("objects")),
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
        targetAgentId: args.targetAgentId,
      });
      return;
    }

    await ctx.db.insert("telegramMappings", {
      telegramChatId: `deeplink:${args.slug}`,
      organizationId: args.organizationId,
      targetAgentId: args.targetAgentId,
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
    return {
      organizationId: mapping.organizationId,
      targetAgentId: mapping.targetAgentId || null,
    };
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
