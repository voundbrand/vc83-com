/**
 * User Workflow Integration Tests
 *
 * Tests complete user workflows including:
 * - Role assignment → permission verification workflows
 * - User invitation → access grant workflows
 * - Permission changes → immediate effect verification
 * - Multi-organization user workflows
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ConvexTestingHelper } from "convex-helpers/testing";
import { createTestHelper } from "../setup";
import {
  setupRBACTestEnvironment,
  assignRoleToUser,
  removeRoleFromUser,
  checkUserPermission,
  getUserPermissions
} from "../helpers/test-setup";

describe("User Workflow Integration Tests", () => {
  let t: ConvexTestingHelper;
  let testData: Awaited<ReturnType<typeof setupRBACTestEnvironment>>;

  beforeAll(async () => {
    t = createTestHelper();
    testData = await setupRBACTestEnvironment(t);
  }, 120000);

  afterAll(async () => {
    await t.close();
  });

  describe("Organization Setup Workflow", () => {
    it("should verify org owner has full permissions after setup", async () => {
      // Verify owner has comprehensive permissions
      const manageOrg = await checkUserPermission(
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

      const manageFinancials = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "manage_financials",
        testData.organizations.primary
      );

      expect(manageOrg).toBe(true);
      expect(manageUsers).toBe(true);
      expect(manageFinancials).toBe(true);
    });

    it("should verify all view permissions for org owner", async () => {
      const permissions = await getUserPermissions(
        t,
        testData.users.orgOwner,
        testData.organizations.primary
      );

      // Owner should have all view permissions due to view_* wildcard
      expect(permissions).toContain("view_users");
      expect(permissions).toContain("view_organization");
      expect(permissions).toContain("view_operations");
      expect(permissions).toContain("view_reports");
      expect(permissions).toContain("view_apps");
    });
  });

  describe("User Invitation and Access Workflow", () => {
    it("should complete: assign role → verify appropriate access", async () => {
      // Guest user starts with no permissions
      const beforePermissions = await getUserPermissions(
        t,
        testData.users.guestUser
      );
      expect(beforePermissions).toEqual([]);

      // Assign employee role
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      // Verify employee can read but not manage
      const canRead = await checkUserPermission(
        t,
        testData.users.guestUser,
        "view_users",
        testData.organizations.primary
      );

      const canManage = await checkUserPermission(
        t,
        testData.users.guestUser,
        "manage_users",
        testData.organizations.primary
      );

      expect(canRead).toBe(true);
      expect(canManage).toBe(false);
    });

    it("should grant appropriate task execution permissions", async () => {
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      const canExecute = await checkUserPermission(
        t,
        testData.users.guestUser,
        "execute_task",
        testData.organizations.primary
      );

      const canCreateTask = await checkUserPermission(
        t,
        testData.users.guestUser,
        "create_task",
        testData.organizations.primary
      );

      const canAssignTask = await checkUserPermission(
        t,
        testData.users.guestUser,
        "assign_task",
        testData.organizations.primary
      );

      expect(canExecute).toBe(true);
      expect(canCreateTask).toBe(true);
      expect(canAssignTask).toBe(false); // Only managers can assign
    });
  });

  describe("Permission Change Propagation Workflow", () => {
    it("should complete: assign role → verify → upgrade role → verify new permissions", async () => {
      // Assign employee role first
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      // Verify employee permissions
      const canManageAsEmployee = await checkUserPermission(
        t,
        testData.users.guestUser,
        "manage_users",
        testData.organizations.primary
      );
      expect(canManageAsEmployee).toBe(false);

      // Upgrade to business manager
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.businessManager,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      // Verify upgraded permissions
      const canManageAsManager = await checkUserPermission(
        t,
        testData.users.guestUser,
        "manage_users",
        testData.organizations.primary
      );

      const canAssignTasks = await checkUserPermission(
        t,
        testData.users.guestUser,
        "assign_task",
        testData.organizations.primary
      );

      expect(canManageAsManager).toBe(true);
      expect(canAssignTasks).toBe(true);
    });

    it("should immediately revoke permissions when role is removed", async () => {
      // Verify orgMember has permissions
      const beforeRemove = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_users",
        testData.organizations.primary
      );
      expect(beforeRemove).toBe(true);

      // Remove role
      await removeRoleFromUser(
        t,
        testData.users.orgMember,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      // Verify permissions immediately revoked
      const afterRemove = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_users",
        testData.organizations.primary
      );
      expect(afterRemove).toBe(false);
    });
  });

  describe("Multi-Organization User Workflow", () => {
    it("should complete: user joins multiple orgs → verify isolated access", async () => {
      // Assign different roles in different organizations
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.businessManager,
        testData.organizations.secondary,
        testData.users.orgOwner
      );

      // Verify different permissions in each org
      const primaryPerms = await getUserPermissions(
        t,
        testData.users.guestUser,
        testData.organizations.primary
      );

      const secondaryPerms = await getUserPermissions(
        t,
        testData.users.guestUser,
        testData.organizations.secondary
      );

      // Primary (employee): read-only
      expect(primaryPerms).toContain("view_users");
      expect(primaryPerms).not.toContain("manage_users");

      // Secondary (manager): can manage
      expect(secondaryPerms).toContain("view_users");
      expect(secondaryPerms).toContain("manage_users");
    });

    it("should maintain separation between organization permissions", async () => {
      // Use a different test user to avoid interference from previous tests
      // Create a fresh test user for this specific test using the API
      const api = (await import("../../convex/_generated/api.js")).api;
      const isolatedUserId = await t.mutation(api.rbac.createTestUser, {
        email: "isolated-test@example.com",
        firstName: "Isolated",
        lastName: "TestUser",
      });

      // Assign role only in primary org (not in secondary)
      await assignRoleToUser(
        t,
        isolatedUserId,
        testData.roles.businessManager,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      // Can manage in primary
      const canManagePrimary = await checkUserPermission(
        t,
        isolatedUserId,
        "manage_users",
        testData.organizations.primary
      );

      // Cannot manage in secondary (not a member)
      const canManageSecondary = await checkUserPermission(
        t,
        isolatedUserId,
        "manage_users",
        testData.organizations.secondary
      );

      expect(canManagePrimary).toBe(true);
      expect(canManageSecondary).toBe(false);
    });
  });

  describe("Role Upgrade/Downgrade Workflow", () => {
    it("should handle employee → manager → employee transitions", async () => {
      // Start as employee
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      const employeePerms1 = await getUserPermissions(
        t,
        testData.users.guestUser,
        testData.organizations.primary
      );
      expect(employeePerms1).not.toContain("manage_users");

      // Upgrade to manager
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.businessManager,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      const managerPerms = await getUserPermissions(
        t,
        testData.users.guestUser,
        testData.organizations.primary
      );
      expect(managerPerms).toContain("manage_users");

      // Downgrade back to employee
      await assignRoleToUser(
        t,
        testData.users.guestUser,
        testData.roles.employee,
        testData.organizations.primary,
        testData.users.orgOwner
      );

      const employeePerms2 = await getUserPermissions(
        t,
        testData.users.guestUser,
        testData.organizations.primary
      );
      expect(employeePerms2).not.toContain("manage_users");
    });
  });

  describe("Super Admin Workflow", () => {
    it("should verify super admin has access across all organizations", async () => {
      const orgs = [
        testData.organizations.primary,
        testData.organizations.secondary,
        testData.organizations.empty
      ];

      for (const org of orgs) {
        const canManage = await checkUserPermission(
          t,
          testData.users.systemAdmin,
          "manage_organization",
          org
        );

        const canManageUsers = await checkUserPermission(
          t,
          testData.users.systemAdmin,
          "manage_users",
          org
        );

        expect(canManage).toBe(true);
        expect(canManageUsers).toBe(true);
      }
    });

    it("should allow super admin to work without organization context", async () => {
      const canManage = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "manage_organization"
      );

      const canManageUsers = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "manage_users"
      );

      expect(canManage).toBe(true);
      expect(canManageUsers).toBe(true);
    });
  });

  describe("Financial Permissions Workflow", () => {
    it("should verify invoice workflow permissions", async () => {
      // Business manager can create but not approve
      const managerCanCreate = await checkUserPermission(
        t,
        testData.users.orgManager,
        "create_invoice",
        testData.organizations.primary
      );

      const managerCanApprove = await checkUserPermission(
        t,
        testData.users.orgManager,
        "approve_invoice",
        testData.organizations.primary
      );

      expect(managerCanCreate).toBe(true);
      expect(managerCanApprove).toBe(false);

      // Org owner can both create and approve
      const ownerCanCreate = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "create_invoice",
        testData.organizations.primary
      );

      const ownerCanApprove = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "approve_invoice",
        testData.organizations.primary
      );

      expect(ownerCanCreate).toBe(true);
      expect(ownerCanApprove).toBe(true);
    });

    it("should restrict financial access for employees", async () => {
      const canCreate = await checkUserPermission(
        t,
        testData.users.orgMember,
        "create_invoice",
        testData.organizations.primary
      );

      const canApprove = await checkUserPermission(
        t,
        testData.users.orgMember,
        "approve_invoice",
        testData.organizations.primary
      );

      const canManageFinancials = await checkUserPermission(
        t,
        testData.users.orgMember,
        "manage_financials",
        testData.organizations.primary
      );

      expect(canCreate).toBe(false);
      expect(canApprove).toBe(false);
      expect(canManageFinancials).toBe(false);
    });
  });

  describe("Complete Permission Verification Workflow", () => {
    it("should verify all permission categories for each role", async () => {
      // Create fresh test users for this test to avoid interference from previous tests
      const api = (await import("../../convex/_generated/api.js")).api;

      const testOwner = await t.mutation(api.rbac.createTestUser, {
        email: "perm-owner@example.com",
        firstName: "Permission",
        lastName: "TestOwner",
      });

      const testManager = await t.mutation(api.rbac.createTestUser, {
        email: "perm-manager@example.com",
        firstName: "Permission",
        lastName: "TestManager",
      });

      const testEmployee = await t.mutation(api.rbac.createTestUser, {
        email: "perm-employee@example.com",
        firstName: "Permission",
        lastName: "TestEmployee",
      });

      // Assign roles to fresh users
      await assignRoleToUser(t, testOwner, testData.roles.orgOwner, testData.organizations.primary, testData.users.orgOwner);
      await assignRoleToUser(t, testManager, testData.roles.businessManager, testData.organizations.primary, testData.users.orgOwner);
      await assignRoleToUser(t, testEmployee, testData.roles.employee, testData.organizations.primary, testData.users.orgOwner);

      const roles = [
        { user: testOwner, name: "org_owner", canManage: true },
        { user: testManager, name: "business_manager", canManage: true },
        { user: testEmployee, name: "employee", canManage: false },
      ];

      for (const role of roles) {
        const permissions = await getUserPermissions(
          t,
          role.user,
          testData.organizations.primary
        );

        // All should have view permissions
        expect(permissions).toContain("view_users");
        expect(permissions).toContain("view_organization");

        // Check manage permissions
        if (role.canManage) {
          expect(permissions.some((p: string) => p.startsWith("manage_"))).toBe(true);
        }
      }
    });
  });
});
