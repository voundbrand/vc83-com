import { describe, expect, it, vi } from "vitest";
import { createOrganization } from "../../../convex/organizations";
import { buildTestKanzleiFixture } from "../../../convex/lib/kanzleiOnboardingFixture";

describe("Kanzlei manual org provisioning", () => {
  it("routes super-admin Kanzlei org creation through the shared baseline with full org metadata", async () => {
    const fixture = buildTestKanzleiFixture({ suffix: "admin-manual" });
    const baselineCalls: Array<Record<string, unknown>> = [];
    const auditCalls: Array<Record<string, unknown>> = [];

    const ctx = {
      runQuery: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
        if (Object.prototype.hasOwnProperty.call(payload, "sessionId")) {
          return {
            userId: "users_super_admin",
          };
        }

        if (Object.prototype.hasOwnProperty.call(payload, "slug")) {
          return null;
        }

        throw new Error(`Unexpected runQuery payload: ${JSON.stringify(payload)}`);
      }),
      runMutation: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
        if (Object.prototype.hasOwnProperty.call(payload, "permission")) {
          return null;
        }

        if (Object.prototype.hasOwnProperty.call(payload, "businessName")) {
          return "organizations_kanzlei_admin_manual";
        }

        if (Object.prototype.hasOwnProperty.call(payload, "appProvisioningUserId")) {
          baselineCalls.push(payload);
          return {
            organizationId: payload.organizationId,
            operatorAgentId: "agent_operator_admin_manual",
            operatorProvisioningAction: "template_clone_created",
          };
        }

        if (Object.prototype.hasOwnProperty.call(payload, "action")) {
          auditCalls.push(payload);
          return null;
        }

        throw new Error(`Unexpected runMutation payload: ${JSON.stringify(payload)}`);
      }),
    };

    const result = await (createOrganization as any)._handler(ctx, {
      sessionId: "sessions_super_admin",
      businessName: fixture.businessName,
      description: fixture.description,
      industry: fixture.industry,
      contactEmail: fixture.contactEmail,
      contactPhone: fixture.contactPhone,
      timezone: fixture.timezone,
      language: fixture.language,
      dateFormat: fixture.dateFormat,
      addCreatorAsOwner: false,
    });

    expect(result).toMatchObject({
      success: true,
      organizationId: "organizations_kanzlei_admin_manual",
      slug: "kanzlei-test-partner-admin-manual",
    });
    expect(baselineCalls).toHaveLength(1);
    expect(baselineCalls[0]).toMatchObject({
      organizationId: "organizations_kanzlei_admin_manual",
      createdByUserId: "users_super_admin",
      ownerUserIds: [],
      appProvisioningUserId: "users_super_admin",
      timezone: fixture.timezone,
      language: fixture.language,
      dateFormat: fixture.dateFormat,
      contactEmail: fixture.contactEmail,
      contactPhone: fixture.contactPhone,
      industry: fixture.industry,
      description: fixture.description,
      appSurface: "platform_web",
    });
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0]).toMatchObject({
      userId: "users_super_admin",
      organizationId: "organizations_kanzlei_admin_manual",
      action: "create_organization",
      success: true,
      metadata: {
        businessName: fixture.businessName,
        slug: "kanzlei-test-partner-admin-manual",
        addedCreatorAsOwner: false,
        isSubOrganization: false,
      },
    });
  });
});
