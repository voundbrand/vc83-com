/**
 * Basic Permission Checks Tests
 *
 * Tests fundamental permission checking functionality including:
 * - Basic CRUD operation checks
 * - Permission granting and denial
 * - User permission retrieval
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ConvexTestingHelper } from "convex-helpers/testing";
import { createTestHelper } from "../../setup";
import {
  setupRBACTestEnvironment,
  checkUserPermission,
  getUserPermissions
} from "../../helpers/test-setup";

describe("Basic Permission Checks", () => {
  let t: ConvexTestingHelper;
  let testData: Awaited<ReturnType<typeof setupRBACTestEnvironment>>;

  beforeAll(async () => {
    t = createTestHelper();
    testData = await setupRBACTestEnvironment(t);
  }, 120000);

  afterAll(async () => {
    await t.close();
  });

  describe("CRUD Operation Checks", () => {
    it("should allow business manager to create/manage users", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgManager,
        "manage_users",
        testData.organizations.primary
      );

      expect(result).toBe(true);
    });

    it("should allow employee to view users", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_users",
        testData.organizations.primary
      );

      expect(result).toBe(true);
    });

    it("should allow business manager to create tasks", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgManager,
        "create_task",
        testData.organizations.primary
      );

      expect(result).toBe(true);
    });

    it("should allow org owner to manage organization", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgOwner,
        "manage_organization",
        testData.organizations.primary
      );

      expect(result).toBe(true);
    });
  });

  describe("Permission Denial", () => {
    it("should deny employee from creating invoices", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "create_invoice",
        testData.organizations.primary
      );

      expect(result).toBe(false);
    });

    it("should deny employee from managing users", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "manage_users",
        testData.organizations.primary
      );

      expect(result).toBe(false);
    });

    it("should deny employee from approving invoices", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "approve_invoice",
        testData.organizations.primary
      );

      expect(result).toBe(false);
    });

    it("should deny guest user from any protected operations", async () => {
      const createResult = await checkUserPermission(
        t,
        testData.users.guestUser,
        "create_invoice",
      );

      const updateResult = await checkUserPermission(
        t,
        testData.users.guestUser,
        "manage_users",
      );

      expect(createResult).toBe(false);
      expect(updateResult).toBe(false);
    });
  });

  describe("User Permission Retrieval", () => {
    it("should retrieve all permissions for org owner", async () => {
      const permissions = await getUserPermissions(
        t,
        testData.users.orgOwner,
        testData.organizations.primary
      );

      expect(permissions).toBeInstanceOf(Array);
      expect(permissions.length).toBeGreaterThan(0);

      // Org owner should have manage_organization permission
      expect(permissions).toContain("manage_organization");
    });

    it("should return empty array for user with no roles", async () => {
      const permissions = await getUserPermissions(
        t,
        testData.users.guestUser
      );

      expect(permissions).toEqual([]);
    });

    it("should return appropriate permissions for business manager", async () => {
      const permissions = await getUserPermissions(
        t,
        testData.users.orgManager,
        testData.organizations.primary
      );

      // Business manager should have these permissions
      expect(permissions).toContain("manage_users");
      expect(permissions).toContain("create_task");
      expect(permissions).toContain("view_users");

      // But NOT these
      expect(permissions).not.toContain("manage_organization");
    });
  });

  describe("Super Admin Access", () => {
    it("should allow super admin to access any permission", async () => {
      const result1 = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "manage_organization",
        testData.organizations.primary
      );

      const result2 = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "manage_users",
        testData.organizations.primary
      );

      const result3 = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "approve_invoice",
        testData.organizations.primary
      );

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it("should allow super admin across all organizations", async () => {
      const result1 = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "manage_organization",
        testData.organizations.primary
      );

      const result2 = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "manage_organization",
        testData.organizations.secondary
      );

      const result3 = await checkUserPermission(
        t,
        testData.users.systemAdmin,
        "manage_organization",
        testData.organizations.empty
      );

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle non-existent user gracefully", async () => {
      const result = await checkUserPermission(
        t,
        "non_existent_user" as any,
        "view_users",
        testData.organizations.primary
      );

      expect(result).toBe(false);
    });

    it("should handle non-existent permission gracefully", async () => {
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "nonexistent_permission",
        testData.organizations.primary
      );

      expect(result).toBe(false);
    });

    it("should require organization for non-global users", async () => {
      // Employee without org context should not have permissions
      const result = await checkUserPermission(
        t,
        testData.users.orgMember,
        "view_users"
      );

      expect(result).toBe(false);
    });
  });
});
