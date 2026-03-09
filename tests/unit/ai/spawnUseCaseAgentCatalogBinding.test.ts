import { beforeEach, describe, expect, it, vi } from "vitest";

const REF_REQUIRE_AUTH = "__require_auth__";
const REF_REQUIRE_PERMISSION = "__require_permission__";
const REF_CLONE_PREFLIGHT = "__clone_preflight__";
const REF_SPAWN_USE_CASE_AGENT = "__spawn_use_case_agent__";
const REF_GET_AGENT_INTERNAL = "__get_agent_internal__";

vi.mock("../../../convex/_generated/api", () => ({
  internal: {
    rbacHelpers: {
      requireAuthenticatedUserQuery: "__require_auth__",
      requirePermissionMutation: "__require_permission__",
    },
    ai: {
      workerPool: {
        spawnUseCaseAgent: "__spawn_use_case_agent__",
      },
      agentExecution: {
        recordStoreActivationEntitlementDecision: "__record_entitlement_decision__",
      },
    },
    agentOntology: {
      getAgentInternal: "__get_agent_internal__",
    },
  },
  api: {
    ai: {
      agentStoreCatalog: {
        getClonePreflight: "__clone_preflight__",
      },
    },
  },
}));

import { spawn_use_case_agent } from "../../../convex/ai/agentExecution";

type ActionCtx = {
  runQuery: ReturnType<typeof vi.fn>;
  runMutation: ReturnType<typeof vi.fn>;
};

function createCtx(overrides?: {
  preflightResult?: Record<string, unknown>;
  spawnResult?: Record<string, unknown>;
  cloneAgentResult?: Record<string, unknown> | null;
}): ActionCtx {
  const preflightResult = overrides?.preflightResult ?? {
    catalogAgentNumber: 42,
    card: {
      storefrontPackageDescriptor: {
        packageAccess: "included_in_plan",
        licenseModel: "included",
        activationHint: "activate_now",
      },
    },
    template: {
      templateAgentId: "objects_template_expected",
      hasTemplate: true,
      protectedTemplate: true,
    },
    capabilitySnapshot: {
      availableNow: [],
      blocked: [],
    },
    allowClone: true,
    entitlement: {
      allowed: true,
      reasonCode: "entitled_included_in_plan",
      guidance: "Activation is included in your current plan.",
      matchedEntitlementKeys: [],
      planTier: "pro",
    },
    requiredTools: ["create_ticket", "search_contacts"],
    requiredCapabilities: ["integration:resend", "tool:create_ticket"],
    noFitEscalation: {
      minimum: "minimum",
      deposit: "deposit",
      onboarding: "onboarding",
    },
  };
  const spawnResult = overrides?.spawnResult ?? {
    cloneAgentId: "objects_clone_1",
    reused: false,
    created: true,
    useCase: "Support",
    useCaseKey: "support",
    quota: {
      orgUsed: 1,
      templateUsed: 1,
      ownerUsed: 1,
      limits: {
        spawnEnabled: true,
        maxClonesPerOrg: 12,
        maxClonesPerTemplatePerOrg: 4,
        maxClonesPerOwner: 3,
        allowedPlaybooks: null,
      },
    },
  };
  const cloneAgentResult = overrides?.cloneAgentResult ?? {
    name: "Support Clone",
    customProperties: {
      isPrimary: true,
    },
  };

  const runQuery = vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
    if (args && typeof args === "object" && "catalogAgentNumber" in args) {
      return preflightResult;
    }
    if (args && typeof args === "object" && "agentId" in args) {
      return cloneAgentResult;
    }
    if (args && typeof args === "object" && "sessionId" in args) {
      return {
        userId: "users_owner",
        organizationId: "organizations_1",
      };
    }
    throw new Error("Unexpected runQuery invocation");
  });

  const runMutation = vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
    if (args && typeof args === "object" && "permission" in args) {
      return null;
    }
    if (args && typeof args === "object" && "decision" in args) {
      return null;
    }
    if (args && typeof args === "object" && "templateAgentId" in args) {
      return spawnResult;
    }
    throw new Error("Unexpected runMutation invocation");
  });

  return { runQuery, runMutation };
}

describe("spawn_use_case_agent catalog-bound contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed when catalogAgentNumber is missing", async () => {
    const ctx = createCtx();
    const result = await (spawn_use_case_agent as any)._handler(ctx, {
      sessionId: "sessions_1",
      organizationId: "organizations_1",
      templateAgentId: "objects_template_requested",
      useCase: "Support",
    });

    expect(result).toEqual({
      status: "blocked",
      reason: "catalog_template_mismatch",
      message:
        "Catalog clone preflight requires a valid catalogAgentNumber. Owner-facing clone spawning is catalog-bound.",
      allowClone: false,
    });
    expect(
      ctx.runQuery.mock.calls.some((call) => "catalogAgentNumber" in (call[1] || {}))
    ).toBe(false);
    expect(
      ctx.runMutation.mock.calls.some(
        (call) => call[1]?.templateAgentId === "objects_template_requested"
      )
    ).toBe(false);
  });

  it("blocks when preflight template and requested template differ", async () => {
    const ctx = createCtx({
      preflightResult: {
        catalogAgentNumber: 42,
        template: {
          templateAgentId: "objects_template_expected",
          hasTemplate: true,
          protectedTemplate: true,
        },
        card: {
          storefrontPackageDescriptor: {
            packageAccess: "included_in_plan",
            licenseModel: "included",
            activationHint: "activate_now",
          },
        },
        capabilitySnapshot: {
          availableNow: [],
          blocked: [],
        },
        allowClone: true,
        entitlement: {
          allowed: true,
          reasonCode: "entitled_included_in_plan",
          guidance: "Activation is included in your current plan.",
          matchedEntitlementKeys: [],
          planTier: "pro",
        },
        requiredTools: ["create_ticket", "search_contacts"],
        requiredCapabilities: ["integration:resend", "tool:create_ticket"],
        noFitEscalation: {
          minimum: "minimum",
          deposit: "deposit",
          onboarding: "onboarding",
        },
      },
    });

    const result = await (spawn_use_case_agent as any)._handler(ctx, {
      sessionId: "sessions_1",
      organizationId: "organizations_1",
      catalogAgentNumber: 42,
      templateAgentId: "objects_template_requested",
      useCase: "Support",
    });

    expect(result).toMatchObject({
      status: "blocked",
      reason: "catalog_template_mismatch",
      allowClone: false,
      catalogAgentNumber: 42,
    });
    expect(
      ctx.runMutation.mock.calls.some((call) => call[1]?.templateAgentId === "objects_template_requested")
    ).toBe(false);
  });

  it("blocks activation fail-closed when entitlement is denied", async () => {
    const ctx = createCtx({
      preflightResult: {
        catalogAgentNumber: 42,
        card: {
          storefrontPackageDescriptor: {
            packageAccess: "add_on_purchase",
            licenseModel: "seat",
            activationHint: "purchase_required",
            packageCode: "addon_growth",
            licenseSku: "sku_growth_001",
          },
        },
        template: {
          templateAgentId: "objects_template_expected",
          hasTemplate: true,
          protectedTemplate: true,
        },
        capabilitySnapshot: {
          availableNow: [],
          blocked: [],
        },
        allowClone: false,
        entitlement: {
          allowed: false,
          reasonCode: "blocked_purchase_required_not_owned",
          guidance: "Activation is blocked until your organization purchases 'addon_growth'.",
          matchedEntitlementKeys: [],
          planTier: "free",
        },
        requiredTools: ["create_ticket"],
        requiredCapabilities: ["tool:create_ticket"],
        noFitEscalation: {
          minimum: "minimum",
          deposit: "deposit",
          onboarding: "onboarding",
        },
      },
    });

    const result = await (spawn_use_case_agent as any)._handler(ctx, {
      sessionId: "sessions_1",
      organizationId: "organizations_1",
      catalogAgentNumber: 42,
      templateAgentId: "objects_template_expected",
      useCase: "Support",
    });

    expect(result).toMatchObject({
      status: "blocked",
      reason: "entitlement_blocked",
      reasonCode: "blocked_purchase_required_not_owned",
      allowClone: false,
      guidance: "Activation is blocked until your organization purchases 'addon_growth'.",
    });
    expect(
      ctx.runMutation.mock.calls.some((call) => call[0] === REF_SPAWN_USE_CASE_AGENT)
    ).toBe(false);
    expect(
      ctx.runMutation.mock.calls.some(
        (call) =>
          call[1]?.decision === "deny" &&
          call[1]?.reasonCode === "blocked_purchase_required_not_owned"
      )
    ).toBe(true);
  });

  it("allows spawn when catalog preflight template matches request", async () => {
    const ctx = createCtx();
    const result = await (spawn_use_case_agent as any)._handler(ctx, {
      sessionId: "sessions_1",
      organizationId: "organizations_1",
      catalogAgentNumber: 42,
      templateAgentId: "objects_template_expected",
      useCase: "Support",
    });

    expect(result).toMatchObject({
      status: "success",
      cloneAgentId: "objects_clone_1",
      templateAgentId: "objects_template_expected",
      allowClone: true,
      requiredTools: ["create_ticket", "search_contacts"],
      requiredCapabilities: ["integration:resend", "tool:create_ticket"],
    });
    expect(
      ctx.runMutation.mock.calls.some((call) => call[1]?.templateAgentId === "objects_template_expected")
    ).toBe(true);
    expect(
      ctx.runMutation.mock.calls.some(
        (call) =>
          call[1]?.decision === "allow" &&
          call[1]?.reasonCode === "entitled_included_in_plan"
      )
    ).toBe(true);
    const spawnMutationCall = ctx.runMutation.mock.calls.find(
      (call) =>
        call[1]?.templateAgentId === "objects_template_expected" &&
        "contractSourceCatalogAgentNumber" in (call[1] || {})
    );
    expect(spawnMutationCall?.[1]).toMatchObject({
      requiredTools: ["create_ticket", "search_contacts"],
      requiredCapabilities: ["integration:resend", "tool:create_ticket"],
      contractSourceCatalogAgentNumber: 42,
    });
  });
});
