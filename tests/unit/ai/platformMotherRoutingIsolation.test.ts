import { describe, expect, it } from "vitest";

import { resolveActiveAgentForOrgCandidates } from "../../../convex/agentOntology";
import {
  PLATFORM_MOTHER_AUTHORITY_ROLE,
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_IDENTITY_ROLE,
  PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
} from "../../../convex/platformMother";

type Candidate = {
  _id: string;
  name?: string;
  status: string;
  subtype: string;
  customProperties?: Record<string, unknown>;
};

function buildMotherSupportCandidate(
  overrides: Partial<Candidate> = {},
): Candidate {
  return {
    _id: "mother_support",
    name: PLATFORM_MOTHER_CANONICAL_NAME,
    status: "active",
    subtype: "system",
    customProperties: {
      agentClass: "internal_operator",
      authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
      identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
      runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
      channelBindings: [{ channel: "desktop", enabled: true }],
      channelRoutePolicies: [
        {
          channel: "desktop",
          peer: "desktop:user_1:conv_1",
          enabled: true,
        },
      ],
    },
    ...overrides,
  };
}

describe("platform Mother routing isolation", () => {
  it("keeps Mother out of implicit desktop routing even when Mother has a direct route match", () => {
    const resolved = resolveActiveAgentForOrgCandidates<Candidate>(
      [
        buildMotherSupportCandidate(),
        {
          _id: "org_operator",
          name: "Org Operator",
          status: "active",
          subtype: "general",
          customProperties: {
            agentClass: "internal_operator",
          },
        },
      ],
      {
        channel: "desktop",
        routeSelectors: {
          channel: "desktop",
          peer: "desktop:user_1:conv_1",
        },
      },
    );

    expect(resolved?._id).toBe("org_operator");
  });

  it("fails closed for implicit webchat routing when Mother is the only active candidate", () => {
    const resolved = resolveActiveAgentForOrgCandidates<Candidate>(
      [
        buildMotherSupportCandidate({
          customProperties: {
            agentClass: "internal_operator",
            authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
            identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
            runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
            channelBindings: [{ channel: "webchat", enabled: true }],
          },
        }),
      ],
      { channel: "webchat" },
    );

    expect(resolved).toBeNull();
  });

  it("fails closed for phone routing even if Mother is misconfigured as external customer-facing", () => {
    const resolved = resolveActiveAgentForOrgCandidates<Candidate>(
      [
        buildMotherSupportCandidate({
          customProperties: {
            agentClass: "external_customer_facing",
            authorityRole: PLATFORM_MOTHER_AUTHORITY_ROLE,
            identityRole: PLATFORM_MOTHER_IDENTITY_ROLE,
            runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
            channelBindings: [{ channel: "phone_call", enabled: true }],
          },
        }),
      ],
      { channel: "phone_call" },
    );

    expect(resolved).toBeNull();
  });
});
