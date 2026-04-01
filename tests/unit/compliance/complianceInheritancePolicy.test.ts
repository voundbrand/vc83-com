import { describe, expect, it } from "vitest";
import { hasOrgOwnerDecisionAuthority } from "../../../convex/complianceControlPlane";

describe("compliance inheritance authority policy", () => {
  it("allows org-owner local decision authority", () => {
    expect(
      hasOrgOwnerDecisionAuthority({
        isOrgOwner: true,
        isSuperAdmin: false,
        isPlatformOrg: false,
      }),
    ).toBe(true);
  });

  it("blocks super-admin from org-local decision mutation paths", () => {
    expect(
      hasOrgOwnerDecisionAuthority({
        isOrgOwner: false,
        isSuperAdmin: true,
        isPlatformOrg: false,
      }),
    ).toBe(false);
  });

  it("stays fail-closed when both org-owner and super-admin flags are true", () => {
    expect(
      hasOrgOwnerDecisionAuthority({
        isOrgOwner: true,
        isSuperAdmin: true,
        isPlatformOrg: false,
      }),
    ).toBe(false);
  });

  it("allows super-admin mutation authority on configured platform org", () => {
    expect(
      hasOrgOwnerDecisionAuthority({
        isOrgOwner: false,
        isSuperAdmin: true,
        isPlatformOrg: true,
      }),
    ).toBe(true);
  });
});
