import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveExplicitInboundAgentEligibility } from "../../../convex/ai/agentExecution";
import {
  PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED,
  PLATFORM_MOTHER_AUTHORITY_ROLE,
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_IDENTITY_ROLE,
  PLATFORM_MOTHER_LEGACY_NAME,
  PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
  PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING,
  PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
  PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
  PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY,
  PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_GENERAL_AVAILABILITY,
  PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION,
} from "../../../convex/platformMother";

describe("platform Mother customer reachability", () => {
  const previousIdentityEnabled = process.env.PLATFORM_MOTHER_IDENTITY_ENABLED;
  const previousSupportRouteEnabled = process.env.PLATFORM_MOTHER_SUPPORT_ROUTE_ENABLED;
  const previousRenameQuinnEnabled = process.env.PLATFORM_MOTHER_RENAME_QUINN_ENABLED;

  beforeEach(() => {
    delete process.env.PLATFORM_MOTHER_IDENTITY_ENABLED;
    delete process.env.PLATFORM_MOTHER_SUPPORT_ROUTE_ENABLED;
    delete process.env.PLATFORM_MOTHER_RENAME_QUINN_ENABLED;
  });

  afterEach(() => {
    if (previousIdentityEnabled === undefined) {
      delete process.env.PLATFORM_MOTHER_IDENTITY_ENABLED;
    } else {
      process.env.PLATFORM_MOTHER_IDENTITY_ENABLED = previousIdentityEnabled;
    }
    if (previousSupportRouteEnabled === undefined) {
      delete process.env.PLATFORM_MOTHER_SUPPORT_ROUTE_ENABLED;
    } else {
      process.env.PLATFORM_MOTHER_SUPPORT_ROUTE_ENABLED = previousSupportRouteEnabled;
    }
    if (previousRenameQuinnEnabled === undefined) {
      delete process.env.PLATFORM_MOTHER_RENAME_QUINN_ENABLED;
    } else {
      process.env.PLATFORM_MOTHER_RENAME_QUINN_ENABLED = previousRenameQuinnEnabled;
    }
  });

  function enableMotherSupportRouteFlags() {
    process.env.PLATFORM_MOTHER_IDENTITY_ENABLED = "true";
    process.env.PLATFORM_MOTHER_SUPPORT_ROUTE_ENABLED = "true";
  }

  function buildSupportRelease(
    overrides: Partial<{
      stage: string;
      canaryOrganizationIds: string[];
    }> = {},
  ) {
    return {
      contractVersion: PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
      stage:
        overrides.stage ?? PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_GENERAL_AVAILABILITY,
      canaryOrganizationIds: overrides.canaryOrganizationIds ?? [],
      aliasCompatibilityMode: PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED,
      renameCleanupReady: false,
      reviewArtifactId: "objects_review_artifact",
      approvedByUserId: "users_reviewer",
      reviewedAt: 1_763_000_000_000,
    };
  }

  function buildSupportRouteFlags(enabled: boolean) {
    return {
      contractVersion: PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION,
      identityEnabled: enabled,
      supportRouteEnabled: enabled,
      reviewArtifactId: "objects_review_artifact",
      updatedByUserId: "users_super_admin",
      updatedAt: 1_763_000_100_000,
    };
  }

  it("preserves same-org explicit targeting for non-Mother draft agents", () => {
    const result = resolveExplicitInboundAgentEligibility({
      explicitAgent: {
        _id: "draft_agent",
        organizationId: "org_customer",
        type: "org_agent",
        status: "draft",
        customProperties: {
          agentClass: "internal_operator",
        },
      },
      organizationId: "org_customer",
      channel: "desktop",
    });

    expect(result.eligible).toBe(true);
    expect(result.sameOrg).toBe(true);
    expect(result.crossOrgPlatformMotherAccess).toBe(false);
  });

  it("fails closed for cross-org Mother support when the rollout flags are off", () => {
    const result = resolveExplicitInboundAgentEligibility({
      explicitAgent: {
        _id: "mother_support",
        name: PLATFORM_MOTHER_CANONICAL_NAME,
        organizationId: "org_platform",
        type: "org_agent",
        status: "active",
        customProperties: {
          agentClass: "internal_operator",
          authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
          identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
          runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
          canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
          legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
          platformMotherSupportRelease: buildSupportRelease(),
        },
      },
      organizationId: "org_customer",
      channel: "desktop",
    });

    expect(result.eligible).toBe(false);
    expect(result.crossOrgPlatformMotherAccess).toBe(false);
  });

  it("allows cross-org explicit targeting for a canary-approved Mother support runtime", () => {
    enableMotherSupportRouteFlags();

    const result = resolveExplicitInboundAgentEligibility({
      explicitAgent: {
        _id: "mother_support",
        name: PLATFORM_MOTHER_CANONICAL_NAME,
        organizationId: "org_platform",
        type: "org_agent",
        status: "active",
        customProperties: {
          agentClass: "internal_operator",
          authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
          identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
          runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
          canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
          legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
          platformMotherSupportRelease: buildSupportRelease({
            stage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY,
            canaryOrganizationIds: ["org_customer"],
          }),
        },
      },
      organizationId: "org_customer",
      channel: "desktop",
    });

    expect(result.eligible).toBe(true);
    expect(result.sameOrg).toBe(false);
    expect(result.crossOrgPlatformMotherAccess).toBe(true);
  });

  it("allows cross-org explicit targeting when runtime-owned Mother route flags are enabled from UI", () => {
    const result = resolveExplicitInboundAgentEligibility({
      explicitAgent: {
        _id: "mother_support",
        name: PLATFORM_MOTHER_CANONICAL_NAME,
        organizationId: "org_platform",
        type: "org_agent",
        status: "active",
        customProperties: {
          agentClass: "internal_operator",
          authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
          identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
          runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
          canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
          legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
          platformMotherSupportRelease: buildSupportRelease(),
          platformMotherSupportRouteFlags: buildSupportRouteFlags(true),
        },
      },
      organizationId: "org_customer",
      channel: "desktop",
    });

    expect(result.eligible).toBe(true);
    expect(result.sameOrg).toBe(false);
    expect(result.crossOrgPlatformMotherAccess).toBe(true);
  });

  it("blocks non-canary organizations from cross-org Mother support during canary rollout", () => {
    enableMotherSupportRouteFlags();

    const result = resolveExplicitInboundAgentEligibility({
      explicitAgent: {
        _id: "mother_support",
        name: PLATFORM_MOTHER_CANONICAL_NAME,
        organizationId: "org_platform",
        type: "org_agent",
        status: "active",
        customProperties: {
          agentClass: "internal_operator",
          authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
          identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
          runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
          canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
          legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
          platformMotherSupportRelease: buildSupportRelease({
            stage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY,
            canaryOrganizationIds: ["org_canary_only"],
          }),
        },
      },
      organizationId: "org_customer",
      channel: "desktop",
    });

    expect(result.eligible).toBe(false);
    expect(result.crossOrgPlatformMotherAccess).toBe(false);
  });

  it("blocks cross-org explicit targeting for Mother governance runtime", () => {
    const result = resolveExplicitInboundAgentEligibility({
      explicitAgent: {
        _id: "mother_governance",
        name: PLATFORM_MOTHER_CANONICAL_NAME,
        organizationId: "org_platform",
        type: "org_agent",
        status: "active",
        customProperties: {
          agentClass: "internal_operator",
          authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
          identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
          runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
        },
      },
      organizationId: "org_customer",
      channel: "desktop",
    });

    expect(result.eligible).toBe(false);
    expect(result.crossOrgPlatformMotherAccess).toBe(false);
  });

  it("blocks cross-org explicit targeting for Mother onboarding workers", () => {
    const result = resolveExplicitInboundAgentEligibility({
      explicitAgent: {
        _id: "mother_onboarding_worker",
        name: "Quinn Worker 1",
        organizationId: "org_platform",
        type: "org_agent",
        status: "active",
        customProperties: {
          agentClass: "internal_operator",
          authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
          identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
          runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING,
        },
      },
      organizationId: "org_customer",
      channel: "desktop",
    });

    expect(result.eligible).toBe(false);
    expect(result.crossOrgPlatformMotherAccess).toBe(false);
  });

  it("still requires explicit public channel binding for Mother support on webchat", () => {
    enableMotherSupportRouteFlags();

    const blockedResult = resolveExplicitInboundAgentEligibility({
      explicitAgent: {
        _id: "mother_support",
        name: PLATFORM_MOTHER_CANONICAL_NAME,
        organizationId: "org_platform",
        type: "org_agent",
        status: "active",
        customProperties: {
          agentClass: "internal_operator",
          authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
          identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
          runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
          canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
          legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
          platformMotherSupportRelease: buildSupportRelease(),
          channelBindings: [],
        },
      },
      organizationId: "org_customer",
      channel: "webchat",
    });

    const allowedResult = resolveExplicitInboundAgentEligibility({
      explicitAgent: {
        _id: "mother_support",
        name: PLATFORM_MOTHER_CANONICAL_NAME,
        organizationId: "org_platform",
        type: "org_agent",
        status: "active",
        customProperties: {
          agentClass: "internal_operator",
          authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
          identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
          runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
          canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
          legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
          platformMotherSupportRelease: buildSupportRelease(),
          channelBindings: [{ channel: "webchat", enabled: true }],
        },
      },
      organizationId: "org_customer",
      channel: "webchat",
    });

    expect(blockedResult.eligible).toBe(false);
    expect(allowedResult.eligible).toBe(true);
  });

  it("blocks Mother support as an explicit phone_call target even if it is misconfigured as external", () => {
    enableMotherSupportRouteFlags();

    const result = resolveExplicitInboundAgentEligibility({
      explicitAgent: {
        _id: "mother_support",
        name: PLATFORM_MOTHER_CANONICAL_NAME,
        organizationId: "org_platform",
        type: "org_agent",
        status: "active",
        customProperties: {
          agentClass: "external_customer_facing",
          authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
          identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
          runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
          canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
          legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
          platformMotherSupportRelease: buildSupportRelease(),
          channelBindings: [{ channel: "phone_call", enabled: true }],
        },
      },
      organizationId: "org_customer",
      channel: "phone_call",
    });

    expect(result.eligible).toBe(false);
    expect(result.crossOrgPlatformMotherAccess).toBe(false);
    expect(result.classAllowed).toBe(false);
  });

  it("fails closed when Quinn alias compatibility is missing from the released support runtime", () => {
    enableMotherSupportRouteFlags();

    const result = resolveExplicitInboundAgentEligibility({
      explicitAgent: {
        _id: "mother_support",
        name: PLATFORM_MOTHER_CANONICAL_NAME,
        organizationId: "org_platform",
        type: "org_agent",
        status: "active",
        customProperties: {
          agentClass: "internal_operator",
          authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
          identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
          runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
          canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
          legacyIdentityAliases: [],
          platformMotherSupportRelease: buildSupportRelease(),
        },
      },
      organizationId: "org_customer",
      channel: "desktop",
    });

    expect(result.eligible).toBe(false);
    expect(result.crossOrgPlatformMotherAccess).toBe(false);
  });
});
