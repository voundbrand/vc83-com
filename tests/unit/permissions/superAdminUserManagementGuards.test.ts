import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  assertActorIsSuperAdmin,
  assertNotLastGlobalSuperAdmin,
  assertNotSelfDeactivation,
  assertNotSelfMembershipRemoval,
  assertOrgOwnerNotOrphaned,
} from "../../../convex/superAdminUserManagementGuards";

describe("super admin user management guards", () => {
  describe("permission gating", () => {
    it("throws when actor is not super admin", () => {
      expect(() => assertActorIsSuperAdmin(false)).toThrow(/Nur Super-Administratoren/);
    });

    it("allows when actor is super admin", () => {
      expect(() => assertActorIsSuperAdmin(true)).not.toThrow();
    });
  });

  describe("dangerous action safeguards", () => {
    it("blocks self deactivation", () => {
      expect(() =>
        assertNotSelfDeactivation("users_self" as unknown as Id<"users">, "users_self" as unknown as Id<"users">)
      ).toThrow(/Selbst-Deaktivierung/);
    });

    it("blocks deactivation of the last active super admin", () => {
      expect(() =>
        assertNotLastGlobalSuperAdmin({
          targetHasSuperAdminRole: true,
          activeSuperAdminCount: 1,
          nextIsActive: false,
        })
      ).toThrow(/letzte aktive Super-Administrator/);
    });

    it("allows deactivation when another active super admin exists", () => {
      expect(() =>
        assertNotLastGlobalSuperAdmin({
          targetHasSuperAdminRole: true,
          activeSuperAdminCount: 2,
          nextIsActive: false,
        })
      ).not.toThrow();
    });
  });

  describe("membership and role mutation invariants", () => {
    it("blocks self-removal from current session organization", () => {
      expect(() =>
        assertNotSelfMembershipRemoval(
          "users_admin" as unknown as Id<"users">,
          "users_admin" as unknown as Id<"users">,
          "organizations_a" as unknown as Id<"organizations">,
          "organizations_a" as unknown as Id<"organizations">
        )
      ).toThrow(/Selbst-Entfernung/);
    });

    it("blocks owner demotion/removal when it would orphan org ownership", () => {
      expect(() =>
        assertOrgOwnerNotOrphaned({
          targetIsOrgOwner: true,
          nextIsOrgOwner: false,
          remainingActiveOwnerCount: 0,
          organizationLabel: "Acme Org",
        })
      ).toThrow(/ohne aktiven Eigentümer/);
    });

    it("allows owner role changes when other owners remain", () => {
      expect(() =>
        assertOrgOwnerNotOrphaned({
          targetIsOrgOwner: true,
          nextIsOrgOwner: false,
          remainingActiveOwnerCount: 1,
          organizationLabel: "Acme Org",
        })
      ).not.toThrow();
    });
  });
});
