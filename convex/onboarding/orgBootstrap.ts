/**
 * ONBOARDING ORG BOOTSTRAP
 *
 * Explicit lifecycle for workspace creation before and after account claim:
 * - provisional_onboarding: transient org shell created from anonymous onboarding
 * - live_unclaimed_workspace: live workspace with strict operator authority, awaiting claim
 * - claimed_workspace: owned workspace finalized onto the signed-in org baseline
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { internal: internalApi } = require("../_generated/api") as { internal: any };

export const ONBOARDING_ORG_LIFECYCLE = {
  PROVISIONAL: "provisional_onboarding",
  LIVE_UNCLAIMED: "live_unclaimed_workspace",
  CLAIMED: "claimed_workspace",
} as const;

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveWorkspaceName(args: {
  workspaceName?: string;
  name?: string;
  fallback?: string;
}) {
  return (
    normalizeOptionalString(args.workspaceName) ||
    normalizeOptionalString(args.name) ||
    args.fallback ||
    "My Workspace"
  );
}

function buildOnboardingWorkspaceSlug(workspaceName: string) {
  const baseSlug = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const uniqueSuffix = Date.now().toString(36);
  return `${baseSlug}-${uniqueSuffix}`;
}

async function writeLifecycleAuditLog(
  ctx: any,
  args: {
    organizationId: string;
    action: string;
    metadata?: Record<string, unknown>;
  }
) {
  await ctx.db.insert("auditLogs", {
    organizationId: args.organizationId,
    action: args.action,
    resource: "organizations",
    resourceId: String(args.organizationId),
    metadata: args.metadata,
    success: true,
    createdAt: Date.now(),
  });
}

async function createProvisionalOnboardingOrgHandler(
  ctx: any,
  args: {
    workspaceName?: string;
    workspaceContext?: string;
    name?: string;
    industry?: string;
    source: string;
    channelContactIdentifier?: string;
  }
) {
  const workspaceName = resolveWorkspaceName({
    workspaceName: args.workspaceName,
    name: args.name,
  });
  const workspaceContext =
    normalizeOptionalString(args.workspaceContext) ||
    normalizeOptionalString(args.industry);
  const channelContactIdentifier = normalizeOptionalString(args.channelContactIdentifier);
  const now = Date.now();

  const orgId = await ctx.db.insert("organizations", {
    name: workspaceName,
    slug: buildOnboardingWorkspaceSlug(workspaceName),
    businessName: workspaceName,
    plan: "free",
    isPersonalWorkspace: false,
    isActive: true,
    onboardingLifecycleState: ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
    onboardingLifecycleSource: args.source,
    createdAt: now,
    updatedAt: now,
  });

  await writeLifecycleAuditLog(ctx, {
    organizationId: orgId,
    action: "onboarding.org_bootstrap.provisional_created",
    metadata: {
      source: args.source,
      workspaceContext,
      channelContactIdentifier,
      lifecycleState: ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
    },
  });

  return orgId;
}

export const createProvisionalOnboardingOrg = internalMutation({
  args: {
    workspaceName: v.optional(v.string()),
    workspaceContext: v.optional(v.string()),
    name: v.optional(v.string()),
    industry: v.optional(v.string()),
    source: v.string(),
    channelContactIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => createProvisionalOnboardingOrgHandler(ctx, args),
});

/**
 * Legacy compatibility alias.
 * Prefer createProvisionalOnboardingOrg for any new callers.
 */
export const createMinimalOrg = internalMutation({
  args: {
    workspaceName: v.optional(v.string()),
    workspaceContext: v.optional(v.string()),
    name: v.optional(v.string()),
    industry: v.optional(v.string()),
    source: v.string(),
    channelContactIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => createProvisionalOnboardingOrgHandler(ctx, args),
});

export const ensureTelegramOnboardingOrgBinding = internalMutation({
  args: {
    telegramChatId: v.string(),
    source: v.string(),
    senderName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query("telegramMappings")
      .withIndex("by_chat_id", (q) => q.eq("telegramChatId", args.telegramChatId))
      .first();

    if (!mapping) {
      throw new Error("Telegram mapping not found");
    }

    if (mapping.onboardingOrganizationId) {
      const existingOrganization = await ctx.db.get(mapping.onboardingOrganizationId);
      if (existingOrganization) {
        return {
          organizationId: mapping.onboardingOrganizationId,
          created: false as const,
          lifecycleState: existingOrganization.onboardingLifecycleState || null,
        };
      }
    }

    const organizationId = await createProvisionalOnboardingOrgHandler(ctx, {
      source: args.source,
      channelContactIdentifier: args.telegramChatId,
    });

    await ctx.db.patch(mapping._id, {
      onboardingOrganizationId: organizationId,
    });

    await writeLifecycleAuditLog(ctx, {
      organizationId,
      action: "onboarding.org_bootstrap.telegram_first_touch_bound",
      metadata: {
        telegramChatId: args.telegramChatId,
        senderName: normalizeOptionalString(args.senderName) || null,
        mappingId: String(mapping._id),
        lifecycleState: ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
      },
    });

    return {
      organizationId,
      created: true as const,
      lifecycleState: ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
    };
  },
});

export const promoteOnboardingOrgToLiveUnclaimed = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    workspaceName: v.optional(v.string()),
    name: v.optional(v.string()),
    workspaceContext: v.optional(v.string()),
    industry: v.optional(v.string()),
    source: v.string(),
    channelContactIdentifier: v.optional(v.string()),
    appSurface: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    if (organization.onboardingLifecycleState === ONBOARDING_ORG_LIFECYCLE.CLAIMED) {
      throw new Error("Cannot promote a claimed workspace back to live_unclaimed_workspace");
    }

    const now = Date.now();
    const workspaceName = resolveWorkspaceName({
      workspaceName: args.workspaceName,
      name: args.name,
      fallback: organization.name,
    });
    const workspaceContext =
      normalizeOptionalString(args.workspaceContext) ||
      normalizeOptionalString(args.industry);
    const previousState = organization.onboardingLifecycleState;
    const renamed =
      organization.name !== workspaceName || organization.businessName !== workspaceName;

    await ctx.db.patch(args.organizationId, {
      name: workspaceName,
      businessName: workspaceName,
      onboardingLifecycleState: ONBOARDING_ORG_LIFECYCLE.LIVE_UNCLAIMED,
      onboardingLifecycleSource: args.source,
      onboardingActivatedAt: organization.onboardingActivatedAt || now,
      updatedAt: now,
    });

    const operatorProvisioning = await (ctx as any).runMutation(
      internalApi.organizations.ensureOperatorAuthorityBootstrapInternal,
      {
        organizationId: args.organizationId,
        appSurface: args.appSurface || "platform_web",
      }
    );

    if (
      previousState !== ONBOARDING_ORG_LIFECYCLE.LIVE_UNCLAIMED
      || renamed
    ) {
      await writeLifecycleAuditLog(ctx, {
        organizationId: args.organizationId,
        action: "onboarding.org_bootstrap.promoted_live_unclaimed",
        metadata: {
          source: args.source,
          previousState: previousState || null,
          workspaceContext,
          channelContactIdentifier: normalizeOptionalString(args.channelContactIdentifier),
          lifecycleState: ONBOARDING_ORG_LIFECYCLE.LIVE_UNCLAIMED,
          operatorAgentId: operatorProvisioning?.operatorAgentId || null,
        },
      });
    }

    return {
      organizationId: args.organizationId,
      lifecycleState: ONBOARDING_ORG_LIFECYCLE.LIVE_UNCLAIMED,
      operatorAgentId: operatorProvisioning?.operatorAgentId || null,
      operatorProvisioningAction: operatorProvisioning?.operatorProvisioningAction || null,
    };
  },
});

export const finalizeOnboardingOrgClaim = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    contactEmail: v.optional(v.string()),
    appSurface: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    if (
      organization.onboardingLifecycleState === ONBOARDING_ORG_LIFECYCLE.CLAIMED
      && organization.onboardingClaimedByUserId
      && String(organization.onboardingClaimedByUserId) !== String(args.userId)
    ) {
      throw new Error("Onboarding workspace already claimed by another user");
    }

    const alreadyClaimedByUser =
      organization.onboardingLifecycleState === ONBOARDING_ORG_LIFECYCLE.CLAIMED
      && String(organization.onboardingClaimedByUserId || "") === String(args.userId);
    const shouldProvisionBaseline = !alreadyClaimedByUser || !organization.createdBy;

    const baselineResult =
      shouldProvisionBaseline
        ? await (ctx as any).runMutation(
            internalApi.organizations.provisionOrganizationBaselineInternal,
            {
              organizationId: args.organizationId,
              createdByUserId: args.userId,
              ownerUserIds: [args.userId],
              appProvisioningUserId: args.userId,
              contactEmail: normalizeOptionalString(args.contactEmail),
              appSurface: args.appSurface || "platform_web",
            }
          )
        : null;

    const now = Date.now();
    const lifecycleChanged =
      organization.onboardingLifecycleState !== ONBOARDING_ORG_LIFECYCLE.CLAIMED
      || String(organization.onboardingClaimedByUserId || "") !== String(args.userId)
      || !organization.createdBy;

    await ctx.db.patch(args.organizationId, {
      onboardingLifecycleState: ONBOARDING_ORG_LIFECYCLE.CLAIMED,
      onboardingClaimedAt: organization.onboardingClaimedAt || now,
      onboardingClaimedByUserId: args.userId,
      onboardingActivatedAt: organization.onboardingActivatedAt || now,
      createdBy: organization.createdBy || args.userId,
      updatedAt: now,
    });

    if (lifecycleChanged) {
      await writeLifecycleAuditLog(ctx, {
        organizationId: args.organizationId,
        action: "onboarding.org_bootstrap.claimed_workspace_finalized",
        metadata: {
          previousState: organization.onboardingLifecycleState || null,
          lifecycleState: ONBOARDING_ORG_LIFECYCLE.CLAIMED,
          claimedByUserId: String(args.userId),
          operatorAgentId: baselineResult?.operatorAgentId || null,
        },
      });
    }

    return {
      organizationId: args.organizationId,
      lifecycleState: ONBOARDING_ORG_LIFECYCLE.CLAIMED,
      operatorAgentId: baselineResult?.operatorAgentId || null,
      operatorProvisioningAction: baselineResult?.operatorProvisioningAction || null,
    };
  },
});

export const updateOrgFromOnboarding = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    workspaceName: v.optional(v.string()),
    name: v.optional(v.string()), // Legacy compatibility alias.
    source: v.string(),
    channelContactIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const now = Date.now();
    const workspaceName = resolveWorkspaceName({
      workspaceName: args.workspaceName,
      name: args.name,
      fallback: organization.name,
    });
    await ctx.db.patch(args.organizationId, {
      name: workspaceName,
      businessName: workspaceName,
      updatedAt: now,
    });

    await writeLifecycleAuditLog(ctx, {
      organizationId: args.organizationId,
      action: "onboarding.org_bootstrap.rename_existing",
      metadata: {
        source: args.source,
        channelContactIdentifier: args.channelContactIdentifier,
        newName: workspaceName,
        lifecycleState: organization.onboardingLifecycleState || null,
      },
    });

    return {
      success: true as const,
      organizationId: args.organizationId,
      renamed: true as const,
    };
  },
});
