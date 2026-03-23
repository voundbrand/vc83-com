import { describe, expect, it, vi } from "vitest";

import { ensureOperatorAuthorityBootstrapInternal } from "../../../convex/organizations";

describe("platform Mother bootstrap invariants", () => {
  it("reuses the shared operator bootstrap invariant for authenticated org authority", async () => {
    const runMutation = vi
      .fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({
        agentId: "objects_operator_clone",
        provisioningAction: "template_clone_created",
        authorityChannel: "desktop",
        templateAgentId: "objects_operator_template",
        templateResolutionSource: "platform_template_role",
      });

    const result = await (ensureOperatorAuthorityBootstrapInternal as any)._handler(
      { runMutation },
      {
        organizationId: "organizations_customer",
        appSurface: "platform_web",
      },
    );

    expect(runMutation).toHaveBeenCalledTimes(2);
    expect(runMutation.mock.calls[0]?.[1]).toEqual({
      organizationId: "organizations_customer",
    });
    expect(runMutation.mock.calls[1]?.[1]).toEqual({
      organizationId: "organizations_customer",
      appSurface: "platform_web",
    });
    expect(result).toEqual({
      organizationId: "organizations_customer",
      operatorAgentId: "objects_operator_clone",
      operatorProvisioningAction: "template_clone_created",
      authorityChannel: "desktop",
      templateAgentId: "objects_operator_template",
      templateResolutionSource: "platform_template_role",
      appSurface: "platform_web",
    });
  });

  it("fails closed when the managed One-of-One Operator clone is not returned", async () => {
    const runMutation = vi
      .fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({
        provisioningAction: "template_clone_created",
      });

    await expect(
      (ensureOperatorAuthorityBootstrapInternal as any)._handler(
        { runMutation },
        {
          organizationId: "organizations_customer",
          appSurface: "operator_mobile",
        },
      ),
    ).rejects.toThrow(/OPERATOR_AUTHORITY_BOOTSTRAP_FAILED/i);
  });
});
