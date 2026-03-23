import { describe, expect, it } from "vitest";

import { resolveExplicitInboundAgentEligibility } from "../../../convex/ai/agentExecution";
import {
  PLATFORM_MOTHER_AUTHORITY_ROLE,
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_IDENTITY_ROLE,
  PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
  PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING,
  PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
} from "../../../convex/platformMother";

describe("platform Mother customer reachability", () => {
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

  it("allows cross-org explicit targeting for an active Mother support runtime", () => {
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
        },
      },
      organizationId: "org_customer",
      channel: "desktop",
    });

    expect(result.eligible).toBe(true);
    expect(result.sameOrg).toBe(false);
    expect(result.crossOrgPlatformMotherAccess).toBe(true);
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
          channelBindings: [{ channel: "webchat", enabled: true }],
        },
      },
      organizationId: "org_customer",
      channel: "webchat",
    });

    expect(blockedResult.eligible).toBe(false);
    expect(allowedResult.eligible).toBe(true);
  });
});
