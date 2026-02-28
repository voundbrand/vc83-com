import { describe, expect, it } from "vitest";
import { resolveSingleTenantContext } from "../../../convex/integrations/tenantResolver";

describe("integration tenant resolver", () => {
  it("resolves exactly one candidate", () => {
    const resolution = resolveSingleTenantContext([{ id: "connection-1" }]);
    expect(resolution).toEqual({
      status: "resolved",
      context: { id: "connection-1" },
    });
  });

  it("fails closed for missing candidates", () => {
    const resolution = resolveSingleTenantContext([]);
    expect(resolution).toEqual({
      status: "missing",
      reason: "no_matching_installation",
    });
  });

  it("fails closed for ambiguous candidates", () => {
    const resolution = resolveSingleTenantContext([
      { id: "connection-1" },
      { id: "connection-2" },
    ]);

    expect(resolution).toEqual({
      status: "ambiguous",
      reason: "ambiguous_installation_match",
      candidateCount: 2,
    });
  });
});

