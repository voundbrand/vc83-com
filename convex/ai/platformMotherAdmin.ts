import { ConvexError, v } from "convex/values";

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getUserContext, requireAuthenticatedUser } from "../rbacHelpers";
import { seedAll } from "../onboarding/seedPlatformAgents";
import {
  PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED,
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_LEGACY_NAME,
  PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
  PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
  isPlatformMotherAuthorityRecord,
  readPlatformMotherRuntimeMode,
  readPlatformMotherSupportReleaseStatus,
  readPlatformMotherSupportRouteFlagsStatus,
  resolvePlatformMotherSupportRouteAvailability,
} from "../platformMother";
import {
  capturePlatformMotherGovernanceReviewInternal,
  configurePlatformMotherSupportReleaseInternal,
  getPlatformMotherReviewArtifactInternal,
  listPlatformMotherReviewArtifactsInternal,
  reviewPlatformMotherArtifactInternal,
  setPlatformMotherSupportRouteFlagsInternal,
  type PlatformMotherReviewArtifactRecord,
} from "./platformMotherReviewArtifacts";
import { evaluateTemplateCertificationForTemplateVersion } from "./agentCatalogAdmin";

type RuntimeRecord = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  name?: string;
  status?: string;
  updatedAt?: number;
  customProperties?: Record<string, unknown> | null;
};

type Ctx = QueryCtx | MutationCtx;

function resolvePlatformOrgIdFromEnv(): Id<"organizations"> {
  const platformOrgId = process.env.PLATFORM_ORG_ID?.trim();
  if (platformOrgId) {
    return platformOrgId as Id<"organizations">;
  }
  const testOrgId = process.env.TEST_ORG_ID?.trim();
  if (testOrgId) {
    return testOrgId as Id<"organizations">;
  }
  throw new Error("PLATFORM_ORG_ID or TEST_ORG_ID must be set for Platform Mother admin.");
}

async function requirePlatformMotherSuperAdmin(ctx: Ctx, sessionId: string) {
  const authenticated = await requireAuthenticatedUser(
    ctx as MutationCtx | QueryCtx,
    sessionId,
  );
  const userContext = await getUserContext(ctx as MutationCtx | QueryCtx, authenticated.userId);
  const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
  if (!isSuperAdmin) {
    throw new ConvexError({
      code: "SUPER_ADMIN_REQUIRED",
      message: "Super admin access is required to manage Platform Mother rollout.",
    });
  }
  return {
    authenticated,
    userContext,
  };
}

async function resolveMotherRuntimes(
  ctx: Ctx,
  platformOrganizationId: Id<"organizations">,
): Promise<{
  governanceRuntime: RuntimeRecord | null;
  supportRuntime: RuntimeRecord | null;
}> {
  const agents = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", platformOrganizationId).eq("type", "org_agent"),
    )
    .collect() as RuntimeRecord[];

  const activeMotherRuntimes = agents
    .filter((agent) => agent.status === "active")
    .filter((agent) => {
      const customProperties = agent.customProperties ?? undefined;
      return (
        isPlatformMotherAuthorityRecord(agent.name, customProperties)
        && (
          customProperties?.canonicalIdentityName === PLATFORM_MOTHER_CANONICAL_NAME
          || (
            Array.isArray(customProperties?.legacyIdentityAliases)
            && customProperties.legacyIdentityAliases.includes(PLATFORM_MOTHER_LEGACY_NAME)
          )
        )
      );
    });

  const governanceRuntime = activeMotherRuntimes
    .filter((agent) =>
      readPlatformMotherRuntimeMode(agent.customProperties ?? undefined)
        === PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
    )
    .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))[0] ?? null;
  const supportRuntime = activeMotherRuntimes
    .filter((agent) =>
      readPlatformMotherRuntimeMode(agent.customProperties ?? undefined)
        === PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
    )
    .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))[0] ?? null;

  return {
    governanceRuntime,
    supportRuntime,
  };
}

function describeRolloutCandidate(args: {
  artifact: PlatformMotherReviewArtifactRecord;
  certification: {
    status: "certified" | "auto_certifiable" | "blocked" | "missing";
    reasonCode: string | null;
    message: string | null;
    riskTier: string | null;
    requiredVerification: string[];
  };
}) {
  const { artifact, certification } = args;
  const partialRolloutDetected =
    artifact.reviewContext?.rolloutWindow.partialRolloutDetected === true;
  const aliasSafe = Boolean(
    artifact.aliasMigrationEvidence
    && artifact.aliasMigrationEvidence.canonicalIdentityName === PLATFORM_MOTHER_CANONICAL_NAME
    && artifact.aliasMigrationEvidence.legacyIdentityAlias === PLATFORM_MOTHER_LEGACY_NAME,
  );
  const approvalReady =
    artifact.approvalStatus === "approved" || artifact.approvalStatus === "pending";
  const artifactKindAllowed = artifact.artifactKind !== "proposal_review";
  const policyEligible = artifact.policyFamilyScope.eligible === true;
  const gaReady =
    artifactKindAllowed
    && approvalReady
    && aliasSafe
    && !partialRolloutDetected
    && policyEligible
    && certification.status === "certified";
  let gaBlockedReason: string | null = null;
  if (!artifactKindAllowed) {
    gaBlockedReason = "Proposal-only review artifacts cannot back a live Mother rollout.";
  } else if (!approvalReady) {
    gaBlockedReason = "Rejected Mother review artifacts cannot go live.";
  } else if (certification.status !== "certified") {
    gaBlockedReason =
      certification.message || "Template certification is not satisfied for this rollout candidate.";
  } else if (!policyEligible) {
    gaBlockedReason = "Policy scope still claims out-of-scope operator fields.";
  } else if (!aliasSafe) {
    gaBlockedReason = "Quinn alias safety evidence is missing from the review artifact.";
  } else if (partialRolloutDetected) {
    gaBlockedReason = "General availability requires a review artifact without a partial rollout window.";
  }

  return {
    artifactId: artifact.artifactId,
    artifactKind: artifact.artifactKind,
    approvalStatus: artifact.approvalStatus,
    targetTemplateRole: artifact.targetTemplateRole,
    createdAt: artifact.createdAt,
    updatedAt: artifact.createdAt,
    requestedTargetCount: artifact.reviewContext?.rolloutWindow.requestedTargetCount ?? 0,
    stagedTargetCount: artifact.reviewContext?.rolloutWindow.stagedTargetCount ?? 0,
    partialRolloutDetected,
    gaReady,
    gaBlockedReason,
    certification,
    policy: {
      eligible: policyEligible,
      outOfScopeFields: artifact.policyFamilyScope.outOfScopeFields,
    },
    orgReadiness: {
      interventionCount: artifact.reviewContext?.driftSummary.interventionCount ?? 0,
      blockedCount: artifact.reviewContext?.driftSummary.reviewStateCounts.blocked ?? 0,
      staleCount: artifact.reviewContext?.driftSummary.reviewStateCounts.stale ?? 0,
      missingCloneCount: artifact.reviewContext?.driftSummary.missingCloneCount ?? 0,
    },
  };
}

async function loadRolloutCandidateCertification(
  ctx: QueryCtx,
  artifact: PlatformMotherReviewArtifactRecord,
): Promise<{
  status: "certified" | "auto_certifiable" | "blocked" | "missing";
  reasonCode: string | null;
  message: string | null;
  riskTier: string | null;
  requiredVerification: string[];
}> {
  if (
    !artifact.targetTemplateId
    || !artifact.targetTemplateVersionId
    || !artifact.targetTemplateVersionTag
  ) {
    return {
      status: "missing",
      reasonCode: "certification_missing",
      message: "Template certification context is missing from this review artifact.",
      riskTier: null,
      requiredVerification: [],
    };
  }

  const certification = await evaluateTemplateCertificationForTemplateVersion(ctx, {
    templateId: artifact.targetTemplateId as Id<"objects">,
    templateVersionId: artifact.targetTemplateVersionId as Id<"objects">,
    templateVersionTag: artifact.targetTemplateVersionTag,
  });
  return {
    status: certification.allowed
      ? "certified"
      : certification.autoCertificationEligible
        ? "auto_certifiable"
        : "blocked",
    reasonCode: certification.reasonCode ?? null,
    message: certification.message ?? null,
    riskTier: certification.riskAssessment?.tier ?? null,
    requiredVerification: certification.riskAssessment?.requiredVerification ?? [],
  };
}

async function buildPlatformMotherRolloutOverview(ctx: Ctx) {
  const platformOrganizationId = resolvePlatformOrgIdFromEnv();
  const platformOrganization = await ctx.db.get(platformOrganizationId);
  const { governanceRuntime, supportRuntime } = await resolveMotherRuntimes(
    ctx,
    platformOrganizationId,
  );
  const releaseStatus = supportRuntime
    ? readPlatformMotherSupportReleaseStatus(supportRuntime.customProperties ?? undefined)
    : null;
  const routeFlags = supportRuntime
    ? readPlatformMotherSupportRouteFlagsStatus(supportRuntime.customProperties ?? undefined)
    : null;
  const routeAvailability = supportRuntime
    ? resolvePlatformMotherSupportRouteAvailability({
        name: supportRuntime.name,
        status: supportRuntime.status,
        customProperties: supportRuntime.customProperties ?? undefined,
      })
    : null;
  const artifactList = await (listPlatformMotherReviewArtifactsInternal as any)._handler(ctx, {
    platformOrganizationId,
    limit: 50,
  }) as {
    artifacts: PlatformMotherReviewArtifactRecord[];
    statusCounts: Record<string, number>;
  };
  const routeCandidates = (
    await Promise.all(
      artifactList.artifacts.map(async (artifact) => {
        return describeRolloutCandidate({
          artifact,
          certification: await loadRolloutCandidateCertification(ctx as QueryCtx, artifact),
        });
      }),
    )
  )
    .sort((left, right) => right.updatedAt - left.updatedAt);

  return {
    platformOrganizationId,
    platformOrganizationName: platformOrganization?.name ?? "Platform",
    needsSeed: !supportRuntime || !governanceRuntime,
    supportRuntimeId: supportRuntime?._id ?? null,
    governanceRuntimeId: governanceRuntime?._id ?? null,
    supportRuntimeName: supportRuntime?.name ?? null,
    releaseStatus,
    routeFlags,
    routeAvailability,
    routeCandidates,
    statusCounts: artifactList.statusCounts,
  };
}

export const getPlatformMotherRolloutStatus = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePlatformMotherSuperAdmin(ctx, args.sessionId);
    return buildPlatformMotherRolloutOverview(ctx);
  },
});

export const seedPlatformMotherRuntimes = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePlatformMotherSuperAdmin(ctx, args.sessionId);
    await (seedAll as any)._handler(ctx, {});
    return buildPlatformMotherRolloutOverview(ctx);
  },
});

export const setPlatformMotherLive = mutation({
  args: {
    sessionId: v.string(),
    artifactId: v.optional(v.id("objects")),
    reason: v.string(),
    ticketId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { authenticated } = await requirePlatformMotherSuperAdmin(ctx, args.sessionId);
    const reason = args.reason.trim();
    if (reason.length < 12) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_APPROVAL_REQUIRED",
        message: "Mother live rollout requires an approval reason with at least 12 characters.",
      });
    }

    let { governanceRuntime, supportRuntime } = await resolveMotherRuntimes(
      ctx,
      resolvePlatformOrgIdFromEnv(),
    );
    if (!governanceRuntime || !supportRuntime) {
      await (seedAll as any)._handler(ctx, {});
      ({ governanceRuntime, supportRuntime } = await resolveMotherRuntimes(
        ctx,
        resolvePlatformOrgIdFromEnv(),
      ));
    }
    if (!governanceRuntime || !supportRuntime) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_TARGET_INVALID",
        message: "Platform Mother runtimes were not available after seeding.",
      });
    }

    const resolvedArtifactId = args.artifactId
      ?? (
        await (capturePlatformMotherGovernanceReviewInternal as any)._handler(ctx, {
          artifactKind: "migration_plan",
          actorUserId: authenticated.userId,
          sourceMotherRuntimeId: governanceRuntime._id,
          proposalSummary: "Live Mother rollout requested from the super-admin control surface.",
          proposalDetails: [
            `reason: ${reason}`,
            args.ticketId ? `ticket: ${args.ticketId}` : null,
            args.notes ? `notes: ${args.notes}` : null,
          ].filter((value): value is string => Boolean(value)).join("\n"),
        })
      ).artifactId as Id<"objects">;

    const loadedArtifact = await (getPlatformMotherReviewArtifactInternal as any)._handler(ctx, {
      artifactId: resolvedArtifactId,
    }) as {
      artifact: PlatformMotherReviewArtifactRecord;
    } | null;
    const artifact = loadedArtifact?.artifact ?? null;
    if (!artifact) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_ARTIFACT_NOT_FOUND",
        message: "Selected Platform Mother review artifact was not found.",
        artifactId: String(resolvedArtifactId),
      });
    }
    if (artifact.approvalStatus === "rejected") {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_DECISION_CONFLICT",
        message: "Rejected Mother review artifacts cannot be promoted live.",
        artifactId: artifact.artifactId,
      });
    }

    const rolloutCandidate = describeRolloutCandidate({
      artifact,
      certification: await loadRolloutCandidateCertification(ctx, artifact),
    });
    if (!rolloutCandidate.gaReady) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_REVIEW_REQUIRED",
        message:
          rolloutCandidate.gaBlockedReason
          || "Selected Mother review artifact is not eligible for a live rollout.",
        artifactId: artifact.artifactId,
      });
    }

    if (artifact.approvalStatus !== "approved") {
      await (reviewPlatformMotherArtifactInternal as any)._handler(ctx, {
        artifactId: resolvedArtifactId,
        sourceMotherRuntimeId: governanceRuntime._id,
        decision: "approve",
        approval: {
          approverUserId: authenticated.userId,
          approverRole: "super_admin",
          reason,
          ticketId: args.ticketId,
          notes: args.notes,
        },
      });
    }

    await (configurePlatformMotherSupportReleaseInternal as any)._handler(ctx, {
      artifactId: resolvedArtifactId,
      sourceMotherRuntimeId: governanceRuntime._id,
      supportRuntimeId: supportRuntime._id,
      releaseStage: "general_availability",
      aliasCompatibilityMode: PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED,
    });
    await (setPlatformMotherSupportRouteFlagsInternal as any)._handler(ctx, {
      artifactId: resolvedArtifactId,
      sourceMotherRuntimeId: governanceRuntime._id,
      supportRuntimeId: supportRuntime._id,
      actorUserId: authenticated.userId,
      enabled: true,
    });

    return buildPlatformMotherRolloutOverview(ctx);
  },
});

export const disablePlatformMotherLive = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { authenticated } = await requirePlatformMotherSuperAdmin(ctx, args.sessionId);
    const { governanceRuntime, supportRuntime } = await resolveMotherRuntimes(
      ctx,
      resolvePlatformOrgIdFromEnv(),
    );
    if (!governanceRuntime || !supportRuntime) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_TARGET_INVALID",
        message: "Platform Mother support runtime is not seeded on the platform org.",
      });
    }

    const releaseStatus = readPlatformMotherSupportReleaseStatus(
      supportRuntime.customProperties ?? undefined,
    );
    if (!releaseStatus.reviewArtifactId) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_REVIEW_REQUIRED",
        message: "Platform Mother live disable requires the current support release artifact.",
      });
    }

    await (setPlatformMotherSupportRouteFlagsInternal as any)._handler(ctx, {
      artifactId: releaseStatus.reviewArtifactId as Id<"objects">,
      sourceMotherRuntimeId: governanceRuntime._id,
      supportRuntimeId: supportRuntime._id,
      actorUserId: authenticated.userId,
      enabled: false,
    });

    return buildPlatformMotherRolloutOverview(ctx);
  },
});
