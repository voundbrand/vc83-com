/**
 * ONBOARDING ORG BOOTSTRAP
 *
 * Explicit lifecycle for workspace creation before and after account claim:
 * - provisional_onboarding: transient org shell created from anonymous onboarding
 * - live_unclaimed_workspace: live workspace with strict operator authority, awaiting claim
 * - claimed_workspace: owned workspace finalized onto the signed-in org baseline
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { internal: internalApi } = require("../_generated/api") as { internal: any };

export const ONBOARDING_ORG_LIFECYCLE = {
  PROVISIONAL: "provisional_onboarding",
  LIVE_UNCLAIMED: "live_unclaimed_workspace",
  CLAIMED: "claimed_workspace",
} as const;

const guestOnboardingBindingChannelValidator = v.union(
  v.literal("webchat"),
  v.literal("native_guest")
);

function buildGuestOnboardingSourceIdentityKey(args: {
  channel: "webchat" | "native_guest";
  onboardingSurface: string;
  sessionToken: string;
}) {
  return `${args.channel}:${args.onboardingSurface}:${args.sessionToken}`;
}

async function syncGuestOnboardingBindingsForLifecycle(
  ctx: any,
  args: {
    organizationId: string;
    lifecycleState:
      | typeof ONBOARDING_ORG_LIFECYCLE.PROVISIONAL
      | typeof ONBOARDING_ORG_LIFECYCLE.LIVE_UNCLAIMED
      | typeof ONBOARDING_ORG_LIFECYCLE.CLAIMED;
    bindingStatus?: "active" | "claimed" | "expired";
    claimedByUserId?: string;
    claimedAt?: number;
    completedAt?: number;
  }
) {
  const bindings = await ctx.db
    .query("guestOnboardingBindings")
    .withIndex("by_org", (q: any) => q.eq("onboardingOrganizationId", args.organizationId))
    .collect();

  if (bindings.length === 0) {
    return;
  }

  const now = Date.now();
  for (const binding of bindings) {
    await ctx.db.patch(binding._id, {
      organizationLifecycleState: args.lifecycleState,
      bindingStatus:
        args.bindingStatus ||
        (args.lifecycleState === ONBOARDING_ORG_LIFECYCLE.CLAIMED ? "claimed" : binding.bindingStatus),
      claimedByUserId: args.claimedByUserId || binding.claimedByUserId,
      claimedAt: args.claimedAt || binding.claimedAt,
      completedAt: args.completedAt || binding.completedAt,
      updatedAt: now,
      lastActivityAt: now,
    });
  }
}

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

export const ensureGuestOnboardingOrgBinding = internalMutation({
  args: {
    channel: guestOnboardingBindingChannelValidator,
    onboardingSurface: v.string(),
    sessionToken: v.string(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionToken = normalizeOptionalString(args.sessionToken);
    const onboardingSurface = normalizeOptionalString(args.onboardingSurface);

    if (!sessionToken) {
      throw new Error("Guest onboarding session token is required");
    }
    if (!onboardingSurface) {
      throw new Error("Guest onboarding surface is required");
    }

    const sourceIdentityKey = buildGuestOnboardingSourceIdentityKey({
      channel: args.channel,
      onboardingSurface,
      sessionToken,
    });
    const now = Date.now();

    const existingBinding = await ctx.db
      .query("guestOnboardingBindings")
      .withIndex("by_source_identity_key", (q) => q.eq("sourceIdentityKey", sourceIdentityKey))
      .first();

    if (existingBinding) {
      const existingOrganization = await ctx.db.get(existingBinding.onboardingOrganizationId);
      if (existingOrganization) {
        const lifecycleState =
          existingOrganization.onboardingLifecycleState || existingBinding.organizationLifecycleState;
        const bindingStatus =
          lifecycleState === ONBOARDING_ORG_LIFECYCLE.CLAIMED
            ? "claimed"
            : existingBinding.bindingStatus === "expired"
              ? "active"
              : existingBinding.bindingStatus;

        await ctx.db.patch(existingBinding._id, {
          organizationLifecycleState: lifecycleState,
          bindingStatus,
          updatedAt: now,
          lastActivityAt: now,
        });

        return {
          bindingId: existingBinding._id,
          organizationId: existingBinding.onboardingOrganizationId,
          created: false as const,
          lifecycleState,
          bindingStatus,
          onboardingSurface,
        };
      }
    }

    const organizationId = await createProvisionalOnboardingOrgHandler(ctx, {
      source: args.source,
      channelContactIdentifier: sessionToken,
    });

    if (existingBinding) {
      await ctx.db.patch(existingBinding._id, {
        onboardingOrganizationId: organizationId,
        organizationLifecycleState: ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
        bindingStatus: "active",
        updatedAt: now,
        lastActivityAt: now,
      });

      return {
        bindingId: existingBinding._id,
        organizationId,
        created: false as const,
        lifecycleState: ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
        bindingStatus: "active" as const,
        onboardingSurface,
      };
    }

    const bindingId = await ctx.db.insert("guestOnboardingBindings", {
      sourceIdentityKey,
      channel: args.channel,
      onboardingSurface,
      sessionToken,
      onboardingOrganizationId: organizationId,
      organizationLifecycleState: ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
      bindingStatus: "active",
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    });

    await writeLifecycleAuditLog(ctx, {
      organizationId,
      action: "onboarding.org_bootstrap.guest_first_touch_bound",
      metadata: {
        channel: args.channel,
        onboardingSurface,
        sessionToken,
        bindingId: String(bindingId),
        lifecycleState: ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
      },
    });

    return {
      bindingId,
      organizationId,
      created: true as const,
      lifecycleState: ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
      bindingStatus: "active" as const,
      onboardingSurface,
    };
  },
});

export const getGuestOnboardingBindingBySessionToken = internalQuery({
  args: {
    channel: guestOnboardingBindingChannelValidator,
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const binding = await ctx.db
      .query("guestOnboardingBindings")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!binding || binding.channel !== args.channel) {
      return null;
    }

    return binding;
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

    await syncGuestOnboardingBindingsForLifecycle(ctx, {
      organizationId: args.organizationId,
      lifecycleState: ONBOARDING_ORG_LIFECYCLE.LIVE_UNCLAIMED,
      bindingStatus: "active",
      completedAt: now,
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

    await syncGuestOnboardingBindingsForLifecycle(ctx, {
      organizationId: args.organizationId,
      lifecycleState: ONBOARDING_ORG_LIFECYCLE.CLAIMED,
      bindingStatus: "claimed",
      claimedByUserId: args.userId,
      claimedAt: organization.onboardingClaimedAt || now,
      completedAt: organization.onboardingActivatedAt || now,
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

export const recordGuestOnboardingBindingHandoff = internalMutation({
  args: {
    channel: guestOnboardingBindingChannelValidator,
    sessionToken: v.string(),
    resolvedAgentId: v.id("objects"),
    lastClaimTokenId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const binding = await ctx.db
      .query("guestOnboardingBindings")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!binding || binding.channel !== args.channel) {
      return { success: false as const, reason: "binding_not_found" as const };
    }

    const now = Date.now();
    await ctx.db.patch(binding._id, {
      resolvedAgentId: args.resolvedAgentId,
      lastClaimTokenId: args.lastClaimTokenId || binding.lastClaimTokenId,
      completedAt: binding.completedAt || now,
      updatedAt: now,
      lastActivityAt: now,
    });

    return { success: true as const, bindingId: binding._id };
  },
});

export const cleanupStaleGuestOnboardingBindings = internalMutation({
  args: {
    staleAfterMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const staleAfterMs = Math.max(args.staleAfterMs || 14 * 24 * 60 * 60 * 1000, 60 * 60 * 1000);
    const now = Date.now();
    const cutoff = now - staleAfterMs;
    const bindings = await ctx.db
      .query("guestOnboardingBindings")
      .withIndex("by_binding_status_activity", (q) => q.eq("bindingStatus", "active"))
      .collect();

    let expiredBindingCount = 0;
    let deactivatedOrgCount = 0;
    let revokedTokenCount = 0;

    for (const binding of bindings) {
      if (binding.lastActivityAt > cutoff) {
        continue;
      }

      const organization = await ctx.db.get(binding.onboardingOrganizationId);
      if (
        organization
        && organization.onboardingLifecycleState !== ONBOARDING_ORG_LIFECYCLE.CLAIMED
        && organization.isActive
      ) {
        await ctx.db.patch(binding.onboardingOrganizationId, {
          isActive: false,
          updatedAt: now,
        });
        deactivatedOrgCount += 1;

        await writeLifecycleAuditLog(ctx, {
          organizationId: binding.onboardingOrganizationId,
          action: "onboarding.org_bootstrap.guest_binding_expired",
          metadata: {
            channel: binding.channel,
            onboardingSurface: binding.onboardingSurface,
            sessionToken: binding.sessionToken,
            lifecycleState: organization.onboardingLifecycleState || null,
          },
        });
      }

      const issuedTokens = await ctx.db
        .query("anonymousClaimTokens")
        .withIndex("by_binding_id", (q) => q.eq("bindingId", binding._id))
        .collect();

      for (const token of issuedTokens) {
        if (token.status !== "issued") {
          continue;
        }
        await ctx.db.patch(token._id, {
          status: "revoked",
          metadata: {
            ...(token.metadata || {}),
            revokedAt: now,
            revokeReason: "stale_guest_onboarding_binding",
          },
        });
        revokedTokenCount += 1;
      }

      await ctx.db.patch(binding._id, {
        bindingStatus: "expired",
        expiredAt: now,
        updatedAt: now,
      });
      expiredBindingCount += 1;
    }

    return {
      expiredBindingCount,
      deactivatedOrgCount,
      revokedTokenCount,
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
