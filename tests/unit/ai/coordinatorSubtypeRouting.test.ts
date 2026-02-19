import { describe, expect, it, vi } from "vitest";
import {
  delegateToChildTool,
  escalateToParentTool,
} from "../../../convex/ai/tools/coordinatorTools";
import type { ToolExecutionContext } from "../../../convex/ai/tools/registry";

function createToolContext(overrides?: Partial<ToolExecutionContext>) {
  return {
    organizationId: "org_source" as never,
    userId: "user_1" as never,
    agentId: "agent_source" as never,
    runQuery: vi.fn(),
    runMutation: vi.fn(),
    ...overrides,
  } as ToolExecutionContext & {
    runQuery: ReturnType<typeof vi.fn>;
    runMutation: ReturnType<typeof vi.fn>;
  };
}

describe("coordinator subtype-aware routing", () => {
  it("requests parent PM subtype during escalation routing", async () => {
    const ctx = createToolContext();

    ctx.runQuery
      .mockResolvedValueOnce({
        parentOrganizationId: "org_parent",
        name: "Child Org",
      })
      .mockResolvedValueOnce({
        _id: "agent_parent_pm",
        name: "Parent PM",
      });

    ctx.runMutation
      .mockResolvedValueOnce("escalation_1")
      .mockResolvedValueOnce("notification_1");

    const result = await escalateToParentTool.execute(ctx, {
      summary: "Billing conflict",
      severity: "high",
      context: "Customer disputed invoice #42",
    });

    expect(ctx.runQuery).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        organizationId: "org_parent",
        subtype: "pm",
      })
    );

    expect(ctx.runMutation).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        targetOrganizationId: "org_parent",
        targetAgentId: "agent_parent_pm",
      })
    );

    expect(ctx.runMutation).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        targetOrganizationId: "org_parent",
        targetAgentId: "agent_parent_pm",
        notificationType: "escalation",
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        escalationId: "escalation_1",
      })
    );
  });

  it("keeps delegation behavior when no PM subtype match exists", async () => {
    const ctx = createToolContext({
      organizationId: "org_agency" as never,
    });

    ctx.runQuery
      .mockResolvedValueOnce({
        _id: "org_client",
        name: "Client Org",
        slug: "client-org",
        parentOrganizationId: "org_agency",
      })
      .mockResolvedValueOnce(null);

    ctx.runMutation.mockResolvedValueOnce("delegation_1");

    const result = await delegateToChildTool.execute(ctx, {
      clientSlug: "client-org",
      instruction: "Update onboarding checklist",
      priority: "medium",
    });

    expect(ctx.runQuery).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        organizationId: "org_client",
        subtype: "pm",
      })
    );

    expect(ctx.runMutation).toHaveBeenCalledTimes(1);
    expect(ctx.runMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        targetOrganizationId: "org_client",
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        delegationId: "delegation_1",
      })
    );
  });
});
