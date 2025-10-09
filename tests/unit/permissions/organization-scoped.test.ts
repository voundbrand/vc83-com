/**
 * Organization-Scoped Permission Tests
 *
 * Tests organization-level access control including:
 * - Organization membership verification
 * - Cross-organization access prevention
 * - Organization-specific permissions
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ConvexTestingHelper } from "convex-helpers/testing";
import { createTestHelper } from "../../setup";
import {
  setupRBACTestEnvironment,
  checkUserPermission,
  getUserPermissions
} from "../../helpers/test-setup";

describe("Organization-Scoped Permissions", () => {
  let t: ConvexTestingHelper;
  let testData: Awaited<ReturnType<typeof setupRBACTestEnvironment>>;

  beforeAll(async () => {
    t = createTestHelper();
    testData = await setupRBACTestEnvironment(t);
  }, 120000);

  afterAll(async () => {
    await t.close();
  });

  describe("Organization Membership Verification", () => {
    it("should allow member to access their organization resources", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_users",
        testData.organizations.primary
      );

      expect(result).toBe(true);
    });

    it("should deny non-member from accessing organization resources", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.guestUser,
        "view_users",
        testData.organizations.primary
      );

      expect(result).toBe(false);
    });

    it("should verify user can view organization they belong to", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_organization",
        testData.organizations.primary
      );

      expect(result).toBe(true);
    });

    it("should return false for non-member access attempt", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.guestUser,
        "view_organization",
        testData.organizations.primary
      );

      expect(result).toBe(false);
    });
  });

  describe("Cross-Organization Access Prevention", () => {
    it("should deny access to resources in different organization", async () => {
      // orgMember is only in primary org, not secondary
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_users",
        testData.organizations.secondary
      );

      expect(result).toBe(false);
    });

    it("should prevent user from reading cross-org data", async () => {
      const primaryAccess = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_organization",
        testData.organizations.primary
      );

      const secondaryAccess = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_organization",
        testData.organizations.secondary
      );

      expect(primaryAccess).toBe(true);
      expect(secondaryAccess).toBe(false);
    });

    it("should isolate organization data access", async () => {
      // User in primary org should not access secondary org operations
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_operations",
        testData.organizations.secondary
      );

      expect(result).toBe(false);
    });
  });

  describe("Organization-Specific Permissions", () => {
    it("should grant organization owner full access to their org", async () => {
      const readAccess = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "view_organization",
        testData.organizations.primary
      );

      const updateAccess = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "manage_organization",
        testData.organizations.primary
      );

      const manageUsers = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "manage_users",
        testData.organizations.primary
      );

      expect(readAccess).toBe(true);
      expect(updateAccess).toBe(true);
      expect(manageUsers).toBe(true);
    });

    it("should restrict member access within organization", async () => {
      const readAccess = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_users",
        testData.organizations.primary
      );

      const manageAccess = await checkUserPermission(
        t,
        testData.users.orgMember,
        "manage_users",
        testData.organizations.primary
      );

      expect(readAccess).toBe(true);
      expect(manageAccess).toBe(false);
    });

    it("should apply organization-scoped role permissions", async () => {
      const permissions = await getUserPermissions(
        t,
        testData.users.orgManager,
        testData.organizations.primary
      );

      expect(permissions).toContain("view_users");
      expect(permissions).toContain("manage_users");
      expect(permissions).toContain("view_organization");
    });
  });

  describe("Multi-Organization Access", () => {
    it("should allow user to access multiple organizations they belong to", async () => {
      // orgOwner is in both primary and secondary orgs
      const primaryAccess = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "view_organization",
        testData.organizations.primary
      );

      const secondaryAccess = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "view_organization",
        testData.organizations.secondary
      );

      expect(primaryAccess).toBe(true);
      expect(secondaryAccess).toBe(true);
    });

    it("should have same role permissions in all organizations user belongs to", async () => {
      const primaryPerms = await getUserPermissions(
        t,
        testData.users.orgOwner,
        testData.organizations.primary
      );

      const secondaryPerms = await getUserPermissions(
        t,
        testData.users.orgOwner,
        testData.organizations.secondary
      );

      // Should have org owner permissions in both
      expect(primaryPerms).toContain("manage_organization");
      expect(secondaryPerms).toContain("manage_organization");
    });
  });

  describe("Organization Admin Capabilities", () => {
    it("should allow org admin to manage users within organization", async () => {
      const manageUsers = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "manage_users",
        testData.organizations.primary
      );

      const manageRoles = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "manage_roles",
        testData.organizations.primary
      );

      expect(manageUsers).toBe(true);
      expect(manageRoles).toBe(true);
    });

    it("should allow org admin to view all organization data", async () => {
      const viewUsers = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "view_users",
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
      expect(viewOperations).toBe(true);
      expect(viewReports).toBe(true);
    });

    it("should allow org admin to manage financial operations", async () => {
      const manageFinancials = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "manage_financials",
        testData.organizations.primary
      );

      const createInvoice = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "create_invoice",
        testData.organizations.primary
      );

      const approveInvoice = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "approve_invoice",
        testData.organizations.primary
      );

      expect(manageFinancials).toBe(true);
      expect(createInvoice).toBe(true);
      expect(approveInvoice).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty organization gracefully", async () => {
      // systemAdmin is super admin, should have access everywhere
      const result = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "view_users",
        testData.organizations.empty
      );

      expect(result).toBe(true);
    });

    it("should handle non-existent organization", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_users",
        "non_existent_org" as any
      );

      expect(result).toBe(false);
    });

    it("should require organization for non-global users", async () => {
      // Regular users need org context
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_users"
      );

      expect(result).toBe(false);
    });

    it("should allow super admin without org context", async () => {
      // Super admin can work without org context
      const result = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "manage_organization"
      );

      expect(result).toBe(true);
    });
  });
});
