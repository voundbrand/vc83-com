/**
 * Test Setup Helper for RBAC Testing
 *
 * Provides functions to setup and teardown test data in Convex
 */

import { ConvexTestingHelper } from "convex-helpers/testing";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Create a ConvexTestingHelper configured for this project
 * Uses environment variables for deployment URL and admin key
 */
export function createTestHelper() {
  const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
  const adminKey = process.env.CONVEX_DEPLOY_KEY;

  if (!deploymentUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL or CONVEX_URL environment variable not set");
  }

  return new ConvexTestingHelper({
    backendUrl: deploymentUrl,
    adminKey: adminKey,
  });
}

/**
 * Setup complete RBAC test environment
 * Creates users, organizations, roles, permissions, and memberships
 */
export async function setupRBACTestEnvironment(t: ConvexTestingHelper) {
  // First, seed the base RBAC system (roles and permissions)
  await t.mutation(api.rbac.seedRBAC, {});

  // Get seeded roles
  const roles = await t.query(api.rbac.getRoles, {});
  const superAdminRole = roles.find(r => r.name === 'super_admin');
  const orgOwnerRole = roles.find(r => r.name === 'org_owner');
  const businessManagerRole = roles.find(r => r.name === 'business_manager');
  const employeeRole = roles.find(r => r.name === 'employee');
  const viewerRole = roles.find(r => r.name === 'viewer');

  if (!superAdminRole || !orgOwnerRole || !businessManagerRole || !employeeRole || !viewerRole) {
    throw new Error("Failed to seed base roles");
  }

  const now = Date.now();

  // Create test users using the test helper mutation
  const systemAdmin = await t.mutation(api.rbac.createTestUser, {
    email: "admin@system.test",
    firstName: "System",
    lastName: "Admin",
    global_role_id: superAdminRole._id,
  });

  const orgOwner = await t.mutation(api.rbac.createTestUser, {
    email: "owner@org.test",
    firstName: "Organization",
    lastName: "Owner",
  });

  const orgManager = await t.mutation(api.rbac.createTestUser, {
    email: "manager@org.test",
    firstName: "Organization",
    lastName: "Manager",
  });

  const orgMember = await t.mutation(api.rbac.createTestUser, {
    email: "member@org.test",
    firstName: "Organization",
    lastName: "Member",
  });

  const guestUser = await t.mutation(api.rbac.createTestUser, {
    email: "guest@test.test",
    firstName: "Guest",
    lastName: "User",
  });

  // Create test organizations
  const primaryOrg = await t.mutation(api.rbac.createTestOrganization, {
    name: "Primary Test Organization",
    slug: "primary-test-org",
    creatorUserId: orgOwner,
  });

  const secondaryOrg = await t.mutation(api.rbac.createTestOrganization, {
    name: "Secondary Test Organization",
    slug: "secondary-test-org",
    creatorUserId: orgOwner,
  });

  const emptyOrg = await t.mutation(api.rbac.createTestOrganization, {
    name: "Empty Test Organization",
    slug: "empty-test-org",
    creatorUserId: systemAdmin,
  });

  // Assign roles to users in organizations
  await t.mutation(api.rbacQueries.assignRole, {
    userId: orgOwner,
    roleId: orgOwnerRole._id,
    organizationId: primaryOrg,
    assignedBy: systemAdmin,
  });

  await t.mutation(api.rbacQueries.assignRole, {
    userId: orgManager,
    roleId: businessManagerRole._id,
    organizationId: primaryOrg,
    assignedBy: orgOwner,
  });

  await t.mutation(api.rbacQueries.assignRole, {
    userId: orgMember,
    roleId: employeeRole._id,
    organizationId: primaryOrg,
    assignedBy: orgOwner,
  });

  await t.mutation(api.rbacQueries.assignRole, {
    userId: orgOwner,
    roleId: orgOwnerRole._id,
    organizationId: secondaryOrg,
    assignedBy: systemAdmin,
  });

  // Return all IDs for use in tests
  return {
    users: {
      systemAdmin,
      orgOwner,
      orgManager,
      orgMember,
      guestUser,
    },
    organizations: {
      primary: primaryOrg,
      secondary: secondaryOrg,
      empty: emptyOrg,
    },
    roles: {
      superAdmin: superAdminRole._id,
      orgOwner: orgOwnerRole._id,
      businessManager: businessManagerRole._id,
      employee: employeeRole._id,
      viewer: viewerRole._id,
    },
  };
}

/**
 * Get all permissions from the system (after seeding)
 */
export async function getTestPermissions(t: ConvexTestingHelper) {
  const permissions = await t.query(api.rbac.getPermissions, {});

  // Create a map of permission names to IDs
  const permMap: Record<string, { name: string; resource: string; action: string }> = {};
  for (const perm of permissions) {
    permMap[perm.name] = {
      name: perm.name,
      resource: perm.resource,
      action: perm.action,
    };
  }

  return permMap;
}

/**
 * Helper to check if a user has a permission
 */
export async function checkUserPermission(
  t: ConvexTestingHelper,
  userId: Id<"users">,
  permission: string,
  organizationId?: Id<"organizations">
) {
  return await t.query(api.rbacQueries.hasPermission, {
    userId,
    permission,
    organizationId,
  });
}

/**
 * Helper to get user permissions
 */
export async function getUserPermissions(
  t: ConvexTestingHelper,
  userId: Id<"users">,
  organizationId?: Id<"organizations">
) {
  return await t.query(api.rbacQueries.getUserPermissions, {
    userId,
    organizationId,
  });
}

/**
 * Helper to assign a role to a user
 */
export async function assignRoleToUser(
  t: ConvexTestingHelper,
  userId: Id<"users">,
  roleId: Id<"roles">,
  organizationId: Id<"organizations">,
  assignedBy: Id<"users">
) {
  return await t.mutation(api.rbacQueries.assignRole, {
    userId,
    roleId,
    organizationId,
    assignedBy,
  });
}

/**
 * Helper to remove a role from a user
 */
export async function removeRoleFromUser(
  t: ConvexTestingHelper,
  userId: Id<"users">,
  roleId: Id<"roles">,
  organizationId: Id<"organizations">,
  removedBy: Id<"users">
) {
  return await t.mutation(api.rbacQueries.removeRole, {
    userId,
    roleId,
    organizationId,
    removedBy,
  });
}

/**
 * Cleanup test environment
 */
export async function cleanupRBACTestEnvironment(t: ConvexTestingHelper) {
  // Note: ConvexTestingHelper automatically cleans up after each test
  // This function is here for explicit cleanup if needed
  return true;
}
