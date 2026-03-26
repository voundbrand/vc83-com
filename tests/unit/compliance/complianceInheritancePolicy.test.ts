import { describe, expect, it } from "vitest";
import { hasOrgOwnerDecisionAuthority } from "../../../convex/complianceControlPlane";

describe("compliance inheritance authority policy", () => {
  it("allows org-owner local decision authority", () => {
    expect(
      hasOrgOwnerDecisionAuthority({
        isOrgOwner: true,
        isSuperAdmin: false,
      }),
    ).toBe(true);
  });

  it("blocks super-admin from org-local decision mutation paths", () => {
    expect(
      hasOrgOwnerDecisionAuthority({
        isOrgOwner: false,
        isSuperAdmin: true,
      }),
    ).toBe(false);
  });

  it("stays fail-closed when both org-owner and super-admin flags are true", () => {
    expect(
      hasOrgOwnerDecisionAuthority({
        isOrgOwner: true,
        isSuperAdmin: true,
      }),
    ).toBe(false);
  });
});
