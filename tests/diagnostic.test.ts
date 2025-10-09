/**
 * Diagnostic Test - Check if Convex connection and basic operations work
 */

import { describe, it, expect } from "vitest";
import { createTestHelper } from "./setup";
import { api } from "../convex/_generated/api";

describe("Diagnostic Tests", () => {
  it("should connect to Convex", async () => {
    const t = createTestHelper();

    // This should work if Convex is running
    expect(t).toBeDefined();
    expect(t.query).toBeDefined();
    expect(t.mutation).toBeDefined();

    await t.close();
  }, 5000);

  it("should seed RBAC system", async () => {
    const t = createTestHelper();

    try {
      // Seed the RBAC system
      await t.mutation(api.rbac.seedRBAC, {});

      // Check that roles were created
      const roles = await t.query(api.rbac.getRoles, {});

      console.log("Roles created:", roles.length);
      expect(roles.length).toBeGreaterThan(0);

      // Check for specific roles
      const superAdminRole = roles.find(r => r.name === 'super_admin');
      expect(superAdminRole).toBeDefined();

    } finally {
      await t.close();
    }
  }, 30000);

  it("should create a test user", async () => {
    const t = createTestHelper();

    try {
      // First seed RBAC
      await t.mutation(api.rbac.seedRBAC, {});

      // Create a test user
      const userId = await t.mutation(api.rbac.createTestUser, {
        email: "diagnostic@test.com",
        firstName: "Diagnostic",
        lastName: "User",
      });

      console.log("Created user:", userId);
      expect(userId).toBeDefined();

    } finally {
      await t.close();
    }
  }, 30000);

  it("should create test organization", async () => {
    const t = createTestHelper();

    try {
      // Seed RBAC
      await t.mutation(api.rbac.seedRBAC, {});

      // Create user first
      const userId = await t.mutation(api.rbac.createTestUser, {
        email: "owner@test.com",
        firstName: "Owner",
        lastName: "Test",
      });

      // Create organization
      const orgId = await t.mutation(api.rbac.createTestOrganization, {
        name: "Diagnostic Org",
        slug: "diagnostic-org",
        creatorUserId: userId,
      });

      console.log("Created organization:", orgId);
      expect(orgId).toBeDefined();

    } finally {
      await t.close();
    }
  }, 30000);
});
