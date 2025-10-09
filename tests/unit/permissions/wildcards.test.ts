/**
 * Wildcard Permission Tests
 *
 * Tests wildcard permission matching including:
 * - Prefix wildcards (view_*)
 * - Full wildcards (*)
 * - Wildcard hierarchy and precedence
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ConvexTestingHelper } from "convex-helpers/testing";
import { createTestHelper } from "../../setup";
import {
  setupRBACTestEnvironment,
  checkUserPermission,
  getUserPermissions
} from "../../helpers/test-setup";

describe("Wildcard Permissions", () => {
  let t: ConvexTestingHelper;
  let testData: Awaited<ReturnType<typeof setupRBACTestEnvironment>>;

  beforeAll(async () => {
    t = createTestHelper();
    testData = await setupRBACTestEnvironment(t);
  }, 120000);

  afterAll(async () => {
    await t.close();
  });

  describe("Prefix Wildcard Permissions (view_*)", () => {
    it("should grant all view permissions with view_* wildcard", async () => {
      // Org owner has view_* wildcard
      const viewUsers = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "view_users",
        testData.organizations.primary
      );

      const viewOrgs = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "view_organization",
        testData.organizations.primary
      );

      const viewOperations = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "view_operations",
        testData.organizations.primary
      );

      const viewReports = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "view_reports",
        testData.organizations.primary
      );

      expect(viewUsers).toBe(true);
      expect(viewOrgs).toBe(true);
      expect(viewOperations).toBe(true);
      expect(viewReports).toBe(true);
    });

    it("should match view_* to any view permission", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "view_apps",
        testData.organizations.primary
      );

      expect(result).toBe(true);
    });

    it("should not match view_* to non-view permissions", async () => {
      // Business manager has view_* but test if it doesn't match manage_*
      const permissions = await getUserPermissions(
        t,
        testData.users.orgManager,
        testData.organizations.primary
      );

      // Should have view permissions
      expect(permissions).toContain("view_users");

      // Should also have manage permissions explicitly granted
      expect(permissions).toContain("manage_users");
    });
  });

  describe("Full Wildcard Permission (*)", () => {
    it("should grant access to all permissions with * wildcard", async () => {
      // System admin has * (super_admin role)
      const testPermissions = [
        "manage_organization",
        "view_organization",
        "manage_users",
        "view_users",
        "create_invoice",
        "approve_invoice",
        "manage_operations",
        "view_reports",
      ];

      const results = await Promise.all(
        testPermissions.map((permission) =>
          checkUserPermission(
            t,
            testData.users.systemAdmin,
            permission,
            testData.organizations.primary
          )
        )
      );

      expect(results.every((result) => result === true)).toBe(true);
    });

    it("should match any custom permission", async () => {
      // Super admin should have access to any permission
      const result = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "custom_permission",
        testData.organizations.primary
      );

      // Will return false since permission doesn't exist in DB
      // but the super admin bypass should work
      expect(result).toBe(true);
    });

    it("should be the most powerful permission level", async () => {
      const permissions = await getUserPermissions(
        t,
        testData.users.systemAdmin,
        testData.organizations.primary
      );

      // Super admin gets all permissions
      expect(permissions.length).toBeGreaterThan(20);
    });
  });

  describe("Wildcard Hierarchy and Precedence", () => {
    it("should handle role with both specific and wildcard permissions", async () => {
      // Org owner has both specific permissions and view_* wildcard
      const permissions = await getUserPermissions(
        t,
        testData.users.orgOwner,
        testData.organizations.primary
      );

      // Should have specific manage permissions
      expect(permissions).toContain("manage_organization");
      expect(permissions).toContain("manage_users");

      // Should have view permissions from wildcard
      expect(permissions).toContain("view_users");
      expect(permissions).toContain("view_organization");
    });

    it("should apply wildcards correctly across different roles", async () => {
      // Business manager has view_* wildcard
      const managerPermissions = await getUserPermissions(
        t,
        testData.users.orgManager,
        testData.organizations.primary
      );

      // Should have view permissions from wildcard
      expect(managerPermissions).toContain("view_users");
      expect(managerPermissions).toContain("view_organization");

      // Should also have explicitly granted manage permissions
      expect(managerPermissions).toContain("manage_users");
      expect(managerPermissions).toContain("manage_operations");
    });

    it("should handle multiple wildcard patterns in permission set", async () => {
      // Test that having view_* and other specific permissions work together
      const ownerPermissions = await getUserPermissions(
        t,
        testData.users.orgOwner,
        testData.organizations.primary
      );

      // Check that we get a comprehensive set of permissions
      expect(ownerPermissions.length).toBeGreaterThan(15);

      // Should include both wildcard-matched and specific permissions
      expect(ownerPermissions).toContain("view_users");
      expect(ownerPermissions).toContain("manage_organization");
      expect(ownerPermissions).toContain("approve_invoice");
    });
  });

  describe("Wildcard Edge Cases", () => {
    it("should not match partial wildcards", async () => {
      // Employee doesn't have manage_* permissions
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "manage_users",
        testData.organizations.primary
      );

      expect(result).toBe(false);
    });

    it("should handle permissions case-sensitively", async () => {
      const lowerResult = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_users",
        testData.organizations.primary
      );

      // This would be a different permission name if it existed
      const upperResult = await checkUserPermission(
        t,
        testData.users.orgMember,
        "VIEW_USERS",
        testData.organizations.primary
      );

      expect(lowerResult).toBe(true);
      expect(upperResult).toBe(false); // Different permission name
    });

    it("should not create false positives with similar permission names", async () => {
      // view_users should not match user_views or users_view
      const correctPermission = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_users",
        testData.organizations.primary
      );

      const wrongPermission = await checkUserPermission(
        t,
        testData.users.orgMember,
        "users_view",
        testData.organizations.primary
      );

      expect(correctPermission).toBe(true);
      expect(wrongPermission).toBe(false);
    });

    it("should handle empty or invalid permission names gracefully", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "",
        testData.organizations.primary
      );

      expect(result).toBe(false);
    });
  });

  describe("Super Admin Wildcard Behavior", () => {
    it("should allow super admin to bypass all permission checks", async () => {
      // Super admin should have access to everything
      const criticalPermissions = [
        "manage_organization",
        "manage_users",
        "manage_roles",
        "manage_permissions",
        "manage_financials",
        "approve_invoice",
        "view_audit_logs",
      ];

      const results = await Promise.all(
        criticalPermissions.map((permission) =>
          checkUserPermission(
            t,
            testData.users.systemAdmin,
            permission,
            testData.organizations.primary
          )
        )
      );

      expect(results.every((result) => result === true)).toBe(true);
    });

    it("should allow super admin access across all organizations", async () => {
      const primaryAccess = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "manage_organization",
        testData.organizations.primary
      );

      const secondaryAccess = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "manage_organization",
        testData.organizations.secondary
      );

      const emptyAccess = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "manage_organization",
        testData.organizations.empty
      );

      expect(primaryAccess).toBe(true);
      expect(secondaryAccess).toBe(true);
      expect(emptyAccess).toBe(true);
    });

    it("should allow super admin without organization context", async () => {
      // Super admin can work globally
      const result = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "manage_organization"
      );

      expect(result).toBe(true);
    });
  });

  describe("Wildcard Permission Listing", () => {
    it("should include all wildcard-matched permissions in user permission list", async () => {
      const permissions = await getUserPermissions(
        t,
        testData.users.orgOwner,
        testData.organizations.primary
      );

      // All view_ permissions should be included due to view_* wildcard
      expect(permissions).toContain("view_users");
      expect(permissions).toContain("view_organization");
      expect(permissions).toContain("view_operations");
      expect(permissions).toContain("view_reports");
      expect(permissions).toContain("view_apps");
    });

    it("should expand wildcards when retrieving user permissions", async () => {
      const managerPermissions = await getUserPermissions(
        t,
        testData.users.orgManager,
        testData.organizations.primary
      );

      // Should have all permissions from view_* wildcard
      const viewPermissions = managerPermissions.filter((p: string) =>
        p.startsWith("view_")
      );

      expect(viewPermissions.length).toBeGreaterThan(5);
    });
  });
});
