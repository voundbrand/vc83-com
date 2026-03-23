import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { bootstrapClientOrg } from "../../../convex/onboarding/agencySubOrgBootstrap";
import {
  AGENCY_CHILD_ORG_CUSTOMER_SERVICE_TEMPLATE_ROLE,
  AGENCY_CHILD_ORG_PM_TEMPLATE_ROLE,
} from "../../../convex/onboarding/seedPlatformAgents";

const PARENT_ORG_ID = "org_parent_agency" as Id<"organizations">;
const CHILD_ORG_ID = "org_child_agency" as Id<"organizations">;
const PARENT_OWNER_ID = "user_parent_owner" as Id<"users">;
const OPERATOR_AGENT_ID = "agent_child_operator" as Id<"objects">;
const PM_AGENT_ID = "agent_child_pm" as Id<"objects">;
const CUSTOMER_AGENT_ID = "agent_child_customer" as Id<"objects">;

function createBootstrapContext(args?: { failBaseline?: boolean }) {
  const mutationPayloads: Array<Record<string, unknown>> = [];
  const runQuery = vi
    .fn()
    .mockResolvedValueOnce({
      features: { subOrgsEnabled: true },
      limits: { maxSubOrganizations: 10 },
    })
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce({
      _id: PARENT_ORG_ID,
      slug: "agency-parent",
      createdBy: PARENT_OWNER_ID,
    })
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce([PARENT_OWNER_ID]);

  const runMutation = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
    mutationPayloads.push(payload);
    if (mutationPayloads.length === 1) {
      return { childOrganizationId: CHILD_ORG_ID };
    }
    if (mutationPayloads.length === 2) {
      if (args?.failBaseline) {
        throw new Error(
          "OPERATOR_AUTHORITY_BOOTSTRAP_FAILED: Protected template role not found on platform org: personal_life_operator_template."
        );
      }
      return {
        organizationId: CHILD_ORG_ID,
        operatorAgentId: OPERATOR_AGENT_ID,
        operatorProvisioningAction: "template_clone_created",
      };
    }
    if (mutationPayloads.length === 3) {
      return {
        agentId: PM_AGENT_ID,
        provisioningAction: "template_clone_created",
      };
    }
    if (mutationPayloads.length === 4) {
      return {
        agentId: CUSTOMER_AGENT_ID,
        provisioningAction: "template_clone_created",
      };
    }
    return { success: true };
  });

  return {
    ctx: {
      runQuery,
      runMutation,
      runAction: vi.fn(),
    },
    runQuery,
    runMutation,
    mutationPayloads,
  };
}

describe("agency child-org bootstrap hardening", () => {
  it("uses the shared org baseline, provisions strict operator authority, and adds PM/customer specialists", async () => {
    const { ctx, mutationPayloads } = createBootstrapContext();

    const result = await (bootstrapClientOrg as any)._handler(ctx, {
      parentOrganizationId: PARENT_ORG_ID,
      businessName: "Apotheke Adler",
      industry: "pharmacy",
      description: "Neighborhood pharmacy with repeat prescription coordination.",
      targetAudience: "elderly patients and busy families",
      language: "de",
      tonePreference: "warm and precise",
      agentNameHint: "Apotheke Adler PM",
    });

    expect(result.success).toBe(true);
    expect(result.childOrganizationId).toBe(CHILD_ORG_ID);
    expect(result.operatorAgentId).toBe(OPERATOR_AGENT_ID);
    expect(result.projectManagerAgentId).toBe(PM_AGENT_ID);
    expect(result.customerServiceAgentId).toBe(CUSTOMER_AGENT_ID);
    expect(result.agentId).toBe(PM_AGENT_ID);

    expect(mutationPayloads[1]).toMatchObject({
      organizationId: CHILD_ORG_ID,
      createdByUserId: PARENT_OWNER_ID,
      ownerUserIds: [PARENT_OWNER_ID],
      appProvisioningUserId: PARENT_OWNER_ID,
      language: "de",
      industry: "pharmacy",
      description: "Neighborhood pharmacy with repeat prescription coordination.",
      appSurface: "platform_web",
    });
    expect(mutationPayloads[2]).toMatchObject({
      organizationId: CHILD_ORG_ID,
      templateRole: AGENCY_CHILD_ORG_PM_TEMPLATE_ROLE,
      subtype: "pm",
      agentClass: "internal_operator",
      operatorId: "__org_default__",
      isPrimary: false,
      name: "Apotheke Adler PM",
    });
    expect(mutationPayloads[3]).toMatchObject({
      organizationId: CHILD_ORG_ID,
      templateRole: AGENCY_CHILD_ORG_CUSTOMER_SERVICE_TEMPLATE_ROLE,
      subtype: "customer_service",
      agentClass: "external_customer_facing",
      isPrimary: false,
      name: "Apotheke Adler Customer Service",
    });
    expect(mutationPayloads[4]).toMatchObject({
      organizationId: CHILD_ORG_ID,
      slug: "apotheke-adler",
      targetAgentId: CUSTOMER_AGENT_ID,
    });
    expect(ctx.runAction).not.toHaveBeenCalled();
  });

  it("fails closed when the shared operator baseline cannot resolve the strict template-backed authority agent", async () => {
    const { ctx, mutationPayloads } = createBootstrapContext({ failBaseline: true });

    await expect(
      (bootstrapClientOrg as any)._handler(ctx, {
        parentOrganizationId: PARENT_ORG_ID,
        businessName: "Apotheke Adler",
        industry: "pharmacy",
        description: "Neighborhood pharmacy with repeat prescription coordination.",
        targetAudience: "elderly patients and busy families",
      })
    ).rejects.toThrow(
      "OPERATOR_AUTHORITY_BOOTSTRAP_FAILED: Protected template role not found on platform org: personal_life_operator_template."
    );

    expect(mutationPayloads).toHaveLength(2);
    expect(ctx.runAction).not.toHaveBeenCalled();
  });
});
