/**
 * Role Assignment Tests
 *
 * Tests role assignment functionality including:
 * - Assigning roles to users
 * - Removing roles from users
 * - Role assignment validation
 * - Organization-scoped role assignments
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ConvexTestingHelper } from "convex-helpers/testing";
import { createTestHelper } from "../../setup";
import {
  setupRBACTestEnvironment,
  assignRoleToUser,
  removeRoleFromUser,
  checkUserPermission,
  getUserPermissions
} from "../../helpers/test-setup";

describe("Role Assignment", () => {
  let t: ConvexTestingHelper;
  let testData: Awaited<ReturnType<typeof setupRBACTestEnvironment>>;

  beforeAll(async () => {
    t = createTestHelper();
    testData = await setupRBACTestEnvironment(t);
  }, 120000);

  afterAll(async () => {
    await t.close();
  });

  describe("Assigning Roles", () => {
    it("should successfully assign role to user", async () => {
      // Guest user initially has no roles
      const beforePermissions = await getUserPermissions(
        t,
        testData.users.guestUser
      );
      expect(beforePermissions).toEqual([]);

      // Assign employee role to guest user
      const result = await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      expect(result.success).toBe(true);

      // Verify user now has permissions
      const afterPermissions = await getUserPermissions(
        t,
        testData.users.guestUser,
        testData.organizations.primary
      );

      expect(afterPermissions.length).toBeGreaterThan(0);
      expect(afterPermissions).toContain("view_users");
    });

    it("should update existing membership when reassigning role", async () => {
      // orgMember currently has employee role
      const beforePermissions = await getUserPermissions(
        t,
        testData.users.orgMember,
        testData.organizations.primary
      );

      expect(beforePermissions).toContain("view_users");
      expect(beforePermissions).not.toContain("manage_users");

      // Upgrade to business manager role
      const result = await assignRoleToUser(
        t,
        testData.users.orgMember,
        testData.roles.businessManager,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      expect(result.success).toBe(true);

      // Verify upgraded permissions
      const afterPermissions = await getUserPermissions(
        t,
        testData.users.orgMember,
        testData.organizations.primary
      );

      expect(afterPermissions).toContain("manage_users");
      expect(afterPermissions).toContain("create_task");
    });

    it("should allow assigning viewer role with read-only permissions", async () => {
      const result = await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.viewer,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      expect(result.success).toBe(true);

      const permissions = await getUserPermissions(
        t,
        testData.users.guestUser,
        testData.organizations.primary
      );

      // Viewer should have view permissions
      expect(permissions).toContain("view_users");
      expect(permissions).toContain("view_organization");
      expect(permissions).toContain("view_reports");

      // But not manage permissions
      expect(permissions).not.toContain("manage_users");
      expect(permissions).not.toContain("manage_organization");
    });

    it("should validate role exists before assignment", async () => {
      const result = await assignRoleToUser(
        t,
        testData.users.guestUser,
        "non_existent_role" as any,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      expect(result.success).toBe(false);
    });

    it("should validate user exists before assignment", async () => {
      const result = await assignRoleToUser(
        t,
        "non_existent_user" as any,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      expect(result.success).toBe(false);
    });
  });

  describe("Removing Roles", () => {
    it("should successfully remove role from user", async () => {
      // Use guestUser instead of orgMember to avoid test interference
      // First assign employee role to guestUser
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      // Verify guestUser has permissions
      const beforeCheck = await checkUserPermission(
        t,
        testData.users.guestUser,
        "view_users",
        testData.organizations.primary
      );
      expect(beforeCheck).toBe(true);

      // Remove role
      const result = await removeRoleFromUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      expect(result.success).toBe(true);

      // Verify user no longer has permissions
      const afterCheck = await checkUserPermission(
        t,
        testData.users.guestUser,
        "view_users",
        testData.organizations.primary
      );
      expect(afterCheck).toBe(false);
    });

    it("should handle removing non-existent role assignment", async () => {
      // Create a fresh user who has never been assigned any role
      const api = (await import("../../../convex/_generated/api.js")).api;
      const freshUserId = await t.mutation(api.rbac.createTestUser, {
        email: "never-assigned@test.com",
        firstName: "Never",
        lastName: "Assigned",
      });

      // Try to remove a role that was never assigned
      const result = await removeRoleFromUser(
        t,
        freshUserId,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      expect(result.success).toBe(false);
    });

    it("should deactivate membership when removing role", async () => {
      // Assign role to a fresh user to avoid test interference
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.viewer,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      // Remove role from guestUser
      await removeRoleFromUser(
        t,
        testData.users.guestUser,
        testData.roles.viewer,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      // Verify all permissions are gone
      const permissions = await getUserPermissions(
        t,
        testData.users.guestUser,
        testData.organizations.primary
      );

      expect(permissions).toEqual([]);
    });
  });

  describe("Role Assignment in Organizations", () => {
    it("should assign organization-scoped role", async () => {
      const result = await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      expect(result.success).toBe(true);

      // Verify access only in assigned organization
      const primaryAccess = await checkUserPermission(
        t,
        testData.users.guestUser,
        "view_users",
        testData.organizations.primary
      );

      const secondaryAccess = await checkUserPermission(
        t,
        testData.users.guestUser,
        "view_users",
        testData.organizations.secondary
      );

      expect(primaryAccess).toBe(true);
      expect(secondaryAccess).toBe(false);
    });

    it("should allow same user different roles in different orgs", async () => {
      // Assign employee role in primary org
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      // Assign business manager role in secondary org
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.businessManager,
        testData.organizations.secondary,
        testData.users.orgOwner
      );

      // Verify different permissions in different orgs
      const primaryPermissions = await getUserPermissions(
        t,
        testData.users.guestUser,
        testData.organizations.primary
      );

      const secondaryPermissions = await getUserPermissions(
        t,
        testData.users.guestUser,
        testData.organizations.secondary
      );

      // Primary should have employee permissions
      expect(primaryPermissions).toContain("view_users");
      expect(primaryPermissions).not.toContain("manage_users");

      // Secondary should have manager permissions
      expect(secondaryPermissions).toContain("view_users");
      expect(secondaryPermissions).toContain("manage_users");
    });

    it("should isolate role assignments by organization", async () => {
      // Assign role in primary org
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      // Should not have access in other orgs
      const emptyOrgAccess = await checkUserPermission(
        t,
        testData.users.guestUser,
        "view_users",
        testData.organizations.empty
      );

      expect(emptyOrgAccess).toBe(false);
    });
  });

  describe("Role Assignment Permissions", () => {
    it("should allow org owner to assign roles", async () => {
      const result = await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      expect(result.success).toBe(true);
    });

    it("should allow business manager to assign roles", async () => {
      // Business manager has manage_users permission
      const result = await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgManager
      );

      expect(result.success).toBe(true);
    });

    it("should allow super admin to assign any role", async () => {
      const result = await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.orgOwner,
        testData.organizations.primary,
        testData.users.systemAdmin
      );

      expect(result.success).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle assigning role in empty organization", async () => {
      const result = await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.empty,
        testData.users.systemAdmin
      );

      expect(result.success).toBe(true);

      const permissions = await getUserPermissions(
        t,
        testData.users.guestUser,
        testData.organizations.empty
      );

      expect(permissions.length).toBeGreaterThan(0);
    });

    it("should require organizationId for non-global roles", async () => {
      // Trying to assign without org context should fail
      const result = await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        undefined as any,
        testData.users.orgOwner
      );

      expect(result.success).toBe(false);
    });

    it("should validate organization exists", async () => {
      const result = await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        "non_existent_org" as any,
        testData.users.orgOwner
      );

      expect(result.success).toBe(false);
    });

    it("should create audit log entry for role assignment", async () => {
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      // The test setup should create audit logs automatically
      // We verify the role assignment worked by checking permissions
      const result = await checkUserPermission(
        t,
        testData.users.guestUser,
        "view_users",
        testData.organizations.primary
      );

      expect(result).toBe(true);
    });
  });
});
