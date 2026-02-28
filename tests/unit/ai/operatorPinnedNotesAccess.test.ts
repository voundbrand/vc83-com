import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { evaluateOperatorPinnedNotesAccess } from "../../../convex/ai/agentSessions";

const ORG_A = "org_a" as Id<"organizations">;
const ORG_B = "org_b" as Id<"organizations">;

describe("operator pinned notes RBAC", () => {
  it("allows org-scoped reads when session org matches and permission is present", () => {
    const decision = evaluateOperatorPinnedNotesAccess({
      action: "read",
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: ORG_A,
      isSuperAdmin: false,
      hasPermission: true,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.requiredPermission).toBe("view_organization");
  });

  it("fails closed on permission miss for reads", () => {
    const decision = evaluateOperatorPinnedNotesAccess({
      action: "read",
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: ORG_A,
      isSuperAdmin: false,
      hasPermission: false,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("missing_permission");
  });

  it("fails closed on cross-tenant scope for non-super-admin writes", () => {
    const decision = evaluateOperatorPinnedNotesAccess({
      action: "create",
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: ORG_B,
      isSuperAdmin: false,
      hasPermission: true,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.requiredPermission).toBe("manage_organization");
    expect(decision.reason).toBe("session_org_mismatch");
  });

  it("allows super-admin cross-org writes when permission check passes", () => {
    const decision = evaluateOperatorPinnedNotesAccess({
      action: "delete",
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: ORG_B,
      isSuperAdmin: true,
      hasPermission: true,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.requiredPermission).toBe("manage_organization");
  });
});
